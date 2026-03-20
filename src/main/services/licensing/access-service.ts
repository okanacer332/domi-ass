import { desc, eq } from "drizzle-orm";

import type {
  AccessSnapshot,
  InstallationSnapshot,
  OnboardingSnapshot,
  StoredLicenseState,
  TrialSnapshot,
  TrialStatus
} from "../../../shared/contracts";
import { getDatabase, persistDatabase } from "../../database/connection";
import { trialStateTable } from "../../database/schema";
import { getWorkspaceProfile } from "../onboarding/workspace-service";
import { ensureInstallationBinding } from "./device-binding";
import { getStoredLicenseState } from "./license-store";
import { readSharedAccessState, syncSharedLicenseState, syncSharedTrialState } from "./shared-access-state";

const TRIAL_LENGTH_DAYS = 7;
const MS_IN_HOUR = 60 * 60 * 1000;
const MS_IN_DAY = 24 * MS_IN_HOUR;

const getLicenseUsability = async () => {
  const storedLicense = await getStoredLicenseState();

  if (!storedLicense) {
    return {
      usable: false,
      license: null
    };
  }

  const isExpired =
    Boolean(storedLicense.expiresAt) &&
    new Date(storedLicense.expiresAt as string).getTime() <= Date.now();
  const usable = storedLicense.licenseStatus === "active" && !isExpired;

  return {
    usable,
    license: storedLicense
  };
};

const getTrialRow = async () => {
  const db = getDatabase();
  const [row] = await db.select().from(trialStateTable).orderBy(desc(trialStateTable.id)).limit(1);
  return row;
};

const calculateTrialSnapshot = (
  row:
    | typeof trialStateTable.$inferSelect
    | {
        status: string;
        startedAt: string | null;
        expiresAt: string | null;
        convertedAt: string | null;
      }
    | undefined
): TrialSnapshot => {
  if (!row) {
    return {
      status: "not_started",
      startedAt: null,
      expiresAt: null,
      convertedAt: null,
      daysLeft: 0,
      hoursLeft: 0
    };
  }

  const now = Date.now();
  const expiresAtTime = row.expiresAt ? new Date(row.expiresAt).getTime() : null;
  const msLeft = expiresAtTime ? Math.max(0, expiresAtTime - now) : 0;
  const isExpired = row.status === "active" && expiresAtTime !== null && msLeft === 0;
  const status: TrialStatus = isExpired ? "expired" : (row.status as TrialStatus);

  return {
    status,
    startedAt: row.startedAt ?? null,
    expiresAt: row.expiresAt ?? null,
    convertedAt: row.convertedAt ?? null,
    daysLeft: Math.ceil(msLeft / MS_IN_DAY),
    hoursLeft: Math.ceil(msLeft / MS_IN_HOUR)
  };
};

const resolveEffectiveTrial = async (installation: InstallationSnapshot) => {
  const localRow = await getTrialRow();
  const sharedState = readSharedAccessState(installation.installationId);
  const localTrial = calculateTrialSnapshot(localRow);
  const sharedTrial = calculateTrialSnapshot(sharedState.trial);

  if (localTrial.status === "not_started" && sharedTrial.status !== "not_started") {
    return {
      row: localRow,
      snapshot: sharedTrial
    };
  }

  return {
    row: localRow,
    snapshot: localTrial
  };
};

const persistExpiredTrialIfNeeded = async (
  row: typeof trialStateTable.$inferSelect | undefined,
  installation: InstallationSnapshot
) => {
  if (!row || row.status !== "active" || !row.expiresAt) {
    return;
  }

  const expiresAtTime = new Date(row.expiresAt).getTime();
  if (Number.isNaN(expiresAtTime) || expiresAtTime > Date.now()) {
    return;
  }

  const db = getDatabase();
  const updatedAt = new Date().toISOString();
  await db
    .update(trialStateTable)
    .set({
      status: "expired",
      updatedAt
    })
    .where(eq(trialStateTable.id, row.id));
  persistDatabase();

  syncSharedTrialState(installation.installationId, {
    status: "expired",
    startedAt: row.startedAt ?? null,
    expiresAt: row.expiresAt ?? null,
    convertedAt: row.convertedAt ?? null
  });
};

const convertTrialIfLicensed = async (
  row: typeof trialStateTable.$inferSelect | undefined,
  installation: InstallationSnapshot,
  usableLicense: StoredLicenseState | null
) => {
  if (!row || !usableLicense || row.status !== "active") {
    return row;
  }

  const db = getDatabase();
  const now = new Date().toISOString();
  await db
    .update(trialStateTable)
    .set({
      status: "converted",
      convertedAt: row.convertedAt ?? now,
      updatedAt: now
    })
    .where(eq(trialStateTable.id, row.id));
  persistDatabase();

  syncSharedTrialState(installation.installationId, {
    status: "converted",
    startedAt: row.startedAt ?? null,
    expiresAt: row.expiresAt ?? null,
    convertedAt: row.convertedAt ?? now
  });

  syncSharedLicenseState({
    installationId: installation.installationId,
    licenseKey: usableLicense.licenseKey,
    status: usableLicense.licenseStatus,
    activatedAt: usableLicense.activatedAt,
    validatedAt: usableLicense.validatedAt
  });

  return getTrialRow();
};

