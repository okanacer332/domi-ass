import { create } from "zustand";

import type {
  ClientFormInput,
  ClientRecord,
  ClientStatusUpdateInput,
  ClientUpdateInput,
  FolderOpenResult
} from "../../../../shared/contracts";

type ClientsStore = {
  clients: ClientRecord[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  loadClients: () => Promise<void>;
  createClient: (input: ClientFormInput) => Promise<ClientRecord>;
  updateClient: (input: ClientUpdateInput) => Promise<ClientRecord>;
  setClientStatus: (input: ClientStatusUpdateInput) => Promise<ClientRecord>;
  openClientFolder: (clientId: number) => Promise<FolderOpenResult>;
};

export const useClientsStore = create<ClientsStore>((set, get) => ({
  clients: [],
  status: "idle",
  error: null,
  loadClients: async () => {
    set({ status: "loading", error: null });

    try {
      const clients = await window.domizanApi.listClients();
      set({ clients, status: "ready" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mükellefler yüklenemedi.";
      set({ status: "error", error: message });
    }
  },
  createClient: async (input) => {
    const created = await window.domizanApi.createClient(input);
    set({ clients: [created, ...get().clients] });
    return created;
  },
  updateClient: async (input) => {
    const updated = await window.domizanApi.updateClient(input);
    set({
      clients: get().clients.map((client) => (client.id === updated.id ? updated : client))
    });
    return updated;
  },
  setClientStatus: async (input) => {
    const updated = await window.domizanApi.setClientStatus(input);
    set({
      clients: get().clients.map((client) => (client.id === updated.id ? updated : client))
    });
    return updated;
  },
  openClientFolder: async (clientId) => window.domizanApi.openClientFolder(clientId)
}));
