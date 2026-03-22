import crypto = require("node:crypto");
import fs = require("node:fs/promises");
import path = require("node:path");

type OrgStatus = "ACTIVE" | "SUSPENDED" | "CANCELLED";
type PackageType = "TRIAL" | "PREMIUM";
type Severity = "INFO" | "WARNING" | "ERROR";

export type DesktopSyncPayload = {
  officeName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  accessMode: "trial" | "licensed" | "blocked";
  license: {
    licenseKey: string | null;
    licenseStatus: string | null;
    expiresAt: string | null;
  };
  installation: {
    installationId: string;
    deviceLabel: string;
    platform: string;
  };
  app: {
    version: string;
    osRelease: string;
    arch: string;
    hostname: string;
    electronVersion: string;
    nodeVersion: string;
  };
  summary: {
    clientCount: number;
    waitingDocumentCount: number;
    totalDocumentCount: number;
    pendingReminderCount: number;
    telegramReady: boolean;
    geminiReady: boolean;
  };
  inbox: {
    queuedCount: number;
    analyzingCount: number;
    readyCount: number;
    needsReviewCount: number;
    failedCount: number;
  };
  planner: {
    overdueReminderCount: number;
    todayItemCount: number;
    focusPhaseLabel: string;
    nextDeadlineTitle: string | null;
    nextDeadlineDate: string | null;
  };
  clients: Array<{
    id: number;
    name: string;
    identityNumber: string | null;
    status: "active" | "passive";
  }>;
  syncedAt: string;
};

type StoredOrganization = {
  id: string;
  companyCode: string;
  companyName: string;
  domizanKey: string;
  email: string | null;
  phone: string | null;
  packageType: PackageType;
  status: OrgStatus;
  expiresAt: string;
  activatedAt: string | null;
  tokenLimit: number;
  maxDevices: number;
  telegramBotToken: string | null;
  telegramBotUsername: string | null;
  telegramOwnerChatId: string | null;
  telegramOwnerDisplayName: string | null;
  telegramLastMessageAt: string | null;
  geminiApiKey: string | null;
  aiRequestCount: number;
  aiTokensIn: number;
  aiTokensOut: number;
  latestDesktopState: DesktopSyncPayload | null;
  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
};

type StoredUser = {
  id: string;
  organizationId: string;
  userName: string | null;
  email: string;
  isOwner: boolean;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  lastActiveAt: string | null;
  deviceCount: number;
  createdAt: string;
  updatedAt: string;
};

type StoredDevice = {
  id: string;
  organizationId: string;
  deviceName: string;
  fingerprint: string;
  osType: string | null;
  osVersion: string | null;
  status: "ACTIVE" | "BLOCKED";
  lastActiveAt: string | null;
  lastSeenAt: string | null;
  currentIp: string | null;
  activationIp: string | null;
  trustScore: number;
  isBlocked: boolean;
  blockedReason: string | null;
  suspiciousActivityCount: number;
  isMaster: boolean;
  cpuModel: string | null;
  cpuCores: number | null;
  ramGb: number | null;
  hostname: string | null;
  screenResolution: string | null;
  deviceUserName: string | null;
  deviceUserEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoredDeviceLog = {
  id: string;
  deviceId: string;
  activityType: string;
  ipAddress: string | null;
  suspicious: boolean;
  trustScoreDelta: number;
  details: string | null;
  createdAt: string;
};

type StoredAuditLog = {
  id: string;
  action: string;
  severity: Severity;
  performedBy: string | null;
  details: string | null;
  organizationId: string | null;
  createdAt: string;
};

type StoredUsageLog = {
  id: string;
  organizationId: string;
  channel: "desktop" | "telegram";
  promptType: string;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  success: boolean;
  latencyMs: number;
  createdAt: string;
};

type AdminState = {
  organizations: StoredOrganization[];
  users: StoredUser[];
  devices: StoredDevice[];
  deviceLogs: StoredDeviceLog[];
  auditLogs: StoredAuditLog[];
  usageLogs: StoredUsageLog[];
  settings: {
    geminiCoordinatorKey: string;
  };
};

const STORE_DIRECTORY = path.resolve(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIRECTORY, "admin-agent-store.json");

const defaultState = (): AdminState => ({
  organizations: [],
  users: [],
  devices: [],
  deviceLogs: [],
  auditLogs: [],
  usageLogs: [],
  settings: {
    geminiCoordinatorKey: ""
  }
});

const ensureStoreDirectory = async () => {
  await fs.mkdir(STORE_DIRECTORY, { recursive: true });
};

const normalizeText = (value: string | null | undefined) =>
  value?.trim().toLocaleLowerCase("tr-TR") ?? "";

const slugify = (value: string) =>
  value
    .toLocaleUpperCase("tr-TR")
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6) || "DOMI";

