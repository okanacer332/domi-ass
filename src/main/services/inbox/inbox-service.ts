import fs from "node:fs/promises";
import path from "node:path";
import { shell } from "electron";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  DOMIZAN_CLIENT_SUBFOLDERS,
  type FolderOpenResult,
  type InboxDeleteResult,
  type InboxDocumentRecord,
  type InboxMonitorSnapshot,
  type InboxRouteInput,
  type InboxRouteResult,
  type InboxReanalyzeResult
} from "../../../shared/contracts";
import { getDatabase, persistDatabase } from "../../database/connection";
import { clientsTable, documentsTable } from "../../database/schema";
import { getClientSubfolderPath } from "../clients/client-folders";
import { ensureDomizanDirectories } from "../domizan-directories";
import { requireOperationalAccess } from "../licensing/access-service";
import { computeInboxAnalysis, getDocumentMimeDetails } from "./inbox-analysis";
import { learnFromConfirmedRoute } from "./inbox-learning";

const INBOX_SOURCE = "team_inbox";
const SCAN_INTERVAL_MS = 5000;
const ANALYSIS_INTERVAL_MS = 2500;
const ignoredFileNames = new Set([".ds_store", "thumbs.db"]);
const ignoredPrefixes = ["~$", "."];
const ignoredSuffixes = [".crdownload", ".download", ".part", ".tmp"];
const routeSchema = z.object({
  documentId: z.number().int().positive(),
  clientId: z.number().int().positive(),
  targetFolder: z.enum(DOMIZAN_CLIENT_SUBFOLDERS)
});

let monitorStarted = false;
let scanTimer: NodeJS.Timeout | null = null;
let analysisTimer: NodeJS.Timeout | null = null;
let syncRunning = false;
let analysisRunning = false;

const monitorSnapshot: InboxMonitorSnapshot = {
  inboxPath: "",
  isWatching: false,
  lastScanAt: null,
  lastAnalysisAt: null,
  queuedCount: 0,
  analyzingCount: 0,
  readyCount: 0,
  needsReviewCount: 0,
  failedCount: 0
};

const shouldIgnoreFile = (name: string) => {
  const lowerName = name.toLocaleLowerCase("tr-TR");
  if (ignoredFileNames.has(lowerName)) {
    return true;
  }

  if (ignoredPrefixes.some((prefix) => lowerName.startsWith(prefix))) {
    return true;
  }

  return ignoredSuffixes.some((suffix) => lowerName.endsWith(suffix));
};

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

const listFilesRecursive = async (directoryPath: string): Promise<string[]> => {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        return listFilesRecursive(entryPath);
      }

      if (shouldIgnoreFile(entry.name)) {
        return [];
      }

      return [entryPath];
    })
  );

  return files.flat();
};

const getDocumentByPath = async (storedPath: string) => {
  const db = getDatabase();
  const [row] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.source, INBOX_SOURCE), eq(documentsTable.storedPath, storedPath)))
    .limit(1);

  return row ?? null;
};

const getRoutedDuplicateByFingerprint = async (
  documentId: number,
  fingerprint: string | null | undefined
) => {
  if (!fingerprint) {
    return null;
  }

  const db = getDatabase();
  const rows = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.documentFingerprint, fingerprint));

  return (
    rows
      .filter((row) => row.id !== documentId && row.status === "routed")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
  );
};

const buildRoutedSummary = (document: typeof documentsTable.$inferSelect, clientName: string) => {
  if (document.analysisSummary?.trim()) {
    return `${document.analysisSummary} | ${clientName} icin kullanici onayi verildi.`;
  }

  return `${clientName} icin kullanici onayi ile tasindi.`;
};

const buildRoutedDetails = (
  document: typeof documentsTable.$inferSelect,
  targetFolder: string,
  targetPath: string
) => {
  const detailLines = [document.analysisDetails?.trim(), `Onaylanan klasor: ${targetFolder}`, `Yeni konum: ${targetPath}`]
    .filter(Boolean)
    .join("\n");

  return detailLines || null;
};

