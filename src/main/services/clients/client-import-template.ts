import fs from "node:fs";
import path from "node:path";
import { shell } from "electron";
import ExcelJS from "exceljs";

import {
  DOMIZAN_CLIENT_IMPORT_TEMPLATE_COLUMNS,
  DOMIZAN_CLIENT_IMPORT_TEMPLATE_FILE_BASENAME,
  DOMIZAN_CLIENT_IMPORT_TEMPLATE_GUIDANCE
} from "../../../shared/client-import-template";
import type { ClientImportTemplateResult } from "../../../shared/contracts";
import { ensureDomizanDirectories } from "../domizan-directories";

const XLSX_FILE_NAME = `${DOMIZAN_CLIENT_IMPORT_TEMPLATE_FILE_BASENAME}.xlsx`;
const CSV_FILE_NAME = `${DOMIZAN_CLIENT_IMPORT_TEMPLATE_FILE_BASENAME}.csv`;

const getColumnLetter = (index: number) => {
  let current = index + 1;
  let result = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
};

const buildCsvTemplateContent = () =>
  `\uFEFF${DOMIZAN_CLIENT_IMPORT_TEMPLATE_COLUMNS.map((column) => column.label).join(";")}\n`;

const writeWorkbookTemplate = async (filePath: string) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Domizan";
  workbook.created = new Date();
  workbook.modified = new Date();

  const dataSheet = workbook.addWorksheet("Mukellef Listesi", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  dataSheet.properties.defaultRowHeight = 24;
  dataSheet.columns = DOMIZAN_CLIENT_IMPORT_TEMPLATE_COLUMNS.map((column) => ({
    header: column.label,
    key: column.field,
    width: column.width ?? Math.max(18, column.label.length + 4)
  }));

  const headerRow = dataSheet.getRow(1);
  headerRow.font = { name: "Aptos", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF22357A" }
  };
  headerRow.border = {
    bottom: { style: "thin", color: { argb: "FFD8E0F7" } }
  };

  const autoFilterEnd = getColumnLetter(DOMIZAN_CLIENT_IMPORT_TEMPLATE_COLUMNS.length - 1);
  dataSheet.autoFilter = `A1:${autoFilterEnd}1`;

  const notesSheet = workbook.addWorksheet("Kullanim-Talimatlari");
  notesSheet.columns = [
    { width: 30 },
    { width: 80 }
  ];

  notesSheet.addRow(["Domizan Şablon Kuralı", "Açıklama"]);
  const notesHeader = notesSheet.getRow(1);
  notesHeader.font = { name: "Aptos", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  notesHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0D1635" }
  };

  DOMIZAN_CLIENT_IMPORT_TEMPLATE_GUIDANCE.forEach((item, index) => {
    notesSheet.addRow([`Kural ${index + 1}`, item]);
  });

  notesSheet.addRow([]);
  notesSheet.addRow(["Kolon", "Beklenen içerik"]);

  DOMIZAN_CLIENT_IMPORT_TEMPLATE_COLUMNS.forEach((column) => {
    notesSheet.addRow([
      `${column.label}${column.required ? " (Zorunlu)" : ""}`,
      column.description
    ]);
  });

  await workbook.xlsx.writeFile(filePath);
};

export const prepareClientImportTemplate = async (): Promise<ClientImportTemplateResult> => {
  const directories = ensureDomizanDirectories();
  const folderPath = directories.templates;

  fs.mkdirSync(folderPath, { recursive: true });

  const xlsxPath = path.join(folderPath, XLSX_FILE_NAME);
  const csvPath = path.join(folderPath, CSV_FILE_NAME);

  await writeWorkbookTemplate(xlsxPath);
  fs.writeFileSync(csvPath, buildCsvTemplateContent(), "utf8");

  const openResult = await shell.openPath(folderPath);

  return {
    folderPath,
    xlsxPath,
    csvPath,
    opened: openResult.length === 0,
    error: openResult.length === 0 ? null : openResult
  };
};