const makeHash = (value: string) => crypto.createHash("sha256").update(value).digest("hex").slice(0, 8);

const buildOrganizationIdentity = (payload: DesktopSyncPayload) => {
  const baseIdentity =
    payload.license.licenseKey ||
    payload.ownerEmail ||
    payload.officeName ||
    payload.installation.installationId;
  const normalized = baseIdentity.trim();

  return {
    id: `org_${makeHash(normalized)}`,
    companyCode: `${slugify(payload.officeName || "DOMIZAN")}${makeHash(normalized).slice(0, 4)}`,
    domizanKey: payload.license.licenseKey || `LOCAL-${makeHash(payload.installation.installationId)}`,
  };
};

const readState = async (): Promise<AdminState> => {
  await ensureStoreDirectory();

  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdminState>;
    return {
      ...defaultState(),
      ...parsed,
      settings: {
        ...defaultState().settings,
        ...(parsed.settings ?? {})
      }
    };
  } catch {
    const state = defaultState();
    await fs.writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
    return state;
  }
};

const writeState = async (state: AdminState) => {
  await ensureStoreDirectory();
  await fs.writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
};

const appendAuditLog = (state: AdminState, entry: Omit<StoredAuditLog, "id" | "createdAt">) => {
  state.auditLogs.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry
  });

  state.auditLogs = state.auditLogs.slice(0, 500);
};

const appendDeviceLog = (
  state: AdminState,
  entry: Omit<StoredDeviceLog, "id" | "createdAt">
) => {
  state.deviceLogs.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry
  });

  state.deviceLogs = state.deviceLogs.slice(0, 1000);
};

const ensureOwnerUser = (state: AdminState, organization: StoredOrganization, payload: DesktopSyncPayload) => {
  const ownerEmail =
    payload.ownerEmail?.trim().toLocaleLowerCase("tr-TR") ||
    `${organization.companyCode.toLocaleLowerCase("tr-TR")}@domizan.local`;
  const now = new Date().toISOString();
  const existing = state.users.find(
    (user) => user.organizationId === organization.id && normalizeText(user.email) === ownerEmail
  );

  if (existing) {
    existing.userName = payload.ownerName ?? existing.userName;
    existing.lastActiveAt = payload.syncedAt;
    existing.deviceCount = state.devices.filter(
      (device) => device.organizationId === organization.id && normalizeText(device.deviceUserEmail) === ownerEmail
    ).length;
    existing.updatedAt = now;
    return existing;
  }

  const created: StoredUser = {
    id: crypto.randomUUID(),
    organizationId: organization.id,
    userName: payload.ownerName,
    email: ownerEmail,
    isOwner: true,
    status: "ACTIVE",
    lastActiveAt: payload.syncedAt,
    deviceCount: 0,
    createdAt: now,
    updatedAt: now
  };

  state.users.push(created);
  return created;
};

const ensureDevice = (
  state: AdminState,
  organization: StoredOrganization,
  ownerUser: StoredUser,
  payload: DesktopSyncPayload
) => {
  const now = new Date().toISOString();
  const existing = state.devices.find(
    (device) => device.organizationId === organization.id && device.fingerprint === payload.installation.installationId
  );

  const base = {
    organizationId: organization.id,
    deviceName: payload.installation.deviceLabel || payload.app.hostname || "Domizan Desktop",
    fingerprint: payload.installation.installationId,
    osType: payload.installation.platform,
    osVersion: payload.app.osRelease,
    lastActiveAt: payload.syncedAt,
    lastSeenAt: payload.syncedAt,
    currentIp: null,
    activationIp: null,
    trustScore: existing?.trustScore ?? 100,
    isBlocked: existing?.isBlocked ?? false,
    blockedReason: existing?.blockedReason ?? null,
    suspiciousActivityCount: existing?.suspiciousActivityCount ?? 0,
    isMaster: true,
    cpuModel: payload.app.arch,
    cpuCores: null,
    ramGb: null,
    hostname: payload.app.hostname,
    screenResolution: null,
    deviceUserName: ownerUser.userName,
    deviceUserEmail: ownerUser.email,
    updatedAt: now,
    status: existing?.isBlocked ? "BLOCKED" : "ACTIVE"
  } as const;

  if (existing) {
    Object.assign(existing, base);
    return existing;
  }

  const created: StoredDevice = {
    id: crypto.randomUUID(),
    createdAt: now,
    ...base
  };

  state.devices.push(created);
  return created;
};