const ensureUniqueTargetPath = async (directoryPath: string, originalName: string) => {
  const parsed = path.parse(originalName);
  let candidatePath = path.join(directoryPath, originalName);
  let counter = 2;

  for (;;) {
    try {
      await fs.access(candidatePath);
      candidatePath = path.join(directoryPath, `${parsed.name}-${counter}${parsed.ext}`);
      counter += 1;
    } catch {
      return candidatePath;
    }
  }
};

const moveFileSafely = async (sourcePath: string, targetPath: string) => {
  try {
    await fs.rename(sourcePath, targetPath);
  } catch (error) {
    const renameError = error as NodeJS.ErrnoException;
    if (renameError.code !== "EXDEV") {
      throw error;
    }

    await fs.copyFile(sourcePath, targetPath);
    await fs.unlink(sourcePath);
  }
};

const updateCounts = async () => {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.source, INBOX_SOURCE));
  const pendingRows = rows.filter((row) => row.status !== "routed");

  monitorSnapshot.queuedCount = pendingRows.filter((row) => row.analysisStatus === "queued").length;
  monitorSnapshot.analyzingCount = pendingRows.filter((row) => row.analysisStatus === "analyzing").length;
  monitorSnapshot.readyCount = pendingRows.filter((row) => row.analysisStatus === "ready").length;
  monitorSnapshot.needsReviewCount = pendingRows.filter((row) => row.analysisStatus === "needs_review").length;
  monitorSnapshot.failedCount = pendingRows.filter((row) => row.analysisStatus === "failed").length;
};

const queueDocumentForAnalysis = async (filePath: string) => {
  const stat = await fs.stat(filePath);
  const now = new Date().toISOString();
  const details = getDocumentMimeDetails(filePath, stat);
  const db = getDatabase();
  const existing = await getDocumentByPath(filePath);

  if (!existing) {
    await db.insert(documentsTable).values({
      source: INBOX_SOURCE,
      originalName: path.basename(filePath),
      storedPath: filePath,
      status: "waiting",
      detectedType: null,
      mimeType: details.mimeType,
      fileExtension: details.fileExtension,
      fileSize: details.fileSize,
      documentFingerprint: null,
      sourceModifiedAt: details.sourceModifiedAt,
      analysisStatus: "queued",
      analysisSummary: null,
      analysisDetails: null,
      extractedTextPreview: null,
      matchedClientName: null,
      matchedClientConfidence: null,
      matchedBy: null,
      suggestedFolder: null,
      routedFolder: null,
      analysisContext: null,
      analysisProvider: null,
      analysisError: null,
      lastAnalyzedAt: null,
      createdAt: now,
      updatedAt: now
    });
    return true;
  }

  const hasChanged =
    existing.sourceModifiedAt !== details.sourceModifiedAt ||
    existing.fileSize !== details.fileSize ||
    existing.originalName !== path.basename(filePath);

  if (!hasChanged) {
    return false;
  }

  await db
    .update(documentsTable)
    .set({
      originalName: path.basename(filePath),
      mimeType: details.mimeType,
      fileExtension: details.fileExtension,
      fileSize: details.fileSize,
      documentFingerprint: null,
      sourceModifiedAt: details.sourceModifiedAt,
      status: "waiting",
      analysisStatus: "queued",
      analysisError: null,
      updatedAt: now
    })
    .where(eq(documentsTable.id, existing.id));

  return true;
};

const syncInboxDocuments = async () => {
  if (syncRunning) {
    return;
  }

  syncRunning = true;
  try {
    const directories = ensureDomizanDirectories();
    monitorSnapshot.inboxPath = directories.inbox;
    const files = await listFilesRecursive(directories.inbox);
    let changed = false;

    for (const filePath of files) {
      const queued = await queueDocumentForAnalysis(filePath);
      changed = changed || queued;
    }

    monitorSnapshot.lastScanAt = new Date().toISOString();

    if (changed) {
      persistDatabase();
    }

    await updateCounts();
    if (changed) {
      void processQueuedDocuments();
    }
  } finally {
    syncRunning = false;
  }
};

const getNextQueuedDocument = async () => {
  const db = getDatabase();
  const [row] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.source, INBOX_SOURCE), eq(documentsTable.analysisStatus, "queued")))
    .orderBy(desc(documentsTable.updatedAt))
    .limit(1);

  return row ?? null;
};

