import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app } from "electron";
import { desc, eq } from "drizzle-orm";

import type { BindingStatus, InstallationSnapshot } from "../../../shared/contracts";
import { getDatabase, persistDatabase } from "../../database/connection";
import { installationStateTable } from "../../database/schema";

type SharedBindingRecord = {
  installationId: string;
  secret: string;
  bindingHash: string | null;
  createdAt: string;
  version: number;
};

const SHARED_BINDING_FILE_NAME = "machine-binding.json";

export const getSharedSecurityDirectory = () => {
  if (process.platform === "win32") {
    const programData = process.env.PROGRAMDATA || "C:\\ProgramData";
    return path.join(programData, "Domizan", "Security");
  }

  if (process.platform === "darwin") {
    return path.join("/Users/Shared", "Domizan", "Security");
  }

  return path.join(app.getPath("userData"), "security-shared");
};

export const getSharedBindingFilePath = () =>
  path.join(getSharedSecurityDirectory(), SHARED_BINDING_FILE_NAME);

const ensureSharedBindingRecord = (): SharedBindingRecord => {
  const directoryPath = getSharedSecurityDirectory();
  const filePath = getSharedBindingFilePath();
  fs.mkdirSync(directoryPath, { recursive: true });

  if (fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as SharedBindingRecord;

      if (parsed.installationId && parsed.secret) {
        return {
          installationId: parsed.installationId,
          secret: parsed.secret,
          bindingHash: parsed.bindingHash ?? null,
          createdAt: parsed.createdAt ?? new Date().toISOString(),
          version: parsed.version ?? 1
        };
      }
    } catch {
      // Corrupted file will be recreated below.
    }
  }

  const record: SharedBindingRecord = {
    installationId: randomUUID(),
    secret: randomBytes(24).toString("hex"),
    bindingHash: null,
    createdAt: new Date().toISOString(),
    version: 1
  };

  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), "utf8");
  return record;
};

const readWindowsMachineId = () => {
  const output = execFileSync(
    "reg",
    ["query", "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"],
    { encoding: "utf8" }
  );

  const line = output
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.includes("MachineGuid"));

  if (!line) {
    return null;
  }

  const parts = line.split(/\s+/);
  return parts[parts.length - 1] || null;
};

const readMacMachineId = () => {
  const output = execFileSync("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"], {
    encoding: "utf8"
  });
  const match = output.match(/"IOPlatformUUID"\s=\s"([^"]+)"/);
  return match?.[1] ?? null;
};

const readLinuxMachineId = () => {
  const candidates = ["/etc/machine-id", "/var/lib/dbus/machine-id"];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const value = fs.readFileSync(candidate, "utf8").trim();
      if (value) {
        return value;
      }
    }
  }

  return null;
};

const getMachineIdentifier = () => {
  try {
    if (process.platform === "win32") {
      return {
        value: readWindowsMachineId(),
        source: "MachineGuid"
      };
    }

    if (process.platform === "darwin") {
      return {
        value: readMacMachineId(),
        source: "IOPlatformUUID"
      };
    }

    return {
      value: readLinuxMachineId(),
      source: "machine-id"
    };
  } catch {
    return {
      value: null,
      source: "unavailable"
    };
  }
};

const buildBindingHash = (machineIdentifier: string, installationId: string, secret: string) =>
  createHash("sha256")
    .update(`${machineIdentifier}:${installationId}:${secret}`)
    .digest("hex");

const writeSharedBindingRecord = (record: SharedBindingRecord) => {
  fs.writeFileSync(getSharedBindingFilePath(), JSON.stringify(record, null, 2), "utf8");
};

const mapInstallationSnapshot = ({
  installationId,
  deviceLabel,
  platform,
  bindingStatus,
  sharedBindingPath,
  firstBoundAt,
  lastSeenAt
}: {
  installationId: string;
  deviceLabel: string;
  platform: string;
  bindingStatus: BindingStatus;
  sharedBindingPath: string;
  firstBoundAt: string | null;
  lastSeenAt: string | null;
}): InstallationSnapshot => ({
  installationId,
  deviceLabel,
  platform,
  bindingStatus,
  sharedBindingPath,
  firstBoundAt,
  lastSeenAt
});

export const ensureInstallationBinding = async (): Promise<InstallationSnapshot> => {
  const db = getDatabase();
  const now = new Date().toISOString();
  const sharedBinding = ensureSharedBindingRecord();
  const sharedBindingPath = getSharedBindingFilePath();
  const machineIdentifier = getMachineIdentifier();
  const bindingHash = machineIdentifier.value
    ? buildBindingHash(machineIdentifier.value, sharedBinding.installationId, sharedBinding.secret)
    : null;
  const sharedBindingMismatch =
    Boolean(bindingHash) &&
    Boolean(sharedBinding.bindingHash) &&
    sharedBinding.bindingHash !== bindingHash;
  const desiredBindingStatus: BindingStatus = sharedBindingMismatch
    ? "mismatch"
    : bindingHash
      ? "bound"
      : "unavailable";
  const deviceLabel = os.hostname();

  if (!sharedBindingMismatch && bindingHash && sharedBinding.bindingHash !== bindingHash) {
    writeSharedBindingRecord({
      ...sharedBinding,
      bindingHash
    });
  }

  const [existing] = await db
    .select()
    .from(installationStateTable)
    .orderBy(desc(installationStateTable.id))
    .limit(1);

  if (!existing) {
    await db.insert(installationStateTable).values({
      installationId: sharedBinding.installationId,
      deviceLabel,
      platform: process.platform,
      bindingHash,
      bindingStatus: desiredBindingStatus,
      sharedBindingPath,
      firstBoundAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now
    });
    persistDatabase();

    return mapInstallationSnapshot({
      installationId: sharedBinding.installationId,
      deviceLabel,
      platform: process.platform,
      bindingStatus: desiredBindingStatus,
      sharedBindingPath,
      firstBoundAt: now,
      lastSeenAt: now
    });
  }

  const databaseMismatch =
    existing.installationId !== sharedBinding.installationId ||
    (Boolean(existing.bindingHash) && Boolean(bindingHash) && existing.bindingHash !== bindingHash);
  const effectiveBindingStatus: BindingStatus =
    sharedBindingMismatch || databaseMismatch ? "mismatch" : desiredBindingStatus;

  await db
    .update(installationStateTable)
    .set({
      deviceLabel,
      platform: process.platform,
      bindingHash: bindingHash ?? existing.bindingHash,
      bindingStatus: effectiveBindingStatus,
      sharedBindingPath,
      lastSeenAt: now,
      updatedAt: now
    })
    .where(eq(installationStateTable.id, existing.id));

  persistDatabase();

  return mapInstallationSnapshot({
    installationId: existing.installationId,
    deviceLabel,
    platform: process.platform,
    bindingStatus: effectiveBindingStatus,
    sharedBindingPath,
    firstBoundAt: existing.firstBoundAt,
    lastSeenAt: now
  });
};
