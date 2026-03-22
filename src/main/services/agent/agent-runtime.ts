import { listClients } from "../clients/client-service";
import { listInboxDocuments } from "../inbox/inbox-service";
import { getAccessSnapshot } from "../licensing/access-service";
import { getWorkspaceProfile } from "../onboarding/workspace-service";
import { getDashboardPlanner } from "../planner/planner-service";
import { getSettingsSnapshot } from "../settings/settings-service";
import { env } from "../../config/env";
import { syncDesktopAgent, type DesktopAgentSyncPayload } from "./agent-backend";
import {
  getAgentStatusSnapshot,
  setAgentGeminiState,
  setAgentSyncState,
  setResolvedGeminiKey
} from "./agent-state";
import { disposeTelegramAgent, syncTelegramAgent } from "./telegram-agent";

const SYNC_INTERVAL_MS = 60_000;

let syncTimer: NodeJS.Timeout | null = null;
let initialized = false;

const buildSyncPayload = async (): Promise<DesktopAgentSyncPayload> => {
  const [workspace, access, settings, clients, planner, inboxRows] = await Promise.all([
    getWorkspaceProfile(),
    getAccessSnapshot(),
    getSettingsSnapshot(),
    listClients(),
    getDashboardPlanner(),
    listInboxDocuments()
  ]);

  const waitingInboxRows = inboxRows.filter((row) => row.status !== "routed");

  return {
    officeName: workspace?.officeName ?? null,
    ownerName: workspace?.ownerName ?? null,
    ownerEmail: workspace?.ownerEmail ?? null,
    accessMode: access.mode,
    license: {
      licenseKey: access.license?.licenseKey ?? null,
      licenseStatus: access.license?.licenseStatus ?? null,
      expiresAt: access.license?.expiresAt ?? null
    },
    installation: {
      installationId: settings.device.installationId,
      deviceLabel: settings.device.hostname,
      platform: settings.app.platform
    },
    app: {
      version: settings.app.version,
      osRelease: settings.app.osRelease,
      arch: settings.app.arch,
      hostname: settings.device.hostname,
      electronVersion: settings.app.electronVersion,
      nodeVersion: settings.app.nodeVersion
    },
    summary: {
      clientCount: clients.length,
      waitingDocumentCount: waitingInboxRows.length,
      totalDocumentCount: inboxRows.length,
      pendingReminderCount: planner.reminders.filter((entry) => entry.status === "pending").length,
      telegramReady: getAgentStatusSnapshot().telegram.enabled,
      geminiReady: Boolean(getAgentStatusSnapshot().gemini.configured || env.geminiApiKey)
    },
    inbox: {
      queuedCount: waitingInboxRows.filter((row) => row.analysisStatus === "queued").length,
      analyzingCount: waitingInboxRows.filter((row) => row.analysisStatus === "analyzing").length,
      readyCount: waitingInboxRows.filter((row) => row.analysisStatus === "ready").length,
      needsReviewCount: waitingInboxRows.filter((row) => row.analysisStatus === "needs_review").length,
      failedCount: waitingInboxRows.filter((row) => row.analysisStatus === "failed").length
    },
    planner: {
      overdueReminderCount: planner.overdueReminderCount,
      todayItemCount: planner.todayItemCount,
      focusPhaseLabel: planner.focusPhaseLabel,
      nextDeadlineTitle: planner.nextDeadline?.title ?? null,
      nextDeadlineDate: planner.nextDeadline?.date ?? null
    },
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      identityNumber: client.identityNumber,
      status: client.status
    })),
    syncedAt: new Date().toISOString()
  };
};

const applyRemoteAgentConfig = async () => {
  setAgentSyncState({
    syncStatus: "syncing",
    lastSyncError: null
  });

  try {
    const payload = await buildSyncPayload();
    const remote = await syncDesktopAgent(payload);

    const resolvedGeminiKey =
      remote.gemini.organizationKey?.trim() ||
      remote.gemini.fallbackKey?.trim() ||
      env.geminiApiKey.trim();

    const geminiSource = remote.gemini.organizationKey?.trim()
      ? "organization"
      : remote.gemini.fallbackKey?.trim()
        ? "fallback"
        : env.geminiApiKey.trim()
          ? "local"
          : "none";

    setResolvedGeminiKey(resolvedGeminiKey);
    setAgentGeminiState({
      configured: Boolean(resolvedGeminiKey),
      source: geminiSource,
      model: "gemini-2.5-flash"
    });
    setAgentSyncState({
      organizationId: remote.organizationId,
      organizationName: remote.companyName,
      syncStatus: "ready",
      lastSyncAt: new Date().toISOString(),
      lastSyncError: null
    });

    await syncTelegramAgent({
      organizationId: remote.organizationId,
      telegram: remote.telegram
    });
  } catch (error) {
    console.error("Agent desktop sync failed:", error);
    setAgentSyncState({
      syncStatus: "error",
      lastSyncError: error instanceof Error ? error.message : "Desktop sync basarisiz oldu."
    });
  }
};

export const initializeAgentRuntime = () => {
  if (initialized) {
    return;
  }

  initialized = true;
  void applyRemoteAgentConfig();
  syncTimer = setInterval(() => {
    void applyRemoteAgentConfig();
  }, SYNC_INTERVAL_MS);
};

export const disposeAgentRuntime = () => {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }

  initialized = false;
  disposeTelegramAgent();
};