const processQueuedDocuments = async () => {
  if (analysisRunning) {
    return;
  }

  analysisRunning = true;

  try {
    for (;;) {
      const nextDocument = await getNextQueuedDocument();
      if (!nextDocument) {
        break;
      }

      const db = getDatabase();
      const startedAt = new Date().toISOString();

      await db
        .update(documentsTable)
        .set({
          analysisStatus: "analyzing",
          analysisError: null,
          updatedAt: startedAt
        })
        .where(eq(documentsTable.id, nextDocument.id));
      persistDatabase();
      await updateCounts();

      try {
        const analysis = await computeInboxAnalysis(nextDocument);
        const finishedAt = new Date().toISOString();

        await db
          .update(documentsTable)
          .set({
            clientId: analysis.matchedClientId,
            status: analysis.analysisStatus === "failed" ? "error" : "waiting",
            detectedType: analysis.detectedType,
            analysisStatus: analysis.analysisStatus,
            analysisSummary: analysis.analysisSummary,
            analysisDetails: analysis.analysisDetails,
            extractedTextPreview: analysis.extractedTextPreview,
            matchedClientName: analysis.matchedClientName,
            matchedClientConfidence: analysis.matchedClientConfidence,
            matchedBy: analysis.matchedBy,
            suggestedFolder: analysis.suggestedFolder,
            documentFingerprint: analysis.documentFingerprint,
            analysisContext: analysis.analysisContext,
            analysisProvider: analysis.analysisProvider,
            analysisError: analysis.analysisError,
            lastAnalyzedAt: finishedAt,
      updatedAt: finishedAt
          })
          .where(eq(documentsTable.id, nextDocument.id));

        monitorSnapshot.lastAnalysisAt = finishedAt;
      } catch (error) {
        const failedAt = new Date().toISOString();
        await db
          .update(documentsTable)
          .set({
            status: "error",
            analysisStatus: "failed",
            analysisError:
              error instanceof Error ? error.message : "Belge analizi sirasinda beklenmeyen hata.",
            lastAnalyzedAt: failedAt,
            updatedAt: failedAt
          })
          .where(eq(documentsTable.id, nextDocument.id));

        monitorSnapshot.lastAnalysisAt = failedAt;
      }

      persistDatabase();
      await updateCounts();
    }
  } finally {
    analysisRunning = false;
  }
};

export const initializeInboxMonitor = () => {
  if (monitorStarted) {
    return;
  }

  monitorStarted = true;
  monitorSnapshot.isWatching = true;
  monitorSnapshot.inboxPath = ensureDomizanDirectories().inbox;

  void syncInboxDocuments();
  void processQueuedDocuments();

  scanTimer = setInterval(() => {
    void syncInboxDocuments();
  }, SCAN_INTERVAL_MS);

  analysisTimer = setInterval(() => {
    void processQueuedDocuments();
  }, ANALYSIS_INTERVAL_MS);
};

export const disposeInboxMonitor = () => {
  monitorSnapshot.isWatching = false;
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
  }

  if (analysisTimer) {
    clearInterval(analysisTimer);
    analysisTimer = null;
  }
};

export const listInboxDocuments = async (): Promise<InboxDocumentRecord[]> => {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.source, INBOX_SOURCE))
    .orderBy(desc(documentsTable.updatedAt));

  return rows.map(mapDocumentRow);
};

export const getInboxMonitor = async (): Promise<InboxMonitorSnapshot> => {
  await updateCounts();
  return { ...monitorSnapshot };
};

export const openInboxFolder = async (): Promise<FolderOpenResult> => {
  const targetPath = ensureDomizanDirectories().inbox;
  const result = await shell.openPath(targetPath);

  return {
    opened: result.length === 0,
    error: result.length === 0 ? null : result
  };
};

export const openInboxDocument = async (documentId: number): Promise<FolderOpenResult> => {
  const db = getDatabase();
  const [row] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .limit(1);

  if (!row) {
    return {
      opened: false,
      error: "Belge bulunamadi."
    };
  }

  const result = await shell.openPath(row.storedPath);
  return {
    opened: result.length === 0,
    error: result.length === 0 ? null : result
  };
};