export const syncOrganizationFromDesktop = async (payload: DesktopSyncPayload) => {
  const state = await readState();
  const now = new Date().toISOString();
  const identity = buildOrganizationIdentity(payload);
  const existing = state.organizations.find((organization) => organization.id === identity.id);

  const packageType: PackageType =
    payload.accessMode === "licensed" && payload.license.licenseKey ? "PREMIUM" : "TRIAL";
  const expiresAt =
    payload.license.expiresAt ||
    new Date(Date.now() + (payload.accessMode === "trial" ? 7 : 30) * 86400000).toISOString();

  const organization: StoredOrganization =
    existing ??
    ({
      id: identity.id,
      companyCode: identity.companyCode,
      companyName: payload.officeName || "Adsiz Ofis",
      domizanKey: identity.domizanKey,
      email: payload.ownerEmail,
      phone: null,
      packageType,
      status: "ACTIVE",
      expiresAt,
      activatedAt: now,
      tokenLimit: packageType === "PREMIUM" ? 500000 : 10000,
      maxDevices: 5,
      telegramBotToken: null,
      telegramBotUsername: null,
      telegramOwnerChatId: null,
      telegramOwnerDisplayName: null,
      telegramLastMessageAt: null,
      geminiApiKey: null,
      aiRequestCount: 0,
      aiTokensIn: 0,
      aiTokensOut: 0,
      latestDesktopState: null,
      createdAt: now,
      updatedAt: now,
      lastSyncAt: null
    });

  organization.companyName = payload.officeName || organization.companyName;
  organization.email = payload.ownerEmail || organization.email;
  organization.packageType = packageType;
  organization.expiresAt = expiresAt;
  organization.status = payload.accessMode === "blocked" ? "SUSPENDED" : "ACTIVE";
  organization.latestDesktopState = payload;
  organization.updatedAt = now;
  organization.lastSyncAt = payload.syncedAt;

  if (!existing) {
    state.organizations.push(organization);
  }

  const ownerUser = ensureOwnerUser(state, organization, payload);
  const device = ensureDevice(state, organization, ownerUser, payload);
  ownerUser.deviceCount = state.devices.filter(
    (entry) => entry.organizationId === organization.id && normalizeText(entry.deviceUserEmail) === normalizeText(ownerUser.email)
  ).length;
  ownerUser.updatedAt = now;

  appendDeviceLog(state, {
    deviceId: device.id,
    activityType: "desktop.sync",
    ipAddress: null,
    suspicious: false,
    trustScoreDelta: 0,
    details: `Desktop sync alindi. Surum ${payload.app.version}`
  });

  appendAuditLog(state, {
    action: "desktop.sync",
    severity: "INFO",
    performedBy: payload.ownerName ?? payload.ownerEmail ?? "desktop",
    details: `${organization.companyName} ofisinden desktop sync alindi.`,
    organizationId: organization.id
  });

  await writeState(state);

  return {
    organizationId: organization.id,
    companyCode: organization.companyCode,
    companyName: organization.companyName,
    telegram: {
      enabled: Boolean(organization.telegramBotToken),
      botToken: organization.telegramBotToken,
      botUsername: organization.telegramBotUsername,
      ownerChatId: organization.telegramOwnerChatId,
      ownerDisplayName: organization.telegramOwnerDisplayName
    },
    gemini: {
      organizationKey: organization.geminiApiKey,
      fallbackKey: state.settings.geminiCoordinatorKey || null
    }
  };
};

export const getDesktopAgentConfig = async (licenseKey: string | null, installationId: string) => {
  const state = await readState();
  const organization = state.organizations.find(
    (entry) =>
      (licenseKey && normalizeText(entry.domizanKey) === normalizeText(licenseKey)) ||
      entry.latestDesktopState?.installation.installationId === installationId
  );

  if (!organization) {
    return null;
  }

  return {
    organizationId: organization.id,
    companyName: organization.companyName,
    telegram: {
      enabled: Boolean(organization.telegramBotToken),
      botToken: organization.telegramBotToken,
      botUsername: organization.telegramBotUsername,
      ownerChatId: organization.telegramOwnerChatId,
      ownerDisplayName: organization.telegramOwnerDisplayName
    },
    gemini: {
      organizationKey: organization.geminiApiKey,
      fallbackKey: state.settings.geminiCoordinatorKey || null
    }
  };
};

