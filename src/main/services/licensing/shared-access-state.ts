import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { TrialStatus } from "../../../shared/contracts";
import { getSharedSecurityDirectory } from "./device-binding";

type SharedTrialState = {
  status: TrialStatus;
  startedAt: string | null;
  expiresAt: string | null;
  convertedAt: string | null;
};

type SharedLicenseState = {
  keyHash: string | null;
  status: string | null;
  activatedAt: string | null;
  validatedAt: string | null;
};

export type SharedAccessState = {
  installationId: string;
  version: number;
  trial: SharedTrialState;
  license: SharedLicenseState;
  createdAt: string;
  updatedAt: string;
};

const SHARED_ACCESS_FILE_NAME = "installation-access.json";

const getSharedAccessFilePath = () =>
  path.join(getSharedSecurityDirectory(), SHARED_ACCESS_FILE_NAME);

const buildDefaultState = (installationId: string): SharedAccessState => {
  const now = new Date().toISOString();

  return {
    installationId,
    version: 1,
    trial: {
      status: "not_started",
      startedAt: null,
      expiresAt: null,
      convertedAt: null
    },
    license: {
      keyHash: null,
      status: null,
      activatedAt: null,
      validatedAt: null
    },
    createdAt: now,
    updatedAt: now
  };
};

const ensureDirectory = () => {
  fs.mkdirSync(getSharedSecurityDirectory(), { recursive: true });
};

const normalizeState = (
  installationId: string,
  value: Partial<SharedAccessState> | null | undefined
): SharedAccessState => {
  const fallback = buildDefaultState(installationId);

  if (!value || value.installationId !== installationId) {
    return fallback;
  }

  return {
    installationId,
    version: 1,
    trial: {
      status:
        value.trial?.status === "active" ||
        value.trial?.status === "expired" ||
        value.trial?.status === "converted"
          ? value.trial.status
          : "not_started",
      startedAt: value.trial?.startedAt ?? null,
      expiresAt: value.trial?.expiresAt ?? null,
      convertedAt: value.trial?.convertedAt ?? null
    },
    license: {
      keyHash: value.license?.keyHash ?? null,
      status: value.license?.status ?? null,
      activatedAt: value.license?.activatedAt ?? null,
      validatedAt: value.license?.validatedAt ?? null
    },
    createdAt: value.createdAt ?? fallback.createdAt,
    updatedAt: value.updatedAt ?? fallback.updatedAt
  };
};

export const readSharedAccessState = (installationId: string): SharedAccessState => {
  ensureDirectory();
  const filePath = getSharedAccessFilePath();

  if (!fs.existsSync(filePath)) {
    return buildDefaultState(installationId);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<SharedAccessState>;
    return normalizeState(installationId, parsed);
  } catch {
    return buildDefaultState(installationId);
  }
};

export const writeSharedAccessState = (
  installationId: string,
  updater: (current: SharedAccessState) => SharedAccessState
) => {
  ensureDirectory();
  const filePath = getSharedAccessFilePath();
  const current = readSharedAccessState(installationId);
  const next = normalizeState(installationId, updater(current));
  const normalizedNext = {
    ...next,
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(filePath, JSON.stringify(normalizedNext, null, 2), "utf8");
  return normalizedNext;
};

export const syncSharedTrialState = (
  installationId: string,
  trial: SharedTrialState
) =>
  writeSharedAccessState(installationId, (current) => ({
    ...current,
    trial: {
      status: trial.status,
      startedAt: trial.startedAt,
      expiresAt: trial.expiresAt,
      convertedAt: trial.convertedAt
    }
  }));

export const syncSharedLicenseState = ({
  installationId,
  licenseKey,
  status,
  activatedAt,
  validatedAt
}: {
  installationId: string;
  licenseKey: string;
  status: string;
  activatedAt: string | null;
  validatedAt: string | null;
}) =>
  writeSharedAccessState(installationId, (current) => ({
    ...current,
    license: {
      keyHash: createHash("sha256").update(licenseKey).digest("hex"),
      status,
      activatedAt,
      validatedAt
    }
  }));
