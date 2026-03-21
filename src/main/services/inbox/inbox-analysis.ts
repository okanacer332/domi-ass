import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import ExcelJS from "exceljs";
import iconv from "iconv-lite";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  DOMIZAN_CLIENT_SUBFOLDERS,
  type InboxAnalysisStatus
} from "../../../shared/contracts";
import { env } from "../../config/env";
import { getDatabase } from "../../database/connection";
import { clientsTable, documentsTable } from "../../database/schema";
import {
  findLearnedClientCandidates,
  findLearnedFolderSuggestion,
  serializeInboxAnalysisContext
} from "./inbox-learning";

const TEXT_PREVIEW_LIMIT = 6000;
const INLINE_FILE_SIZE_LIMIT = 12 * 1024 * 1024;
const GEMINI_MODEL = "gemini-2.5-flash";
const TEXT_ENCODINGS = ["utf8", "utf16le", "windows-1254", "iso-8859-9"] as const;
const AI_SUGGESTED_FOLDERS = DOMIZAN_CLIENT_SUBFOLDERS;

const coerceOptionalNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}, z.number().min(0).max(1).nullable().optional());

const coerceOptionalBoolean = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLocaleLowerCase("tr-TR") === "true") {
      return true;
    }

    if (value.toLocaleLowerCase("tr-TR") === "false") {
      return false;
    }
  }

  return null;
}, z.boolean().nullable().optional());

const aiResultSchema = z.object({
  documentType: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(2).max(400),
  details: z.string().trim().max(1200).optional().nullable(),
  suggestedFolder: z.enum(AI_SUGGESTED_FOLDERS),
  matchedClientName: z.string().trim().max(180).optional().nullable(),
  matchedBy: z.string().trim().max(120).optional().nullable(),
  confidence: coerceOptionalNumber,
  needsReview: coerceOptionalBoolean
});

type DocumentRow = typeof documentsTable.$inferSelect;

type ClientCandidate = {
  clientId: number;
  name: string;
  identityNumber: string | null;
  score: number;
  reason: string;
};

export type DocumentSignals = {
  fileFingerprint: string | null;
  documentSignature: string | null;
  receiverName: string | null;
  receiverIdentity: string | null;
  issuerName: string | null;
  issuerIdentity: string | null;
  invoiceScenario: string | null;
  invoiceType: string | null;
  documentNumber: string | null;
  documentDate: string | null;
  totalAmount: string | null;
  taxOffice: string | null;
  identities: string[];
  ibanList: string[];
  documentTypeHint: string | null;
  folderHint: (typeof AI_SUGGESTED_FOLDERS)[number] | null;
};

type AnalysisComputation = {
  documentFingerprint: string | null;
  detectedType: string | null;
  analysisStatus: InboxAnalysisStatus;
  analysisSummary: string | null;
  analysisDetails: string | null;
  extractedTextPreview: string | null;
  matchedClientId: number | null;
  matchedClientName: string | null;
  matchedClientConfidence: number | null;
  matchedBy: string | null;
  suggestedFolder: string | null;
  analysisContext: string | null;
  analysisProvider: string | null;
  analysisError: string | null;
};

const emptySignals = (): DocumentSignals => ({
  fileFingerprint: null,
  documentSignature: null,
  receiverName: null,
  receiverIdentity: null,
  issuerName: null,
  issuerIdentity: null,
  invoiceScenario: null,
  invoiceType: null,
  documentNumber: null,
  documentDate: null,
  totalAmount: null,
  taxOffice: null,
  identities: [],
  ibanList: [],
  documentTypeHint: null,
  folderHint: null
});

const mimeByExtension: Record<string, string> = {
  ".csv": "text/csv",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".html": "text/html",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".webp": "image/webp",
  ".xhtml": "application/xhtml+xml",
  ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xltm": "application/vnd.ms-excel.template.macroEnabled.12",
  ".xltx": "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
  ".xml": "application/xml"
};