export const claimTelegramOwner = async (input: {
  organizationId: string;
  chatId: string;
  displayName: string | null;
}) => {
  const state = await readState();
  const organization = state.organizations.find((entry) => entry.id === input.organizationId);

  if (!organization) {
    throw new Error("Organizasyon bulunamadi.");
  }

  organization.telegramOwnerChatId = input.chatId;
  organization.telegramOwnerDisplayName = input.displayName;
  organization.telegramLastMessageAt = new Date().toISOString();
  organization.updatedAt = new Date().toISOString();

  appendAuditLog(state, {
    action: "telegram.owner_claimed",
    severity: "INFO",
    performedBy: input.displayName ?? "telegram-owner",
    details: `${organization.companyName} icin Telegram owner baglandi.`,
    organizationId: organization.id
  });

  await writeState(state);

  return {
    success: true,
    ownerChatId: organization.telegramOwnerChatId
  };
};

export const registerAgentUsage = async (input: {
  organizationId: string;
  channel: "desktop" | "telegram";
  promptType: string;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  success: boolean;
  latencyMs: number;
}) => {
  const state = await readState();
  const organization = state.organizations.find((entry) => entry.id === input.organizationId);

  if (!organization) {
    return { success: false };
  }

  state.usageLogs.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input
  });
  state.usageLogs = state.usageLogs.slice(0, 1000);

  organization.aiRequestCount += 1;
  organization.aiTokensIn += Math.max(0, input.tokensIn);
  organization.aiTokensOut += Math.max(0, input.tokensOut);
  organization.updatedAt = new Date().toISOString();

  await writeState(state);
  return { success: true };
};

export const registerTelegramActivity = async (input: {
  organizationId: string;
  displayName: string | null;
  summary: string;
}) => {
  const state = await readState();
  const organization = state.organizations.find((entry) => entry.id === input.organizationId);

  if (!organization) {
    return { success: false };
  }

  organization.telegramLastMessageAt = new Date().toISOString();
  organization.updatedAt = new Date().toISOString();

  appendAuditLog(state, {
    action: "telegram.message",
    severity: "INFO",
    performedBy: input.displayName ?? "telegram",
    details: input.summary,
    organizationId: input.organizationId
  });

  await writeState(state);
  return { success: true };
};

export const listOrganizations = async () => {
  const state = await readState();

  return state.organizations
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((organization) => {
      const userCount = state.users.filter((user) => user.organizationId === organization.id).length;
      const deviceCount = state.devices.filter((device) => device.organizationId === organization.id).length;

      return {
        id: organization.id,
        companyCode: organization.companyCode,
        companyName: organization.companyName,
        domizanKey: organization.domizanKey,
        email: organization.email,
        phone: organization.phone,
        packageType: organization.packageType,
        status: organization.status,
        expiresAt: organization.expiresAt,
        activatedAt: organization.activatedAt,
        tokenLimit: organization.tokenLimit,
        tokensUsed: organization.aiTokensIn + organization.aiTokensOut,
        maxDevices: organization.maxDevices,
        userCount,
        deviceCount,
        telegramBotToken: organization.telegramBotToken,
        telegramBotUsername: organization.telegramBotUsername,
        telegramOwnerChatId: organization.telegramOwnerChatId,
        telegramOwnerDisplayName: organization.telegramOwnerDisplayName,
        telegramLastMessageAt: organization.telegramLastMessageAt,
        geminiApiKey: organization.geminiApiKey,
        latestDesktopState: organization.latestDesktopState,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        lastSyncAt: organization.lastSyncAt
      };
    });
};

export const getOrganization = async (organizationId: string) => {
  const organizations = await listOrganizations();
  return organizations.find((organization) => organization.id === organizationId) ?? null;
};

export const listOrganizationUsers = async (organizationId: string) => {
  const state = await readState();
  return state.users
    .filter((user) => user.organizationId === organizationId)
    .sort((left, right) => (right.lastActiveAt ?? "").localeCompare(left.lastActiveAt ?? ""));
};

