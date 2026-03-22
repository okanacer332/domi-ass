import type { AgentStatusSnapshot } from "../../../shared/contracts";

type MutableAgentState = AgentStatusSnapshot;

const defaultState = (): MutableAgentState => ({
  organizationId: null,
  organizationName: null,
  syncStatus: "idle",
  lastSyncAt: null,
  lastSyncError: null,
  telegram: {
    enabled: false,
    running: false,
    botUsername: null,
    ownerChatId: null,
    ownerDisplayName: null,
    lastMessageAt: null,
    lastError: null
  },
  gemini: {
    configured: false,
    source: "none",
    model: "gemini-2.5-flash"
  }
});

const state: MutableAgentState = defaultState();
let resolvedGeminiKey = "";
let resolvedTelegramToken = "";

export const getAgentStatusSnapshot = (): AgentStatusSnapshot => ({
  organizationId: state.organizationId,
  organizationName: state.organizationName,
  syncStatus: state.syncStatus,
  lastSyncAt: state.lastSyncAt,
  lastSyncError: state.lastSyncError,
  telegram: {
    ...state.telegram
  },
  gemini: {
    ...state.gemini
  }
});

export const setAgentSyncState = (
  patch: Partial<Pick<MutableAgentState, "organizationId" | "organizationName" | "syncStatus" | "lastSyncAt" | "lastSyncError">>
) => {
  Object.assign(state, patch);
};

export const setAgentTelegramState = (
  patch: Partial<MutableAgentState["telegram"]>
) => {
  Object.assign(state.telegram, patch);
};

export const setAgentGeminiState = (
  patch: Partial<MutableAgentState["gemini"]>
) => {
  Object.assign(state.gemini, patch);
};

export const setResolvedGeminiKey = (value: string) => {
  resolvedGeminiKey = value.trim();
};

export const getResolvedGeminiKey = () => resolvedGeminiKey;

export const setResolvedTelegramToken = (value: string) => {
  resolvedTelegramToken = value.trim();
};

export const getResolvedTelegramToken = () => resolvedTelegramToken;