const textLikeExtensions = new Set([".csv", ".html", ".json", ".txt", ".xml", ".xhtml"]);
const spreadsheetExtensions = new Set([".xlsx", ".xlsm", ".xltx", ".xltm"]);
const aiInlineMimeTypes = new Set([
  "application/pdf",
  "image/gif",
  "image/heic",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const folderByType: Array<{
  keywords: string[];
  documentType: string;
  folder: (typeof AI_SUGGESTED_FOLDERS)[number];
}> = [
  {
    keywords: ["e arsiv", "earsiv", "e-fatura", "efatura", "fatura", "invoice", "irsaliye"],
    documentType: "Fatura / e-Arsiv",
    folder: "03-Faturalar"
  },
  {
    keywords: ["dekont", "ekstre", "swift", "havale", "eft", "iban", "hesap ozeti", "banka"],
    documentType: "Banka Dekontu",
    folder: "04-Banka"
  },
  {
    keywords: ["beyanname", "kdv", "muhtasar", "gecici vergi", "kurumlar vergisi"],
    documentType: "Beyanname / Vergi",
    folder: "02-Beyanname"
  },
  {
    keywords: ["bordro", "sgk", "ise giris", "ise cikis", "puantaj"],
    documentType: "Personel Belgesi",
    folder: "05-Personel"
  },
  {
    keywords: ["ticaret sicil", "faaliyet belgesi", "vergi levhasi", "tebligat", "resmi", "yoklama"],
    documentType: "Resmi Evrak",
    folder: "06-Resmi Evrak"
  },
  {
    keywords: ["kimlik", "pasaport", "ehliyet", "ikametgah", "adres beyan"],
    documentType: "Kimlik / Kisisel Evrak",
    folder: "01-Gelen Belgeler"
  }
];

const normalizeText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9.\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;

const unique = <T>(items: T[]) => [...new Set(items)];

const computeFingerprint = async (filePath: string) => {
  const buffer = await fs.readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
};

const normalizeIdentity = (value: string | null | undefined) => {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11 ? digits : null;
};

const buildDocumentSignature = (signals: DocumentSignals, detectedTypeHint: string | null) => {
  const parts = unique(
    [
      detectedTypeHint,
      signals.receiverIdentity,
      signals.issuerIdentity,
      signals.documentNumber,
      signals.documentDate,
      signals.totalAmount,
      signals.receiverName,
      signals.issuerName
    ]
      .filter(Boolean)
      .map((value) => normalizeText(String(value)))
      .filter((value) => value.length >= 2)
  );

  if (parts.length < 3) {
    return null;
  }

  return parts.join(" | ");
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)));

const scoreDecodedText = (text: string) => {
  const replacementPenalty = (text.match(/�/g) ?? []).length * 30;
  const nullPenalty = (text.match(/\u0000/g) ?? []).length * 20;
  const keywordSignals = [
    "fatura",
    "sayin",
    "tckn",
    "vkn",
    "vergi dairesi",
    "ettn",
    "odenecek tutar",
    "beyanname",
    "dekont"
  ];
  const keywordScore = keywordSignals.reduce(
    (total, keyword) => total + ((normalizeText(text).includes(keyword) ? 18 : 0)),
    0
  );
  const turkishScore = (text.match(/[çğıöşüÇĞİÖŞÜ]/g) ?? []).length;
  const printableScore = (text.match(/[a-zA-Z0-9]/g) ?? []).length / 120;

  return printableScore + keywordScore + turkishScore - replacementPenalty - nullPenalty;
};

const decodeBestEffortText = (buffer: Buffer) => {
  if (buffer.length >= 2) {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return iconv.decode(buffer, "utf16le").replace(/\u0000/g, " ");
    }

    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      const swapped = Buffer.from(buffer);
      for (let index = 0; index < swapped.length - 1; index += 2) {
        const current = swapped[index];
        swapped[index] = swapped[index + 1];
        swapped[index + 1] = current;
      }

      return iconv.decode(swapped, "utf16le").replace(/\u0000/g, " ");
    }
  }

  const candidates = TEXT_ENCODINGS.map((encoding) => {
    const decoded = iconv.decode(buffer, encoding);
    return {
      decoded,
      score: scoreDecodedText(decoded)
    };
  });

  return candidates.sort((left, right) => right.score - left.score)[0]?.decoded ?? "";
};

const parseGeminiTextResponse = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidates = Reflect.get(payload, "candidates");
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const content = Reflect.get(candidates[0] as object, "content");
  const parts = Reflect.get(content as object, "parts");
  if (!Array.isArray(parts)) {
    return null;
  }

  const text = parts
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }

      const value = Reflect.get(part, "text");
      return typeof value === "string" ? value : "";
    })
    .join("")
    .trim();

  return text.length > 0 ? text : null;
};

