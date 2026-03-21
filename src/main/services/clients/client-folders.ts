import fs from "node:fs";
import path from "node:path";
import { shell } from "electron";

import { getClientIdentityTypeLabel } from "../../../shared/client-identity";
import { DOMIZAN_CLIENT_SUBFOLDERS, type ClientRecord, type InboxRouteFolder } from "../../../shared/contracts";
import { ensureDomizanDirectories } from "../domizan-directories";

const CLIENT_INFO_FILE_NAME = "Bilgi.txt";
const PASSIVE_CLIENTS_FOLDER_NAME = "_Pasif";

const normalizeForFolder = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const getClientsRoot = (status: ClientRecord["status"] = "active") => {
  const directories = ensureDomizanDirectories();
  const basePath =
    status === "passive"
      ? path.join(directories.clients, PASSIVE_CLIENTS_FOLDER_NAME)
      : directories.clients;

  fs.mkdirSync(basePath, { recursive: true });
  return basePath;
};

const moveDirectoryIfNeeded = (sourcePath: string, targetPath: string) => {
  if (sourcePath === targetPath || !fs.existsSync(sourcePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  if (fs.existsSync(targetPath)) {
    fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
    fs.rmSync(sourcePath, { recursive: true, force: true });
    return;
  }

  fs.renameSync(sourcePath, targetPath);
};

export const buildClientFolderSlug = (name: string, identityNumber?: string | null) => {
  const base = normalizeForFolder(name).slice(0, 60) || "mukellef";
  const suffix = identityNumber?.trim() ? `-${identityNumber.trim()}` : "";
  return `${base}${suffix}`;
};

export const getClientFolderPath = (
  folderName: string,
  status: ClientRecord["status"] = "active"
) => path.join(getClientsRoot(status), folderName);

export const ensureUniqueClientFolderName = (baseFolderName: string, currentFolderName?: string) => {
  let candidate = baseFolderName;
  let counter = 2;

  while (
    candidate !== currentFolderName &&
    (fs.existsSync(getClientFolderPath(candidate, "active")) ||
      fs.existsSync(getClientFolderPath(candidate, "passive")))
  ) {
    candidate = `${baseFolderName}-${counter}`;
    counter += 1;
  }

  return candidate;
};

export const ensureClientFolderLocation = (
  folderName: string,
  status: ClientRecord["status"] = "active"
) => {
  const targetPath = getClientFolderPath(folderName, status);
  const oppositeStatus = status === "active" ? "passive" : "active";
  const oppositePath = getClientFolderPath(folderName, oppositeStatus);

  moveDirectoryIfNeeded(oppositePath, targetPath);
  fs.mkdirSync(targetPath, { recursive: true });

  return targetPath;
};

export const ensureClientFolderStructure = (
  folderName: string,
  status: ClientRecord["status"] = "active"
) => {
  const clientFolderPath = ensureClientFolderLocation(folderName, status);

  DOMIZAN_CLIENT_SUBFOLDERS.forEach((subfolder) => {
    fs.mkdirSync(path.join(clientFolderPath, subfolder), { recursive: true });
  });

  return clientFolderPath;
};

export const getClientSubfolderPath = (
  folderName: string,
  subfolder: InboxRouteFolder,
  status: ClientRecord["status"] = "active"
) => {
  const clientFolderPath = ensureClientFolderStructure(folderName, status);
  return path.join(clientFolderPath, subfolder);
};

const formatValue = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : "-";
};

const getStatusLabel = (status: ClientRecord["status"]) => (status === "active" ? "Aktif" : "Pasif");

const formatTimestamp = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(date);
};

const buildClientInfoContent = (client: ClientRecord) =>
  [
    "Domizan Mükellef Bilgi Kartı",
    "Bu belge Domizan tarafından otomatik olarak güncellenir.",
    "",
    `Son güncelleme: ${formatTimestamp(client.updatedAt)}`,
    `Durum: ${getStatusLabel(client.status)}`,
    "",
    `Mükellef adı: ${formatValue(client.name)}`,
    `Kimlik türü: ${getClientIdentityTypeLabel(client.identityType)}`,
    `Kimlik numarası: ${formatValue(client.identityNumber)}`,
    `Vergi dairesi: ${formatValue(client.taxOffice)}`,
    `Yetkili kişi: ${formatValue(client.authorizedPerson)}`,
    `Telefon: ${formatValue(client.phone)}`,
    `E-posta: ${formatValue(client.email)}`,
    `İl / İlçe: ${formatValue(client.city)}`,
    `Adres: ${formatValue(client.address)}`,
    "",
    "Notlar:",
    formatValue(client.notes)
  ].join("\n");

export const syncClientInfoFile = (
  client: ClientRecord,
  options?: {
    onlyIfMissing?: boolean;
  }
) => {
  const clientFolderPath = ensureClientFolderStructure(client.folderName, client.status);
  const infoFilePath = path.join(clientFolderPath, CLIENT_INFO_FILE_NAME);

  if (options?.onlyIfMissing && fs.existsSync(infoFilePath)) {
    return infoFilePath;
  }

  fs.writeFileSync(infoFilePath, buildClientInfoContent(client), "utf8");
  return infoFilePath;
};

export const openClientFolderPath = async (
  folderName: string,
  status: ClientRecord["status"] = "active"
) => {
  const folderPath = ensureClientFolderStructure(folderName, status);
  const result = await shell.openPath(folderPath);

  return {
    opened: result.length === 0,
    error: result.length === 0 ? null : result
  };
};