export const listOrganizationDevices = async (organizationId: string) => {
  const state = await readState();
  return state.devices
    .filter((device) => device.organizationId === organizationId)
    .sort((left, right) => (right.lastSeenAt ?? "").localeCompare(left.lastSeenAt ?? ""));
};

export const listAllDevices = async (params?: { search?: string; status?: string }) => {
  const state = await readState();
  const search = normalizeText(params?.search);
  const status = params?.status?.toUpperCase();

  return state.devices
    .filter((device) => {
      if (status === "ACTIVE" && device.isBlocked) {
        return false;
      }

    if (status === "BLOCKED" && !device.isBlocked) {
      return false;
    }

    if (!search) {
      return true;
    }

    const organization = state.organizations.find((entry) => entry.id === device.organizationId);
      return [
        device.deviceName,
        device.hostname,
        device.deviceUserName,
        device.deviceUserEmail,
        device.fingerprint,
        organization?.companyName,
        organization?.companyCode,
        device.currentIp,
        device.activationIp
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(search);
    })
    .map((device) => {
      const organization = state.organizations.find((entry) => entry.id === device.organizationId);

      return {
        ...device,
        companyName: organization?.companyName ?? null,
        companyCode: organization?.companyCode ?? null
      };
    });
};

export const getDevice = async (deviceId: string) => {
  const state = await readState();
  const device = state.devices.find((entry) => entry.id === deviceId) ?? null;
  if (!device) {
    return null;
  }

  const organization = state.organizations.find((entry) => entry.id === device.organizationId);

  return {
    ...device,
    companyName: organization?.companyName ?? null,
    companyCode: organization?.companyCode ?? null
  };
};

export const getDeviceActivity = async (deviceId: string) => {
  const state = await readState();
  return state.deviceLogs
    .filter((entry) => entry.deviceId === deviceId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const updateOrganization = async (
  organizationId: string,
  patch: Partial<Pick<StoredOrganization, "status" | "companyName" | "email">>
) => {
  const state = await readState();
  const organization = state.organizations.find((entry) => entry.id === organizationId);

  if (!organization) {
    throw new Error("Organizasyon bulunamadi.");
  }

  if (patch.status) {
    organization.status = patch.status;
  }

  if (typeof patch.companyName === "string") {
    organization.companyName = patch.companyName;
  }

  if (patch.email !== undefined) {
    organization.email = patch.email;
  }

  organization.updatedAt = new Date().toISOString();
  await writeState(state);
  return organization;
};

export const extendOrganizationLicense = async (organizationId: string, days: number) => {
  const state = await readState();
  const organization = state.organizations.find((entry) => entry.id === organizationId);

  if (!organization) {
    throw new Error("Organizasyon bulunamadi.");
  }

  const nextDate = new Date(organization.expiresAt);
  nextDate.setDate(nextDate.getDate() + days);
  organization.expiresAt = nextDate.toISOString();
  organization.status = nextDate.getTime() > Date.now() ? "ACTIVE" : "SUSPENDED";
  organization.updatedAt = new Date().toISOString();

  appendAuditLog(state, {
    action: "license.adjust_days",
    severity: "INFO",
    performedBy: "admin",
    details: `${organization.companyName} lisansina ${days} gun uygulandi.`,
    organizationId
  });

  await writeState(state);
  return organization;
};

export const updateOrganizationTokenLimit = async (organizationId: string, limit: number) => {
  const state = await readState();
  const organization = state.organizations.find((entry) => entry.id === organizationId);
  if (!organization) {
    throw new Error("Organizasyon bulunamadi.");
  }
  organization.tokenLimit = Math.max(0, limit);
  organization.updatedAt = new Date().toISOString();
  await writeState(state);
  return organization;
};

export const updateOrganizationDeviceLimit = async (organizationId: string, maxDevices: number) => {
  const state = await readState();
  const organization = state.organizations.find((entry) => entry.id === organizationId);
  if (!organization) {
    throw new Error("Organizasyon bulunamadi.");
  }
  organization.maxDevices = Math.max(1, maxDevices);
  organization.updatedAt = new Date().toISOString();
  await writeState(state);
  return organization;
};

export const resetOrganizationTokens = async (organizationId: string) => {
  const state = await readState();
  const organization = state.organizations.find((entry) => entry.id === organizationId);
  if (!organization) {
    throw new Error("Organizasyon bulunamadi.");
  }
  organization.aiRequestCount = 0;
  organization.aiTokensIn = 0;
  organization.aiTokensOut = 0;
  organization.updatedAt = new Date().toISOString();
  await writeState(state);
  return organization;
};

export const setOrganizationTelegramBot = async (
  organizationId: string,
  botToken: string | null,
  botUsername: string | null
) => {
  const state = await readState();
  const organization = state.organizations.find((entry) => entry.id === organizationId);
  if (!organization) {
    throw new Error("Organizasyon bulunamadi.");
  }
  const previousToken = organization.telegramBotToken;
  organization.telegramBotToken = botToken;
  organization.telegramBotUsername = botUsername;
  if (previousToken !== botToken) {
    organization.telegramOwnerChatId = null;
    organization.telegramOwnerDisplayName = null;
    organization.telegramLastMessageAt = null;
  }
  organization.updatedAt = new Date().toISOString();
  await writeState(state);
  return organization;
};

export const setOrganizationGeminiKey = async (organizationId: string, geminiApiKey: string | null) => {
  const state = await readState();
  const organization = state.organizations.find((entry) => entry.id === organizationId);
  if (!organization) {
    throw new Error("Organizasyon bulunamadi.");
  }
  organization.geminiApiKey = geminiApiKey;
  organization.updatedAt = new Date().toISOString();
  await writeState(state);
  return organization;
};

export const revokeOrganization = async (organizationId: string) => {
  const state = await readState();
  const organization = state.organizations.find((entry) => entry.id === organizationId);
  if (!organization) {
    throw new Error("Organizasyon bulunamadi.");
  }
  organization.status = "CANCELLED";
  organization.updatedAt = new Date().toISOString();
  await writeState(state);
  return organization;
};

export const blockDevice = async (deviceId: string, reason: string) => {
  const state = await readState();
  const device = state.devices.find((entry) => entry.id === deviceId);
  if (!device) {
    throw new Error("Cihaz bulunamadi.");
  }
  device.isBlocked = true;
  device.status = "BLOCKED";
  device.blockedReason = reason;
  device.updatedAt = new Date().toISOString();
  appendDeviceLog(state, {
    deviceId: device.id,
    activityType: "device.blocked",
    ipAddress: device.currentIp,
    suspicious: false,
    trustScoreDelta: 0,
    details: reason
  });
  await writeState(state);
  return device;
};

export const unblockDevice = async (deviceId: string) => {
  const state = await readState();
  const device = state.devices.find((entry) => entry.id === deviceId);
  if (!device) {
    throw new Error("Cihaz bulunamadi.");
  }
  device.isBlocked = false;
  device.status = "ACTIVE";
  device.blockedReason = null;
  device.updatedAt = new Date().toISOString();
  appendDeviceLog(state, {
    deviceId: device.id,
    activityType: "device.unblocked",
    ipAddress: device.currentIp,
    suspicious: false,
    trustScoreDelta: 0,
    details: "Cihaz engeli kaldirildi."
  });
  await writeState(state);
  return device;
};

export const removeDevice = async (organizationId: string, deviceId: string) => {
  const state = await readState();
  state.devices = state.devices.filter(
    (device) => !(device.organizationId === organizationId && device.id === deviceId)
  );
  state.deviceLogs = state.deviceLogs.filter((entry) => entry.deviceId !== deviceId);
  await writeState(state);
  return { success: true };
};

export const getOverview = async () => {
  const state = await readState();
  const now = Date.now();
  const organizations = await listOrganizations();
  const expiringOrganizations = organizations
    .filter((organization) => new Date(organization.expiresAt).getTime() >= now)
    .map((organization) => ({
      ...organization,
      daysLeft: Math.ceil((new Date(organization.expiresAt).getTime() - now) / 86400000),
      usagePercent:
        organization.tokenLimit > 0
          ? Math.round((organization.tokensUsed / organization.tokenLimit) * 100)
          : 0
    }))
    .filter((organization) => organization.daysLeft <= 30)
    .sort((left, right) => left.daysLeft - right.daysLeft)
    .slice(0, 8);

  const highUsageOrganizations = organizations
    .map((organization) => ({
      ...organization,
      usagePercent:
        organization.tokenLimit > 0
          ? Math.round((organization.tokensUsed / organization.tokenLimit) * 100)
          : 0
    }))
    .sort((left, right) => (right.usagePercent ?? 0) - (left.usagePercent ?? 0))
    .slice(0, 8);

  const suspiciousDevices = state.devices
    .filter((device) => device.isBlocked || device.trustScore < 80 || device.suspiciousActivityCount > 0)
    .sort((left, right) => {
      if (left.isBlocked !== right.isBlocked) {
        return left.isBlocked ? -1 : 1;
      }

      return right.suspiciousActivityCount - left.suspiciousActivityCount;
    })
    .slice(0, 8)
    .map((device) => {
      const organization = organizations.find((entry) => entry.id === device.organizationId);
      return {
        ...device,
        companyName: organization?.companyName ?? null,
        companyCode: organization?.companyCode ?? null
      };
    });

  const recentAuditLogs = state.auditLogs.slice(0, 12).map((entry) => {
    const organization = organizations.find((item) => item.id === entry.organizationId);
    return {
      ...entry,
      companyName: organization?.companyName ?? null,
      companyCode: organization?.companyCode ?? null
    };
  });

  return {
    stats: {
      totalOrganizations: organizations.length,
      activeOrganizations: organizations.filter((organization) => organization.status === "ACTIVE").length,
      totalUsers: state.users.length,
      totalDevices: state.devices.length,
      totalTokensUsed: state.usageLogs.reduce((total, entry) => total + entry.tokensIn + entry.tokensOut, 0),
      expiringLicenses: expiringOrganizations.length,
      blockedDevices: state.devices.filter((device) => device.isBlocked).length,
      suspiciousDevices: suspiciousDevices.length,
      pendingLeads: 0
    },
    expiringOrganizations,
    highUsageOrganizations,
    suspiciousDevices,
    pendingLeads: [],
    recentAuditLogs
  };
};

export const getAuditLogs = async () => {
  const state = await readState();
  return state.auditLogs;
};

export const getOrganizationUsage = async (organizationId: string) => {
  const state = await readState();
  return state.usageLogs
    .filter((entry) => entry.organizationId === organizationId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 100);
};

export const getSettings = async () => {
  const state = await readState();
  return {
    geminiCoordinatorKey: state.settings.geminiCoordinatorKey
  };
};

export const setGeminiCoordinatorKey = async (geminiCoordinatorKey: string) => {
  const state = await readState();
  state.settings.geminiCoordinatorKey = geminiCoordinatorKey;
  appendAuditLog(state, {
    action: "settings.gemini_coordinator_key_updated",
    severity: "INFO",
    performedBy: "admin",
    details: "Global Gemini anahtari guncellendi.",
    organizationId: null
  });
  await writeState(state);
  return { success: true };
};

export const generateManualOrganization = async (input: {
  companyName: string;
  email?: string;
  packageType: PackageType;
  durationDays: number;
  maxDevices: number;
  telegramBotToken?: string;
  telegramBotUsername?: string;
  geminiApiKey?: string;
}) => {
  const state = await readState();
  const now = new Date();
  const hash = makeHash(`${input.companyName}-${now.toISOString()}-${crypto.randomUUID()}`);
  const organization: StoredOrganization = {
    id: `org_${hash}`,
    companyCode: `${slugify(input.companyName)}${hash.slice(0, 4)}`,
    companyName: input.companyName,
    domizanKey: `DMZ-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(0, 4)}`,
    email: input.email ?? null,
    phone: null,
    packageType: input.packageType,
    status: "ACTIVE",
    expiresAt: new Date(now.getTime() + input.durationDays * 86400000).toISOString(),
    activatedAt: null,
    tokenLimit: input.packageType === "PREMIUM" ? 500000 : 10000,
    maxDevices: input.maxDevices,
    telegramBotToken: input.telegramBotToken ?? null,
    telegramBotUsername: input.telegramBotUsername ?? null,
    telegramOwnerChatId: null,
    telegramOwnerDisplayName: null,
    telegramLastMessageAt: null,
    geminiApiKey: input.geminiApiKey ?? null,
    aiRequestCount: 0,
    aiTokensIn: 0,
    aiTokensOut: 0,
    latestDesktopState: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastSyncAt: null
  };

  state.organizations.push(organization);
  appendAuditLog(state, {
    action: "license.generated",
    severity: "INFO",
    performedBy: "admin",
    details: `${organization.companyName} icin manuel kayit olusturuldu.`,
    organizationId: organization.id
  });
  await writeState(state);

  return {
    success: true,
    domizanKey: organization.domizanKey,
    companyCode: organization.companyCode
  };
};