const tryParseJsonObject = (value: string) => {
  const attempt = (candidate: string) => {
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  };

  const direct = attempt(value);
  if (direct) {
    return direct;
  }

  const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const fenced = attempt(fencedMatch[1]);
    if (fenced) {
      return fenced;
    }
  }

  const objectMatch = value.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return attempt(objectMatch[0]);
  }

  return null;
};

const normalizeAiPayload = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload.find((item) => item && typeof item === "object") ?? null;
  }

  return payload;
};

const getMimeType = (filePath: string) => {
  const extension = path.extname(filePath).toLocaleLowerCase("tr-TR");
  return {
    extension,
    mimeType: mimeByExtension[extension] ?? "application/octet-stream"
  };
};

const normalizeWhitespace = (value: string) =>
  value.replace(/\u00a0/g, " ").replace(/\r/g, "").replace(/\t/g, " ").replace(/\s+/g, " ").trim();

const stripHtmlToVisibleText = (html: string) => {
  const qrValueMatches = [...html.matchAll(/<div[^>]+id=["']qrvalue["'][^>]*>([\s\S]*?)<\/div>/gi)];
  const qrBlockText = qrValueMatches
    .map((match) => decodeHtmlEntities(match[1]))
    .join("\n")
    .trim();

  const sanitized = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<(br|\/tr|\/td|\/th|\/p|\/div|\/li|\/h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const visible = decodeHtmlEntities(sanitized)
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .join("\n");

  return normalizeWhitespace(`${visible}\n${qrBlockText}`);
};

const findLineValue = (lines: string[], label: string) => {
  const normalizedLabel = normalizeText(label);
  const line = lines.find((item) => normalizeText(item).includes(normalizedLabel));
  if (!line) {
    return null;
  }

  const directMatch = line.match(/:\s*(.+)$/);
  if (directMatch?.[1]) {
    return normalizeWhitespace(directMatch[1]);
  }

  return normalizeWhitespace(line.replace(label, ""));
};

const parseQrValueJson = (html: string) => {
  const match = html.match(/<div[^>]+id=["']qrvalue["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!match?.[1]) {
    return null;
  }

  const rawValue = decodeHtmlEntities(match[1]).trim();
  try {
    return JSON.parse(rawValue) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const extractReceiverName = (lines: string[]) => {
  const sayinIndex = lines.findIndex((line) => normalizeText(line) === "sayin");
  if (sayinIndex < 0) {
    return null;
  }

  const candidates: string[] = [];
  for (let index = sayinIndex + 1; index < Math.min(lines.length, sayinIndex + 6); index += 1) {
    const line = normalizeWhitespace(lines[index]);
    if (!line) {
      continue;
    }

    if (line.includes(":")) {
      break;
    }

    if (/\d/.test(line) && !/^[A-ZÇĞİÖŞÜ\s.&-]+$/u.test(line)) {
      break;
    }

    candidates.push(line);
  }

  return unique(candidates).sort((left, right) => right.length - left.length)[0] ?? null;
};

const parseHtmlSignals = (html: string): { preview: string; signals: DocumentSignals } => {
  const visibleText = stripHtmlToVisibleText(html);
  const lines = visibleText.split("\n").map((line) => normalizeWhitespace(line)).filter(Boolean);
  const qrPayload = parseQrValueJson(html);
  const qrReceiverIdentity = normalizeIdentity(String(qrPayload?.avkntckn ?? ""));
  const qrIssuerIdentity = normalizeIdentity(String(qrPayload?.vkntckn ?? ""));
  const lineIdentity = normalizeIdentity(findLineValue(lines, "TCKN") ?? findLineValue(lines, "VKN"));
  const receiverName = extractReceiverName(lines);
  const taxOffice = findLineValue(lines, "Vergi Dairesi");
  const qrDocumentNumber = normalizeWhitespace(String(qrPayload?.no ?? "")) || null;
  const qrDocumentDate = normalizeWhitespace(String(qrPayload?.tarih ?? "")) || null;
  const qrInvoiceScenario = normalizeWhitespace(String(qrPayload?.senaryo ?? "")) || null;
  const qrInvoiceType = normalizeWhitespace(String(qrPayload?.tip ?? "")) || null;
  const qrTotalAmount = normalizeWhitespace(String(qrPayload?.odenecek ?? "")) || null;
  const documentNumber = findLineValue(lines, "Fatura No") ?? qrDocumentNumber;
  const documentDate = findLineValue(lines, "Fatura Tarihi") ?? qrDocumentDate;
  const invoiceScenario = findLineValue(lines, "Senaryo") ?? qrInvoiceScenario;
  const invoiceType = findLineValue(lines, "Fatura Tipi") ?? qrInvoiceType;
  const totalAmount =
    findLineValue(lines, "Odenecek Tutar") ??
    findLineValue(lines, "Vergiler Dahil Toplam Tutar") ??
    qrTotalAmount;
  const ibanList = unique(
    [...visibleText.matchAll(/\bTR\d{24}\b/g)].map((match) => normalizeWhitespace(match[0]))
  );

  const signals: DocumentSignals = {
    ...emptySignals(),
    receiverName,
    receiverIdentity: qrReceiverIdentity ?? lineIdentity,
    issuerIdentity: qrIssuerIdentity,
    invoiceScenario,
    invoiceType,
    documentNumber,
    documentDate,
    totalAmount,
    taxOffice,
    identities: unique([qrReceiverIdentity, qrIssuerIdentity, lineIdentity].filter(Boolean) as string[]),
    ibanList,
    documentTypeHint: invoiceScenario?.toLocaleUpperCase("tr-TR").includes("EARSIV")
      ? "Fatura / e-Arsiv"
      : "Fatura / HTML Belge",
    folderHint: "03-Faturalar"
  };

  const structuredLines = [
    signals.receiverName ? `Alici: ${signals.receiverName}` : null,
    signals.receiverIdentity ? `Alici kimlik: ${signals.receiverIdentity}` : null,
    signals.issuerIdentity ? `Duzenleyen kimlik: ${signals.issuerIdentity}` : null,
    signals.taxOffice ? `Vergi dairesi: ${signals.taxOffice}` : null,
    signals.documentNumber ? `Belge no: ${signals.documentNumber}` : null,
    signals.documentDate ? `Belge tarihi: ${signals.documentDate}` : null,
    signals.invoiceType ? `Belge tipi: ${signals.invoiceType}` : null,
    signals.invoiceScenario ? `Senaryo: ${signals.invoiceScenario}` : null,
    signals.totalAmount ? `Odenecek: ${signals.totalAmount}` : null
  ].filter(Boolean);

  return {
    preview: truncate(`${structuredLines.join("\n")}\n${visibleText}`.trim(), TEXT_PREVIEW_LIMIT),
    signals
  };
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

const parseSpreadsheetPreview = async (filePath: string) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const chunks: string[] = [];
  workbook.eachSheet((worksheet) => {
    if (chunks.length >= 16) {
      return;
    }

    chunks.push(`[Sayfa] ${worksheet.name}`);
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 16 || chunks.length >= 48) {
        return;
      }

      const values = row.values
        .slice(1)
        .map((cell) => normalizeCell(cell))
        .filter(Boolean);

      if (values.length > 0) {
        chunks.push(values.join(" | "));
      }
    });
  });

  return truncate(chunks.join("\n").trim(), TEXT_PREVIEW_LIMIT);
};

const extractTextAndSignals = async (filePath: string, extension: string) => {
  if (spreadsheetExtensions.has(extension)) {
    return {
      preview: await parseSpreadsheetPreview(filePath),
      signals: emptySignals()
    };
  }

  if (!textLikeExtensions.has(extension)) {
    return {
      preview: "",
      signals: emptySignals()
    };
  }

  const buffer = await fs.readFile(filePath);
  const decoded = decodeBestEffortText(buffer);

  if (extension === ".html" || extension === ".xhtml") {
    return parseHtmlSignals(decoded);
  }

  return {
    preview: truncate(normalizeWhitespace(decoded), TEXT_PREVIEW_LIMIT),
    signals: emptySignals()
  };
};

const listActiveClients = async () => {
  const db = getDatabase();
  const rows = await db.select().from(clientsTable).where(eq(clientsTable.status, "active"));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    identityNumber: row.identityNumber,
    taxOffice: row.taxOffice,
    authorizedPerson: row.authorizedPerson
  }));
};

const findClientNameById = async (clientId: number | null | undefined) => {
  if (!clientId) {
    return null;
  }

  const db = getDatabase();
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
  return client?.name ?? null;
};

const findDuplicateDocument = async (documentId: number, fingerprint: string | null) => {
  if (!fingerprint) {
    return null;
  }

  const db = getDatabase();
  const rows = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.documentFingerprint, fingerprint));

  const duplicate = rows
    .filter((row) => row.id !== documentId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

  if (!duplicate) {
    return null;
  }

  const duplicateClientName =
    duplicate.matchedClientName ?? (await findClientNameById(duplicate.clientId ?? null));

  return {
    row: duplicate,
    clientName: duplicateClientName
  };
};

