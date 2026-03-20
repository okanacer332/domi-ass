import fs from "node:fs";
import path from "node:path";
import { dialog } from "electron";
import ExcelJS from "exceljs";
import iconv from "iconv-lite";
import Papa from "papaparse";

import { inferIdentityFromValue } from "../../../shared/client-identity";
import type {
  ClientFormInput,
  ClientImportColumn,
  ClientImportCommitInput,
  ClientImportCommitResult,
  ClientImportField,
  ClientImportFile,
  ClientImportPreview,
  ClientImportPreviewRow,
  ClientRecord
} from "../../../shared/contracts";
import { requireOperationalAccess } from "../licensing/access-service";
import { listClients, upsertImportedClient } from "./client-service";

const FIELD_SYNONYMS: Record<ClientImportField, string[]> = {
  name: [
    "mukellef",
    "mukellefadi",
    "mukellefunvani",
    "unvan",
    "firma",
    "sirket",
    "isyeri",
    "adsoyad",
    "isim"
  ],
  identityNumber: [
    "vkn",
    "vergino",
    "vergikimlik",
    "vergikimlikno",
    "vergitckimlik",
    "vergitckimlikno",
    "tckn",
    "tc",
    "tcno",
    "kimlikno",
    "kimliknumarasi"
  ],
  taxOffice: ["vergidairesi", "vd", "vergi"],
  authorizedPerson: ["yetkili", "yetkilikisi", "ilgili", "muhatap", "sorumlu", "temsilci"],
  phone: ["telefon", "telefonno", "telefonnumarasi", "gsm", "cep"],
  email: ["eposta", "email", "mail"],
  city: ["il", "sehir", "ilce", "lokasyon", "bolge"],
  address: ["adres", "acikadres", "ikametgah", "ikamet", "evadresi", "isadresi"],
  notes: ["not", "aciklama", "notlar", "aciklamalar"]
};

const CSV_ENCODINGS = ["utf8", "windows-1254", "iso-8859-9"] as const;
const WORKBOOK_EXTENSIONS = new Set([".xlsx", ".xlsm", ".xltx", ".xltm"]);
const PREFERRED_SHEET_KEYWORDS = [
  "mukellef",
  "musteri",
  "firma",
  "cari",
  "liste",
  "listesi",
  "clients",
  "client"
];
const DISCOURAGED_SHEET_KEYWORDS = [
  "ozet",
  "dashboard",
  "pivot",
  "grafik",
  "chart",
  "rapor",
  "raporu",
  "ayar",
  "settings",
  "talimat",
  "yardim",
  "help"
];

type ParsedWorkbookSheet = {
  sheetName: string;
  rows: string[][];
};

type ParsedWorkbookFile = {
  fileName: string;
  filePath: string;
  sheets: ParsedWorkbookSheet[];
};

const normalizeCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).replace(/\s+/g, " ").trim();
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "object") {
    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return normalizeCell(value.text ?? value.hyperlink);
    }

    if ("formula" in value && "result" in value) {
      return normalizeCell(value.result);
    }

    if ("text" in value && typeof value.text === "string") {
      return value.text.replace(/\s+/g, " ").trim();
    }

    if ("result" in value) {
      return normalizeCell(value.result);
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((item: { text?: string }) => item.text ?? "")
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return String(value).replace(/\s+/g, " ").trim();
};

const normalizeLookup = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLocaleLowerCase("tr-TR");

const isEmailLike = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isPhoneLike = (value: string) => value.replace(/\D/g, "").length >= 10;
const isIdentityLike = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
};

const parseCsvCandidate = (text: string) => {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    delimiter: "",
    skipEmptyLines: false
  });

  const rows = parsed.data.map((row) => row.map((cell) => normalizeCell(cell)));
  const nonEmptyRows = rows.filter((row) => row.some(Boolean));
  const maxWidth = Math.max(1, ...nonEmptyRows.map((row) => row.length));
  const consistentRows = nonEmptyRows.filter((row) => row.length >= Math.max(1, maxWidth - 1)).length;
  const replacementPenalty = (text.match(/�/g) ?? []).length * 20;
  const turkishSignal = (text.match(/[çğıöşüÇĞİÖŞÜ]/g) ?? []).length;
  const parsePenalty = parsed.errors.length * 15;

  return {
    rows,
    score: nonEmptyRows.length * 5 + consistentRows * 3 + turkishSignal - replacementPenalty - parsePenalty
  };
};

const readCsvRows = (filePath: string) => {
  const buffer = fs.readFileSync(filePath);
  const candidates = CSV_ENCODINGS.map((encoding) => {
    const decoded = iconv.decode(buffer, encoding);
    return parseCsvCandidate(decoded);
  });

  const bestCandidate = candidates.sort((left, right) => right.score - left.score)[0];
  return bestCandidate.rows;
};