export const deriveOnboardingSnapshot = ({
  workspaceCompleted,
  access
}: {
  workspaceCompleted: boolean;
  access: AccessSnapshot;
}): OnboardingSnapshot => {
  if (!workspaceCompleted) {
    return {
      isComplete: false,
      recommendedStep: "welcome"
    };
  }

  if (!access.canUseApp) {
    return {
      isComplete: true,
      recommendedStep: access.canStartTrial ? "trial" : "locked"
    };
  }

  return {
    isComplete: true,
    recommendedStep: "trial"
  };
};

export const startTrial = async (): Promise<AccessSnapshot> => {
  const installation = await ensureInstallationBinding();
  if (installation.bindingStatus === "mismatch") {
    throw new Error("Bu kurulum farklı bir cihaza kopyalanmış görünüyor. Deneme bu cihazda başlatılamaz.");
  }

  const workspace = await getWorkspaceProfile();
  if (!workspace?.onboardingCompletedAt) {
    throw new Error("Denemeyi başlatmadan önce onboarding tamamlanmalıdır.");
  }

  const sharedState = readSharedAccessState(installation.installationId);
  if (sharedState.trial.status !== "not_started") {
    throw new Error("Bu makine için deneme daha önce başlatılmış.");
  }

  const existing = await getTrialRow();
  if (existing && existing.status !== "not_started") {
    throw new Error("Bu kurulum için deneme daha önce başlatılmış.");
  }

  const now = new Date();
  const startedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + TRIAL_LENGTH_DAYS * MS_IN_DAY).toISOString();
  const db = getDatabase();

  if (!existing) {
    await db.insert(trialStateTable).values({
      status: "active",
      startedAt,
      expiresAt,
      convertedAt: null,
      createdAt: startedAt,
      updatedAt: startedAt
    });
  } else {
    await db
      .update(trialStateTable)
      .set({
        status: "active",
        startedAt,
        expiresAt,
        convertedAt: null,
        updatedAt: startedAt
      })
      .where(eq(trialStateTable.id, existing.id));
  }

  persistDatabase();
  syncSharedTrialState(installation.installationId, {
    status: "active",
    startedAt,
    expiresAt,
    convertedAt: null
  });

  return getAccessSnapshot();
};

export const getAccessSnapshot = async (): Promise<AccessSnapshot> => {
  const installation = await ensureInstallationBinding();
  const { usable: hasUsableLocalLicense, license } = await getLicenseUsability();
  const sharedState = readSharedAccessState(installation.installationId);
  const sharedLicenseUsable = sharedState.license.status === "active";

  const initialTrial = await resolveEffectiveTrial(installation);
  await persistExpiredTrialIfNeeded(initialTrial.row, installation);
  const normalizedTrialRow = await convertTrialIfLicensed(
    await getTrialRow(),
    installation,
    hasUsableLocalLicense ? license : null
  );
  const finalSharedState = readSharedAccessState(installation.installationId);
  const trial =
    normalizedTrialRow || initialTrial.snapshot.status === "not_started"
      ? calculateTrialSnapshot(normalizedTrialRow ?? finalSharedState.trial)
      : initialTrial.snapshot;
  const effectiveHasLicense = hasUsableLocalLicense || sharedLicenseUsable;

  if (installation.bindingStatus === "mismatch") {
    return {
      mode: "blocked",
      canUseApp: false,
      reason: "Bu kurulum farklı bir makinede açılmış görünüyor. Kopyalanmış kullanım engellendi.",
      requiresPurchase: false,
      canStartTrial: false,
      installation,
      trial,
      license
    };
  }

  if (effectiveHasLicense) {
    return {
      mode: "licensed",
      canUseApp: true,
      reason: null,
      requiresPurchase: false,
      canStartTrial: false,
      installation,
      trial,
      license
    };
  }

  if (trial.status === "active") {
    return {
      mode: "trial",
      canUseApp: true,
      reason: null,
      requiresPurchase: false,
      canStartTrial: false,
      installation,
      trial,
      license
    };
  }

  if (trial.status === "expired") {
    return {
      mode: "blocked",
      canUseApp: false,
      reason: "7 günlük deneme süresi doldu. Devam etmek için lisans etkinleştirilmelidir.",
      requiresPurchase: true,
      canStartTrial: false,
      installation,
      trial,
      license
    };
  }

  return {
    mode: "blocked",
    canUseApp: false,
    reason: "Deneme henüz başlatılmadı.",
    requiresPurchase: false,
    canStartTrial: finalSharedState.trial.status === "not_started",
    installation,
    trial,
    license
  };
};

export const getOnboardingSnapshot = async (): Promise<OnboardingSnapshot> => {
  const workspace = await getWorkspaceProfile();
  const access = await getAccessSnapshot();

  return deriveOnboardingSnapshot({
    workspaceCompleted: Boolean(workspace?.onboardingCompletedAt),
    access
  });
};