const buildClientCandidates = async (haystack: string, signals: DocumentSignals) => {
  const clients = await listActiveClients();
  const candidates: ClientCandidate[] = [];

  clients.forEach((client) => {
    const normalizedClientName = normalizeText(client.name);
    const normalizedAuth = normalizeText(client.authorizedPerson ?? "");
    const normalizedReceiverName = normalizeText(signals.receiverName ?? "");
    const normalizedIssuerName = normalizeText(signals.issuerName ?? "");
    const tokens = normalizedClientName.split(" ").filter((token) => token.length >= 3);
    let score = 0;
    let reason = "";

    if (client.identityNumber && signals.receiverIdentity && client.identityNumber === signals.receiverIdentity) {
      score = 0.995;
      reason = "alici-kimlik";
    } else if (client.identityNumber && signals.issuerIdentity && client.identityNumber === signals.issuerIdentity) {
      score = 0.99;
      reason = "duzenleyen-kimlik";
    } else if (client.identityNumber && signals.identities.includes(client.identityNumber)) {
      score = 0.985;
      reason = "belge-kimlik";
    } else if (
      normalizedReceiverName &&
      (normalizedReceiverName === normalizedClientName ||
        normalizedReceiverName.includes(normalizedClientName) ||
        normalizedClientName.includes(normalizedReceiverName))
    ) {
      score = 0.94;
      reason = "alici-unvan";
    } else if (
      normalizedIssuerName &&
      (normalizedIssuerName === normalizedClientName ||
        normalizedIssuerName.includes(normalizedClientName) ||
        normalizedClientName.includes(normalizedIssuerName))
    ) {
      score = 0.92;
      reason = "duzenleyen-unvan";
    } else if (normalizedClientName && haystack.includes(normalizedClientName)) {
      score = 0.9;
      reason = "tam-unvan";
    } else {
      const tokenMatches = tokens.filter((token) => haystack.includes(token)).length;
      if (tokenMatches >= 2) {
        score = 0.48 + Math.min(tokenMatches * 0.12, 0.3);
        reason = "unvan-token";
      } else if (normalizedAuth && haystack.includes(normalizedAuth)) {
        score = 0.42;
        reason = "yetkili";
      }
    }

    if (score > 0) {
      candidates.push({
        clientId: client.id,
        name: client.name,
        identityNumber: client.identityNumber,
        score: Math.min(score, 0.995),
        reason
      });
    }
  });

  return candidates.sort((left, right) => right.score - left.score).slice(0, 5);
};

