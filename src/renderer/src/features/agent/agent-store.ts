import { create } from "zustand";

import type {
  AgentChannel,
  AgentChatResponse,
  AgentMessageRecord,
  AgentStatusSnapshot
} from "../../../../shared/contracts";

type AgentStore = {
  status: AgentStatusSnapshot | null;
  messages: AgentMessageRecord[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  loadStatus: () => Promise<void>;
  loadMessages: (channel?: AgentChannel) => Promise<void>;
  sendMessage: (message: string, channel?: AgentChannel) => Promise<AgentChatResponse>;
  clearMessages: (channel?: AgentChannel) => Promise<void>;
  clearError: () => void;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Agent islemi basarisiz oldu.";

export const useAgentStore = create<AgentStore>((set, get) => ({
  status: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  loadStatus: async () => {
    try {
      const status = await window.domizanApi.getAgentStatus();
      set({ status, error: null });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },
  loadMessages: async (channel = "desktop") => {
    set({ isLoading: true, error: null });

    try {
      const messages = await window.domizanApi.listAgentMessages(channel);
      const status = await window.domizanApi.getAgentStatus();
      set({ messages, status, isLoading: false, error: null });
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },
  sendMessage: async (message, channel = "desktop") => {
    set({ isSending: true, error: null });

    try {
      const result = await window.domizanApi.sendAgentMessage({ message, channel });
      const messages = await window.domizanApi.listAgentMessages(channel);
      set({
        messages,
        status: result.status,
        isSending: false,
        error: null
      });
      return result;
    } catch (error) {
      const messageText = getErrorMessage(error);
      set({ isSending: false, error: messageText });
      throw new Error(messageText);
    }
  },
  clearMessages: async (channel = "desktop") => {
    await window.domizanApi.clearAgentMessages(channel);
    const messages = await window.domizanApi.listAgentMessages(channel);
    set({ messages, error: null });
  },
  clearError: () => set({ error: null })
}));