const getWorksheetRows = (worksheet: ExcelJS.Worksheet) => {
  const rows: string[][] = [];

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const cellsByIndex = new Map<number, string>();
    let maxColumn = 0;

    row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      const rawValue = cell.text?.trim()
        ? cell.text
        : cell.isMerged && cell.master
          ? cell.master.text || cell.master.value
          : cell.value;
      const normalizedValue = normalizeCell(rawValue);

      if (!normalizedValue) {
        return;
      }

      cellsByIndex.set(columnNumber - 1, normalizedValue);
      maxColumn = Math.max(maxColumn, columnNumber);
    });

    if (maxColumn === 0) {
      return;
    }

    rows.push(
      Array.from({ length: maxColumn }, (_, index) => cellsByIndex.get(index) ?? "")
    );
  });

  return rows;
};

const readWorksheetRows = async (filePath: string): Promise<ParsedWorkbookFile> => {
  const extension = path.extname(filePath).toLocaleLowerCase("tr-TR");
  if (extension === ".xls") {
    throw new Error("Eski .xls dosyaları için lütfen dosyayı .xlsx veya .csv olarak kaydedip tekrar deneyin.");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error("İçe aktarılacak dosya bulunamadı.");
  }

  if (extension === ".csv") {
    return {
      fileName: path.basename(filePath),
      filePath,
      sheets: [
        {
          sheetName: "CSV",
          rows: readCsvRows(filePath)
        }
      ]
    };
  }

  if (!WORKBOOK_EXTENSIONS.has(extension)) {
    throw new Error(
      "Bu Excel uzantisi su anda desteklenmiyor. Lutfen .xlsx, .xlsm, .xltx, .xltm veya .csv kullanin."
    );
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(fs.readFileSync(filePath));
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Excel dosyasi okunamadi: ${error.message}`
        : "Excel dosyasi okunamadi."
    );
  }

  const worksheetCandidates = workbook.worksheets
    .map((worksheet) => ({
      sheetName: worksheet.name,
      rows: getWorksheetRows(worksheet)
    }))
    .filter((candidate) => candidate.rows.some((row) => row.some(Boolean)));

  if (worksheetCandidates.length === 0) {
    throw new Error("İçe aktarılacak sayfa bulunamadı.");
  }

  return {
    fileName: path.basename(filePath),
    filePath,
    sheets: worksheetCandidates
  };
};

const scoreHeaderRow = (cells: string[]) => {
  const nonEmpty = cells.filter(Boolean);
  if (nonEmpty.length < 2) {
    return -1;
  }

  const uniqueCount = new Set(nonEmpty.map((cell) => normalizeLookup(cell))).size;
  const synonymMatches = nonEmpty.reduce((score, cell) => {
    const normalized = normalizeLookup(cell);
    const hit = Object.values(FIELD_SYNONYMS).some((values) =>
      values.some((value) => normalized.includes(value))
    );
    return score + (hit ? 6 : 0);
  }, 0);

  return synonymMatches + uniqueCount + nonEmpty.length;
};

const detectHeaderRowIndex = (rows: string[][]) => {
  let bestIndex = 0;
  let bestScore = -1;

  rows.slice(0, 8).forEach((row, index) => {
    const score = scoreHeaderRow(row);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
};

const guessFieldByHeader = (
  header: string
): { field: ClientImportField | null; confidence: number } => {
  const normalized = normalizeLookup(header);
  let bestField: ClientImportField | null = null;
  let bestConfidence = 0;

  (Object.keys(FIELD_SYNONYMS) as ClientImportField[]).forEach((field) => {
    const exact = FIELD_SYNONYMS[field].find((synonym) => normalized === synonym);
    if (exact) {
      bestField = field;
      bestConfidence = 0.98;
      return;
    }

    const partial = FIELD_SYNONYMS[field].find(
      (synonym) => normalized.includes(synonym) || synonym.includes(normalized)
    );
    if (partial && bestConfidence < 0.8) {
      bestField = field;
      bestConfidence = 0.8;
    }
  });

  return { field: bestField, confidence: bestConfidence };
};

const guessFieldBySamples = (
  samples: string[]
): { field: ClientImportField | null; confidence: number } => {
  const meaningful = samples.filter(Boolean);
  if (meaningful.length === 0) {
    return { field: null, confidence: 0 };
  }

  if (meaningful.every(isEmailLike)) {
    return { field: "email", confidence: 0.74 };
  }

  if (meaningful.every(isIdentityLike)) {
    return { field: "identityNumber", confidence: 0.76 };
  }

  if (meaningful.every(isPhoneLike)) {
    return { field: "phone", confidence: 0.66 };
  }

  const mostlyText = meaningful.filter((value) => value.replace(/\d/g, "").length >= 4).length;
  if (mostlyText === meaningful.length) {
    return { field: "name", confidence: 0.42 };
  }

  return { field: null, confidence: 0 };
};

const buildColumns = (rows: string[][], headerRowIndex: number): ClientImportColumn[] => {
  const headerRow = rows[headerRowIndex] ?? [];
  const width = Math.max(1, ...rows.map((row) => row.length), headerRow.length);

  return Array.from({ length: width }, (_, index) => {
    const header = headerRow[index] || `Kolon ${index + 1}`;
    const sampleValues = rows
      .slice(headerRowIndex + 1)
      .map((row) => row[index] || "")
      .filter(Boolean)
      .slice(0, 5);

    const byHeader = guessFieldByHeader(header);
    const bySample = guessFieldBySamples(sampleValues);
    const field = byHeader.confidence >= bySample.confidence ? byHeader.field : bySample.field;
    const confidence = Math.max(byHeader.confidence, bySample.confidence);

    return {
      key: `column_${index}`,
      index,
      header,
      sampleValues,
      guessedField: field,
      confidence
    };
  });
};

const buildSuggestedMapping = (columns: ClientImportColumn[]) => {
  const mapping: Partial<Record<ClientImportField, string>> = {};

  [...columns]
    .filter((column) => column.guessedField)
    .sort((left, right) => right.confidence - left.confidence)
    .forEach((column) => {
      if (!column.guessedField || mapping[column.guessedField]) {
        return;
      }

      mapping[column.guessedField] = column.key;
    });

  if (!mapping.name) {
    const fallback = columns.find(
      (column) =>
        column.sampleValues.some((value) => value.length > 3) &&
        !column.sampleValues.every((value) => isIdentityLike(value))
    );

    if (fallback) {
      mapping.name = fallback.key;
    }
  }

  return mapping;
};

const analyzeSheetCandidate = (sheet: ParsedWorkbookSheet) => {
  const headerRowIndex = detectHeaderRowIndex(sheet.rows);
  const columns = buildColumns(sheet.rows, headerRowIndex);
  const suggestedMapping = buildSuggestedMapping(columns);
  const dataRows = sheet.rows.slice(headerRowIndex + 1).filter((row) => row.some(Boolean));
  const totalConfidence = columns.reduce((sum, column) => sum + column.confidence, 0);
  const mappedFieldCount = Object.keys(suggestedMapping).length;
  const headerScore = scoreHeaderRow(sheet.rows[headerRowIndex] ?? []);
  const normalizedSheetName = normalizeLookup(sheet.sheetName);
  const sheetNameBonus = PREFERRED_SHEET_KEYWORDS.reduce(
    (score, keyword) => score + (normalizedSheetName.includes(keyword) ? 18 : 0),
    0
  );
  const sheetNamePenalty = DISCOURAGED_SHEET_KEYWORDS.reduce(
    (score, keyword) => score + (normalizedSheetName.includes(keyword) ? 14 : 0),
    0
  );
  const previewPenalty = dataRows.length === 0 ? 60 : 0;
  const sparsePenalty = columns.length <= 1 ? 35 : 0;
  const selectionScore =
    mappedFieldCount * 35 +
    totalConfidence * 20 +
    Math.min(dataRows.length, 80) +
    Math.max(headerScore, 0) * 4 +
    sheetNameBonus -
    sheetNamePenalty -
    previewPenalty -
    sparsePenalty;

  return {
    sheetName: sheet.sheetName,
    rows: sheet.rows,
    headerRowIndex,
    columns,
    suggestedMapping,
    dataRows,
    selectionScore
  };
};

const buildRawRowObject = (columns: ClientImportColumn[], row: string[]) =>
  columns.reduce<Record<string, string>>((record, column) => {
    record[column.key] = row[column.index] || "";
    return record;
  }, {});

const mapImportRow = (
  row: string[],
  columns: ClientImportColumn[],
  mapping: Partial<Record<ClientImportField, string>>,
  rowNumber: number
): ClientImportPreviewRow => {
  const raw = buildRawRowObject(columns, row);
  const mapped = Object.entries(mapping).reduce<Partial<Record<ClientImportField, string>>>(
    (record, [field, columnKey]) => {
      if (!columnKey) {
        return record;
      }

      record[field as ClientImportField] = raw[columnKey] || "";
      return record;
    },
    {}
  );

  const warnings: string[] = [];

  if (!mapped.name?.trim()) {
    warnings.push("Mükellef adı eksik.");
  }

  if (mapped.identityNumber) {
    const identity = inferIdentityFromValue(mapped.identityNumber);
    if (!identity.isValid) {
      warnings.push(identity.error ?? "Kimlik numarası doğrulanamadı.");
    }
  }

  if (mapped.email && !isEmailLike(mapped.email)) {
    warnings.push("E-posta alanı geçerli görünmüyor.");
  }

  return {
    rowNumber,
    raw,
    mapped,
    warnings,
    canImport: warnings.length === 0 || warnings.every((warning) => warning !== "Mükellef adı eksik.")
  };
};

const buildFormInput = (
  row: string[],
  columns: ClientImportColumn[],
  mapping: Partial<Record<ClientImportField, string>>
): ClientFormInput => {
  const raw = buildRawRowObject(columns, row);

  const get = (field: ClientImportField) => {
    const columnKey = mapping[field];
    return columnKey ? raw[columnKey]?.trim() || null : null;
  };

  const identity = inferIdentityFromValue(get("identityNumber"));

  return {
    name: get("name") || "",
    identityType: identity.identityType,
    identityNumber: identity.normalizedValue,
    taxOffice: get("taxOffice"),
    authorizedPerson: get("authorizedPerson"),
    phone: get("phone"),
    email: get("email"),
    city: get("city"),
    address: get("address"),
    notes: get("notes")
  };
};

const parseImportFile = async (filePath: string) => {
  const workbook = await readWorksheetRows(filePath);
  const analyzedSheets = workbook.sheets
    .map((sheet) => analyzeSheetCandidate(sheet))
    .sort((left, right) => right.selectionScore - left.selectionScore);

  const selectedSheet = analyzedSheets[0];

  if (!selectedSheet) {
    throw new Error("Ice aktarim icin uygun veri sayfasi bulunamadi.");
  }

  const { headerRowIndex, columns, suggestedMapping, dataRows } = selectedSheet;

  const previewRows = dataRows
    .slice(0, 18)
    .map((row, index) => mapImportRow(row, columns, suggestedMapping, headerRowIndex + index + 2));

  const globalWarnings: string[] = [];
  if (!suggestedMapping.name) {
    globalWarnings.push(
      "Mükellef adı alanı otomatik bulunamadı. İçe almadan önce eşlemeyi kontrol et."
    );
  }

  if (workbook.sheets.length > 1) {
    globalWarnings.push(
      `"${selectedSheet.sheetName}" sayfasi en uygun veri alani olarak secildi. Farkli bir liste varsa once bu sayfayi kontrol edin.`
    );
  }

  return {
    filePath: workbook.filePath,
    fileName: workbook.fileName,
    sheetName: selectedSheet.sheetName,
    headerRowIndex,
    totalRows: dataRows.length,
    columns,
    suggestedMapping,
    previewRows,
    globalWarnings,
    dataRows
  };
};

export const pickClientImportFile = async (): Promise<ClientImportFile | null> => {
  await requireOperationalAccess();
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      {
        name: "Excel ve CSV",
        extensions: ["xlsx", "xlsm", "xltx", "xltm", "csv"]
      }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  return {
    filePath,
    fileName: path.basename(filePath)
  };
};

export const previewClientImport = async (filePath: string): Promise<ClientImportPreview> => {
  await requireOperationalAccess();
  const preview = await parseImportFile(filePath);

  return {
    filePath: preview.filePath,
    fileName: preview.fileName,
    sheetName: preview.sheetName,
    headerRowIndex: preview.headerRowIndex,
    totalRows: preview.totalRows,
    columns: preview.columns,
    suggestedMapping: preview.suggestedMapping,
    previewRows: preview.previewRows,
    globalWarnings: preview.globalWarnings
  };
};

export const commitClientImport = async (
  input: ClientImportCommitInput
): Promise<ClientImportCommitResult> => {
  await requireOperationalAccess();
  const preview = await parseImportFile(input.filePath);

  if (!input.mapping.name) {
    throw new Error("İçe aktarma için Mükellef adı alanı eşlenmelidir.");
  }

  const existingClients: ClientRecord[] = await listClients();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const warnings: string[] = [];

  for (const [index, row] of preview.dataRows.entries()) {
    const rowNumber = preview.headerRowIndex + index + 2;
    const formInput = buildFormInput(row, preview.columns, input.mapping);

    if (!formInput.name.trim()) {
      skipped += 1;
      warnings.push(`Satır ${rowNumber}: mükellef adı olmadığı için atlandı.`);
      continue;
    }

    if (formInput.identityNumber) {
      const identity = inferIdentityFromValue(formInput.identityNumber);

      if (!identity.isValid || !identity.identityType) {
        skipped += 1;
        warnings.push(`Satır ${rowNumber}: ${identity.error ?? "kimlik numarası doğrulanamadı."}`);
        continue;
      }
    }

    const result = await upsertImportedClient(formInput, existingClients);

    if (result === "created") {
      created += 1;
    } else if (result === "updated") {
      updated += 1;
    } else {
      skipped += 1;
      warnings.push(`Satır ${rowNumber}: kayıt atlandı.`);
    }
  }

  return {
    created,
    updated,
    skipped,
    warnings
  };
};