const mergeClientCandidates = (
  heuristicCandidates: ClientCandidate[],
  learnedCandidates: ClientCandidate[]
) => {
  const candidateMap = new Map<number, ClientCandidate>();

  [...heuristicCandidates, ...learnedCandidates].forEach((candidate) => {
    const current = candidateMap.get(candidate.clientId);
    if (!current || candidate.score > current.score) {
      candidateMap.set(candidate.clientId, candidate);
    }
  });

  return [...candidateMap.values()].sort((left, right) => right.score - left.score).slice(0, 5);
};

const applyLearnedFolderSuggestion = async (analysis: AnalysisComputation) => {
  if (!analysis.matchedClientId) {
    return analysis;
  }

  const learnedFolder = await findLearnedFolderSuggestion(
    analysis.matchedClientId,
    analysis.detectedType
  );

  if (!learnedFolder) {
    return analysis;
  }

  return {
    ...analysis,
    suggestedFolder: learnedFolder
  } satisfies AnalysisComputation;
};

const buildHeuristicAnalysis = (
  originalName: string,
  haystack: string,
  extractedTextPreview: string,
  signals: DocumentSignals,
  candidates: ClientCandidate[]
): AnalysisComputation => {
  const keywordMatch = folderByType.find((item) =>
    item.keywords.some((keyword) => haystack.includes(normalizeText(keyword)))
  );

  const topCandidate = candidates[0] ?? null;
  const detectedType = signals.documentTypeHint ?? keywordMatch?.documentType ?? "Belge / Diger";
  const suggestedFolder = signals.folderHint ?? keywordMatch?.folder ?? "01-Gelen Belgeler";
  const confidence = topCandidate ? Math.round(topCandidate.score * 100) : null;
  const summaryParts = [detectedType];

  if (signals.receiverName) {
    summaryParts.push(`Alici: ${signals.receiverName}`);
  }

  if (signals.totalAmount) {
    summaryParts.push(`Tutar: ${signals.totalAmount}`);
  }

  summaryParts.push(
    topCandidate ? `${topCandidate.name} ile eslesti.` : "Net bir mukellef eslesmesi bulunamadi."
  );

  const detailParts = [
    `Dosya: ${originalName}`,
    `Onerilen klasor: ${suggestedFolder}`,
    signals.documentNumber ? `Belge no: ${signals.documentNumber}` : null,
    signals.documentDate ? `Belge tarihi: ${signals.documentDate}` : null,
    signals.invoiceScenario ? `Senaryo: ${signals.invoiceScenario}` : null,
    signals.invoiceType ? `Belge tipi: ${signals.invoiceType}` : null,
    signals.receiverName ? `Alici: ${signals.receiverName}` : null,
    signals.receiverIdentity ? `Alici kimlik: ${signals.receiverIdentity}` : null,
    signals.issuerIdentity ? `Duzenleyen kimlik: ${signals.issuerIdentity}` : null,
    signals.taxOffice ? `Vergi dairesi: ${signals.taxOffice}` : null,
    signals.totalAmount ? `Tutar: ${signals.totalAmount}` : null,
    topCandidate
      ? `Eslesme nedeni: ${topCandidate.reason} (${Math.round(topCandidate.score * 100)}%)`
      : "Eslesme nedeni: yeterli sinyal yok",
    extractedTextPreview
      ? `Metin onizlemesi: ${truncate(extractedTextPreview.replace(/\s+/g, " "), 260)}`
      : null
  ].filter(Boolean) as string[];

  const analysisStatus =
    topCandidate && topCandidate.score >= 0.9
      ? "ready"
      : detectedType !== "Belge / Diger" || signals.identities.length > 0 || Boolean(signals.receiverName)
        ? "needs_review"
        : "needs_review";

  return {
    documentFingerprint: signals.fileFingerprint,
    detectedType,
    analysisStatus,
    analysisSummary: summaryParts.join(" | "),
    analysisDetails: detailParts.join("\n"),
    extractedTextPreview: extractedTextPreview || null,
    matchedClientId: topCandidate?.clientId ?? null,
    matchedClientName: topCandidate?.name ?? null,
    matchedClientConfidence: confidence,
    matchedBy: topCandidate?.reason ?? null,
    suggestedFolder,
    analysisContext: serializeInboxAnalysisContext({ signals }),
    analysisProvider: "heuristic",
    analysisError: null
  };
};

