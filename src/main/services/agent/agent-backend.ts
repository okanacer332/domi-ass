import { env } from "../../config/env";

export type DesktopAgentSyncPayload = {
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

export type SyncedAgentConfig = {
  organizationId: string;
  companyName: string;
  telegram: {
    enabled: boolean;
    botToken: string | null;
    botUsername: string | null;
    ownerChatId: string | null;
    ownerDisplayName: string | null;
  };
  gemini: {
    organizationKey: string | null;
    fallbackKey: string | null;
  };
};

const requestJson = async <T>(path: string, init: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${env.domizanApiBaseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      },
      signal: controller.signal
    });
    const payload = (await response.json()) as T & { message?: string; error?: string };

    if (!response.ok) {
      throw new Error(payload.message ?? payload.error ?? "Domizan API istegi basarisiz oldu.");
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

export const syncDesktopAgent = async (payload: DesktopAgentSyncPayload) =>
  requestJson<SyncedAgentConfig>("/desktop/sync", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const claimRemoteTelegramOwner = async (payload: {
  organizationId: string;
  chatId: string;
  displayName: string | null;
}) =>
  requestJson<{ success: boolean; ownerChatId: string | null }>("/desktop/telegram/claim-owner", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const registerRemoteAgentUsage = async (payload: {
  organizationId: string;
  channel: "desktop" | "telegram";
  promptType: string;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  success: boolean;
  latencyMs: number;
}) =>
  requestJson<{ success: boolean }>("/desktop/agent-usage", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const registerRemoteTelegramActivity = async (payload: {
  organizationId: string;
  displayName: string | null;
  summary: string;
}) =>
  requestJson<{ success: boolean }>("/desktop/telegram-activity", {
    method: "POST",
    body: JSON.stringify(payload)
  });