export const reanalyzeInboxDocument = async (documentId: number): Promise<InboxReanalyzeResult> => {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db
    .update(documentsTable)
    .set({
      status: "waiting",
      analysisStatus: "queued",
      analysisError: null,
      updatedAt: now
    })
    .where(eq(documentsTable.id, documentId));
  persistDatabase();
  await updateCounts();
  void processQueuedDocuments();

  return { queued: true };
};

export const deleteInboxDocument = async (documentId: number): Promise<InboxDeleteResult> => {
  await requireOperationalAccess();
  const db = getDatabase();
  const [document] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .limit(1);

  if (!document) {
    throw new Error("Belge bulunamadi.");
  }

  if (document.status === "routed") {
    throw new Error("Tasınan belge bu ekrandan silinmez. Gerekirse mukellef klasorunden yonet.");
  }

  await fs.rm(document.storedPath, { force: true });
  await db.delete(documentsTable).where(eq(documentsTable.id, documentId));
  persistDatabase();
  await updateCounts();

  return {
    deleted: true
  };
};

export const routeInboxDocument = async (input: InboxRouteInput): Promise<InboxRouteResult> => {
  await requireOperationalAccess();
  const parsed = routeSchema.parse(input);
  const db = getDatabase();

  const [document] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, parsed.documentId))
    .limit(1);

  if (!document) {
    throw new Error("Belge bulunamadi.");
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, parsed.clientId))
    .limit(1);

  if (!client) {
    throw new Error("Mukellef bulunamadi.");
  }

  try {
    await fs.access(document.storedPath);
  } catch {
    throw new Error("Belge dosyasi artik mevcut degil. Gelen kutusunu yenileyip tekrar dene.");
  }

  const duplicateRoutedDocument = await getRoutedDuplicateByFingerprint(
    document.id,
    document.documentFingerprint
  );

  if (duplicateRoutedDocument) {
    const [duplicateClient] = duplicateRoutedDocument.clientId
      ? await db
          .select()
          .from(clientsTable)
          .where(eq(clientsTable.id, duplicateRoutedDocument.clientId))
          .limit(1)
      : [null];

    const duplicateClientName =
      duplicateClient?.name ?? duplicateRoutedDocument.matchedClientName ?? "ilgili mukellef";
    const duplicateFolder =
      duplicateRoutedDocument.routedFolder ??
      duplicateRoutedDocument.suggestedFolder ??
      "ilgili klasor";

    throw new Error(
      `Bu belge daha once ${duplicateClientName} icin ${duplicateFolder} klasorune tasindi. Yeni kopya tekrar tasinmadi.`
    );
  }

  const clientStatus = client.status === "passive" ? "passive" : "active";
  const targetDirectory = getClientSubfolderPath(client.folderName, parsed.targetFolder, clientStatus);
  const targetPath = await ensureUniqueTargetPath(targetDirectory, document.originalName);
  await moveFileSafely(document.storedPath, targetPath);

  await learnFromConfirmedRoute({
    client: {
      id: client.id,
      name: client.name,
      identityNumber: client.identityNumber ?? client.taxId ?? null
    },
    analysisContext: document.analysisContext,
    detectedType: document.detectedType,
    targetFolder: parsed.targetFolder
  });

  const now = new Date().toISOString();
  await db
    .update(documentsTable)
    .set({
      clientId: client.id,
      storedPath: targetPath,
      status: "routed",
      analysisStatus: "ready",
      analysisSummary: buildRoutedSummary(document, client.name),
      analysisDetails: buildRoutedDetails(document, parsed.targetFolder, targetPath),
      matchedClientName: client.name,
      matchedClientConfidence: 100,
      matchedBy: "kullanici-onayi",
      suggestedFolder: parsed.targetFolder,
      routedFolder: parsed.targetFolder,
      analysisError: null,
      updatedAt: now
    })
    .where(eq(documentsTable.id, document.id));

  persistDatabase();
  await updateCounts();

  const [updated] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, document.id))
    .limit(1);

  if (!updated) {
    throw new Error("Tasima tamamlandi ancak guncel belge kaydi okunamadi.");
  }

  return {
    moved: true,
    document: mapDocumentRow(updated)
  };
};