const callGemini = async (
  document: DocumentRow,
  mimeType: string,
  extractedTextPreview: string,
  signals: DocumentSignals,
  candidates: ClientCandidate[],
  heuristic: AnalysisComputation
) => {
  if (!env.geminiApiKey) {
    return null;
  }

  const fileBuffer = await fs.readFile(document.storedPath);
  const shouldAttachInline =
    aiInlineMimeTypes.has(mimeType) && fileBuffer.byteLength <= INLINE_FILE_SIZE_LIMIT;

  if (!shouldAttachInline && extractedTextPreview.trim().length === 0) {
    return null;
  }

  const candidateLines =
    candidates.length > 0
      ? candidates
          .map(
            (candidate, index) =>
              `${index + 1}. ${candidate.name} | kimlik: ${candidate.identityNumber ?? "-"} | skor: ${candidate.score.toFixed(2)} | neden: ${candidate.reason}`
          )
          .join("\n")
      : "Aday bulunamadi.";

  const structuredFacts = [
    signals.receiverName ? `Alici adi: ${signals.receiverName}` : null,
    signals.receiverIdentity ? `Alici kimlik: ${signals.receiverIdentity}` : null,
    signals.issuerIdentity ? `Duzenleyen kimlik: ${signals.issuerIdentity}` : null,
    signals.documentNumber ? `Belge no: ${signals.documentNumber}` : null,
    signals.documentDate ? `Belge tarihi: ${signals.documentDate}` : null,
    signals.invoiceScenario ? `Senaryo: ${signals.invoiceScenario}` : null,
    signals.invoiceType ? `Belge tipi: ${signals.invoiceType}` : null,
    signals.totalAmount ? `Tutar: ${signals.totalAmount}` : null,
    signals.taxOffice ? `Vergi dairesi: ${signals.taxOffice}` : null
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = [
    "Sen Domizan icin muhasebe ofisi belge ayristirma asistani olarak calisiyorsun.",
    "Gorevin belge tipini bulmak, belge kime aitse en olasi mukellefi secmek ve dogru klasoru onermek.",
    "Asla markdown, aciklama, dizi, kod blogu veya birden fazla sonuc donme.",
    "Sadece TEK bir JSON nesnesi don. Top-level array donme.",
    "Kimlik numarasi, e-Arsiv fatura alicisi, VKN, TCKN, fatura no ve toplam tutar en guclu sinyallerdir.",
    `Dosya adi: ${document.originalName}`,
    `Mime: ${mimeType}`,
    `Heuristik belge tipi: ${heuristic.detectedType ?? "-"}`,
    `Heuristik klasor: ${heuristic.suggestedFolder ?? "-"}`,
    `Heuristik ozet: ${heuristic.analysisSummary ?? "-"}`,
    structuredFacts.length > 0 ? `Belgeden cikarilan alanlar:\n${structuredFacts}` : "Belgeden cikarilan ozel alan yok.",
    `Aday mukellefler:\n${candidateLines}`,
    extractedTextPreview.trim().length > 0
      ? `Metin onizlemesi:\n${truncate(extractedTextPreview, 4200)}`
      : "Metin onizlemesi yok.",
    `Donulecek JSON semasi:
{
  "documentType": "kisa tip",
  "summary": "tek paragraf ozet",
  "details": "gerekirse kisa aciklama",
  "suggestedFolder": "01-Gelen Belgeler | 02-Beyanname | 03-Faturalar | 04-Banka | 05-Personel | 06-Resmi Evrak | 99-Diger",
  "matchedClientName": "aday isim veya null",
  "matchedBy": "ornek: alici-kimlik, duzenleyen-kimlik, alici-unvan, iban, icerik",
  "confidence": 0.0,
  "needsReview": true
}`
  ].join("\n\n");

  const parts = [{ text: prompt }] as Array<Record<string, unknown>>;
  if (shouldAttachInline) {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: fileBuffer.toString("base64")
      }
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.05
        },
        contents: [{ parts }]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini analizi basarisiz oldu (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as unknown;
  const responseText = parseGeminiTextResponse(payload);
  if (!responseText) {
    return null;
  }

  const parsed = tryParseJsonObject(responseText);
  if (!parsed) {
    return null;
  }

  const normalizedPayload = normalizeAiPayload(parsed);
  if (!normalizedPayload) {
    return null;
  }

  const aiResult = aiResultSchema.parse(normalizedPayload);
  const normalizedAiName = normalizeText(aiResult.matchedClientName ?? "");
  const matchedCandidate =
    candidates.find((candidate) => normalizeText(candidate.name) === normalizedAiName) ??
    candidates.find((candidate) => normalizeText(candidate.name).includes(normalizedAiName)) ??
    null;
  const resolvedMatchedClientId = matchedCandidate?.clientId ?? heuristic.matchedClientId;
  const resolvedMatchedClientName = matchedCandidate?.name ?? heuristic.matchedClientName;
  const resolvedConfidence =
    resolvedMatchedClientId || resolvedMatchedClientName
      ? Math.round((aiResult.confidence ?? matchedCandidate?.score ?? 0) * 100)
      : null;

  return {
    documentFingerprint: heuristic.documentFingerprint,
    detectedType: aiResult.documentType,
    analysisStatus:
      aiResult.needsReview || !resolvedMatchedClientName || (aiResult.confidence ?? 0) < 0.78
        ? "needs_review"
        : "ready",
    analysisSummary: aiResult.summary,
    analysisDetails: aiResult.details?.trim() || heuristic.analysisDetails,
    extractedTextPreview: heuristic.extractedTextPreview,
    matchedClientId: resolvedMatchedClientId,
    matchedClientName: resolvedMatchedClientName,
    matchedClientConfidence: resolvedConfidence,
    matchedBy: resolvedMatchedClientName
      ? aiResult.matchedBy ?? matchedCandidate?.reason ?? heuristic.matchedBy
      : null,
    suggestedFolder: aiResult.suggestedFolder,
    analysisContext: heuristic.analysisContext,
    analysisProvider: shouldAttachInline ? "gemini-inline" : "gemini-text",
    analysisError: null
  } satisfies AnalysisComputation;
};

export const computeInboxAnalysis = async (document: DocumentRow): Promise<AnalysisComputation> => {
  const fileFingerprint = await computeFingerprint(document.storedPath).catch(() => null);
  const { extension, mimeType } = getMimeType(document.storedPath);
  const { preview: extractedTextPreview, signals } = await extractTextAndSignals(
    document.storedPath,
    extension
  ).catch(() => ({
    preview: "",
    signals: emptySignals()
  }));
  signals.fileFingerprint = fileFingerprint;

  const haystack = normalizeText(
    [
      document.originalName,
      extractedTextPreview,
      signals.receiverName,
      signals.receiverIdentity,
      signals.issuerName,
      signals.issuerIdentity,
      signals.documentNumber,
      signals.documentDate,
      signals.totalAmount,
      signals.taxOffice
    ]
      .filter(Boolean)
      .join("\n")
  );
  signals.documentSignature = buildDocumentSignature(
    signals,
    signals.documentTypeHint
  );

  const [heuristicCandidates, learnedCandidates] = await Promise.all([
    buildClientCandidates(haystack, signals),
    findLearnedClientCandidates(signals)
  ]);
  const candidates = mergeClientCandidates(heuristicCandidates, learnedCandidates);
  const heuristicBase = buildHeuristicAnalysis(
    document.originalName,
    haystack,
    extractedTextPreview,
    signals,
    candidates
  );
  const heuristic = await applyLearnedFolderSuggestion(heuristicBase);
  const duplicateMatch = await findDuplicateDocument(document.id, fileFingerprint);

  if (
    duplicateMatch &&
    (duplicateMatch.row.clientId ||
      duplicateMatch.clientName ||
      duplicateMatch.row.routedFolder ||
      duplicateMatch.row.suggestedFolder)
  ) {
    const duplicateFolder =
      duplicateMatch.row.routedFolder ??
      duplicateMatch.row.suggestedFolder ??
      heuristic.suggestedFolder;
    const duplicateClientName =
      duplicateMatch.clientName ??
      duplicateMatch.row.matchedClientName ??
      heuristic.matchedClientName;

    return {
      ...heuristic,
      analysisStatus: duplicateMatch.row.status === "routed" ? "ready" : "needs_review",
      analysisSummary: duplicateClientName
        ? `Bu belge daha once yuklendi. Son kayitta ${duplicateClientName} ile eslesti.`
        : "Bu belge daha once yuklendi.",
      analysisDetails: [
        duplicateMatch.row.lastAnalyzedAt
          ? `Onceki analiz: ${duplicateMatch.row.lastAnalyzedAt}`
          : null,
        duplicateMatch.row.storedPath ? `Onceki konum: ${duplicateMatch.row.storedPath}` : null,
        duplicateFolder ? `Onceki klasor: ${duplicateFolder}` : null,
        heuristic.analysisDetails
      ]
        .filter(Boolean)
        .join("\n"),
      matchedClientId: duplicateMatch.row.clientId ?? heuristic.matchedClientId,
      matchedClientName: duplicateClientName,
      matchedClientConfidence: duplicateClientName ? 100 : heuristic.matchedClientConfidence,
      matchedBy: "ayni-belge",
      suggestedFolder: duplicateFolder,
      analysisProvider: "duplicate-match",
      analysisError: null
    };
  }

  try {
    const aiResult = await callGemini(
      document,
      mimeType,
      extractedTextPreview,
      signals,
      candidates,
      heuristic
    );

    if (aiResult) {
      return applyLearnedFolderSuggestion(aiResult);
    }
  } catch (error) {
    return {
      ...heuristic,
      analysisStatus: heuristic.matchedClientId ? "needs_review" : "failed",
      analysisProvider: heuristic.analysisProvider,
      analysisError:
        error instanceof Error ? truncate(error.message, 500) : "AI analizi sirasinda hata olustu."
    };
  }

  return heuristic;
};

export const getDocumentMimeDetails = (filePath: string, stat: { size: number; mtime: Date }) => {
  const { extension, mimeType } = getMimeType(filePath);
  return {
    mimeType,
    fileExtension: extension.replace(/^\./, "") || null,
    fileSize: stat.size,
    sourceModifiedAt: stat.mtime.toISOString()
  };
};
