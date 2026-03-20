import fs from "node:fs";
import path from "node:path";
import { shell } from "electron";

import { getClientIdentityTypeLabel } from "../../../shared/client-identity";
import type { ClientRecord } from "../../../shared/contracts";
import { ensureDomizanDirectories } from "../domizan-directories";

const CLIENT_SUBFOLDERS = [
  "01-Gelen Belgeler",
  "02-Beyanname",
  "03-Faturalar",
  "04-Banka",
  "05-Personel",
  "06-Resmi Evrak",
  "99-Diger"
];

const CLIENT_INFO_FILE_NAME = "Bilgi.txt";

const normalizeForFolder = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

export const buildClientFolderSlug = (name: string, identityNumber?: string | null) => {
  const base = normalizeForFolder(name).slice(0, 60) || "mukellef";
  const suffix = identityNumber?.trim() ? `-${identityNumber.trim()}` : "";
  return `${base}${suffix}`;
};

export const getClientFolderPath = (folderName: string) => {
  const directories = ensureDomizanDirectories();
  return path.join(directories.clients, folderName);
};

export const ensureUniqueClientFolderName = (baseFolderName: string, currentFolderName?: string) => {
  const directories = ensureDomizanDirectories();
  let candidate = baseFolderName;
  let counter = 2;

  while (candidate !== currentFolderName && fs.existsSync(path.join(directories.clients, candidate))) {
    candidate = `${baseFolderName}-${counter}`;
    counter += 1;
  }

  return candidate;
};

export const ensureClientFolderStructure = (folderName: string) => {
  const clientFolderPath = getClientFolderPath(folderName);
  fs.mkdirSync(clientFolderPath, { recursive: true });

  CLIENT_SUBFOLDERS.forEach((subfolder) => {
    fs.mkdirSync(path.join(clientFolderPath, subfolder), { recursive: true });
  });

  return clientFolderPath;
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
  const clientFolderPath = ensureClientFolderStructure(client.folderName);
  const infoFilePath = path.join(clientFolderPath, CLIENT_INFO_FILE_NAME);

  if (options?.onlyIfMissing && fs.existsSync(infoFilePath)) {
    return infoFilePath;
  }

  fs.writeFileSync(infoFilePath, buildClientInfoContent(client), "utf8");
  return infoFilePath;
};

export const openClientFolderPath = async (folderName: string) => {
  const folderPath = ensureClientFolderStructure(folderName);
  const result = await shell.openPath(folderPath);

  return {
    opened: result.length === 0,
    error: result.length === 0 ? null : result
  };
};
