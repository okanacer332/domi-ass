import fs from "node:fs";
import path from "node:path";
import { desc, eq } from "drizzle-orm";

import type {
  ClientDetailSnapshot,
  ClientFileRecord,
  ClientFolderSection,
  InboxDocumentRecord
} from "../../../shared/contracts";
import { DOMIZAN_CLIENT_SUBFOLDERS } from "../../../shared/contracts";
import { getDatabase } from "../../database/connection";
import { clientsTable, documentsTable } from "../../database/schema";
import {
  ensureClientFolderStructure,
  getClientFolderPath,
  getClientSubfolderPath,
  syncClientInfoFile
} from "./client-folders";
import { listClients } from "./client-service";

const MAX_SECTION_FILES = 12;
const MAX_RECENT_FILES = 32;
const MAX_TRACKED_DOCUMENTS = 16;
const MAX_SCAN_DEPTH = 4;
const INFO_FILE_NAME = "Bilgi.txt";

const mapDocumentRow = (row: typeof documentsTable.$inferSelect): InboxDocumentRecord => ({
  id: row.id,
  clientId: row.clientId ?? null,
  source: row.source,
  originalName: row.originalName,
  storedPath: row.storedPath,
  status: row.status as InboxDocumentRecord["status"],
  detectedType: row.detectedType,
  mimeType: row.mimeType,
  fileExtension: row.fileExtension,
  fileSize: row.fileSize ?? null,
  sourceModifiedAt: row.sourceModifiedAt,
  analysisStatus: row.analysisStatus as InboxDocumentRecord["analysisStatus"],
  analysisSummary: row.analysisSummary,
  analysisDetails: row.analysisDetails,
  extractedTextPreview: row.extractedTextPreview,
  matchedClientName: row.matchedClientName,
  matchedClientConfidence: row.matchedClientConfidence ?? null,
  matchedBy: row.matchedBy,
  suggestedFolder: row.suggestedFolder,
  routedFolder: row.routedFolder,
  analysisProvider: row.analysisProvider,
  analysisError: row.analysisError,
  lastAnalyzedAt: row.lastAnalyzedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const buildFileRecord = (
  absolutePath: string,
  rootPath: string,
  folderLabel: string,
  stats: fs.Stats
): ClientFileRecord => ({
  name: path.basename(absolutePath),
  relativePath: path.relative(rootPath, absolutePath),
  absolutePath,
  folderLabel,
  sizeBytes: stats.isFile() ? stats.size : null,
  modifiedAt: stats.mtime.toISOString()
});

const scanDirectory = (
  directoryPath: string,
  rootPath: string,
  folderLabel: string,
  depth = 0
): {
  files: ClientFileRecord[];
  fileCount: number;
  folderCount: number;
  lastModifiedAt: string | null;
} => {
  let fileCount = 0;
  let folderCount = 0;
  let lastModifiedAt: string | null = null;
  const files: ClientFileRecord[] = [];

  if (!fs.existsSync(directoryPath)) {
    return {
      files,
      fileCount,
      folderCount,
      lastModifiedAt
    };
  }

  const entries = fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, "tr"));

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    const stats = fs.statSync(entryPath);
    const modifiedAt = stats.mtime.toISOString();

    if (!lastModifiedAt || modifiedAt > lastModifiedAt) {
      lastModifiedAt = modifiedAt;
    }

    if (entry.isDirectory()) {
      folderCount += 1;

      if (depth < MAX_SCAN_DEPTH) {
        const nested = scanDirectory(entryPath, rootPath, folderLabel, depth + 1);
        files.push(...nested.files);
        fileCount += nested.fileCount;
        folderCount += nested.folderCount;

        if (nested.lastModifiedAt && (!lastModifiedAt || nested.lastModifiedAt > lastModifiedAt)) {
          lastModifiedAt = nested.lastModifiedAt;
        }
      }

      continue;
    }

    fileCount += 1;
    files.push(buildFileRecord(entryPath, rootPath, folderLabel, stats));
  }

  return {
    files,
    fileCount,
    folderCount,
    lastModifiedAt
  };
};

const sortFilesByRecent = (rows: ClientFileRecord[]) =>
  [...rows].sort((left, right) => {
    const rightTime = right.modifiedAt ? new Date(right.modifiedAt).getTime() : 0;
    const leftTime = left.modifiedAt ? new Date(left.modifiedAt).getTime() : 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.relativePath.localeCompare(right.relativePath, "tr");
  });

const buildSections = (folderName: string, status: "active" | "passive"): ClientFolderSection[] => {
  const rootPath = ensureClientFolderStructure(folderName, status);
  const infoFilePath = path.join(rootPath, INFO_FILE_NAME);

  const infoStats = fs.existsSync(infoFilePath) ? fs.statSync(infoFilePath) : null;
  const infoSection: ClientFolderSection = {
    name: "Bilgi Kartı",
    path: infoFilePath,
    fileCount: infoStats ? 1 : 0,
    folderCount: 0,
    lastModifiedAt: infoStats ? infoStats.mtime.toISOString() : null,
    recentFiles: infoStats ? [buildFileRecord(infoFilePath, rootPath, "Bilgi Kartı", infoStats)] : []
  };

  const subSections = DOMIZAN_CLIENT_SUBFOLDERS.map((folderLabel) => {
    const sectionPath = getClientSubfolderPath(folderName, folderLabel, status);
    const scanned = scanDirectory(sectionPath, rootPath, folderLabel);

    return {
      name: folderLabel,
      path: sectionPath,
      fileCount: scanned.fileCount,
      folderCount: scanned.folderCount,
      lastModifiedAt: scanned.lastModifiedAt,
      recentFiles: sortFilesByRecent(scanned.files).slice(0, MAX_SECTION_FILES)
    } satisfies ClientFolderSection;
  });

  return [infoSection, ...subSections];
};

export const getClientDetail = async (clientId: number): Promise<ClientDetailSnapshot> => {
  const clients = await listClients();
  const client = clients.find((item) => item.id === clientId);

  if (!client) {
    throw new Error("Mükellef bulunamadı.");
  }

  syncClientInfoFile(client);
  const folderPath = getClientFolderPath(client.folderName, client.status);
  const sections = buildSections(client.folderName, client.status);
  const recentFiles = sortFilesByRecent(
    sections
      .flatMap((section) => section.recentFiles)
      .filter((file, index, rows) => rows.findIndex((row) => row.absolutePath === file.absolutePath) === index)
  ).slice(0, MAX_RECENT_FILES);

  const db = getDatabase();
  const trackedDocumentRows = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.clientId, clientId))
    .orderBy(desc(documentsTable.updatedAt))
    .limit(MAX_TRACKED_DOCUMENTS);

  return {
    client: {
      ...client,
      folderPath
    },
    sections,
    recentFiles,
    trackedDocuments: trackedDocumentRows.map(mapDocumentRow)
  };
};
