import { create } from "zustand";

import type {
  InboxDeleteResult,
  FolderOpenResult,
  InboxDocumentRecord,
  InboxMonitorSnapshot,
  InboxRouteInput,
  InboxRouteResult,
  InboxReanalyzeResult
} from "../../../../shared/contracts";

type InboxStore = {
  documents: InboxDocumentRecord[];
  monitor: InboxMonitorSnapshot | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  loadInbox: (options?: { silent?: boolean }) => Promise<void>;
  openInboxFolder: () => Promise<FolderOpenResult>;
  openInboxDocument: (documentId: number) => Promise<FolderOpenResult>;
  reanalyzeInboxDocument: (documentId: number) => Promise<InboxReanalyzeResult>;
  deleteInboxDocument: (documentId: number) => Promise<InboxDeleteResult>;
  routeInboxDocument: (input: InboxRouteInput) => Promise<InboxRouteResult>;
};

export const useInboxStore = create<InboxStore>((set) => ({
  documents: [],
  monitor: null,
  status: "idle",
  error: null,
  loadInbox: async (options) => {
    if (!options?.silent) {
      set({ status: "loading", error: null });
    }

    try {
      const [documents, monitor] = await Promise.all([
        window.domizanApi.listInboxDocuments(),
        window.domizanApi.getInboxMonitor()
      ]);

      set({
        documents,
        monitor,
        status: "ready",
        error: null
      });
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Gelen kutusu yuklenemedi."
      });
    }
  },
  openInboxFolder: async () => window.domizanApi.openInboxFolder(),
  openInboxDocument: async (documentId) => window.domizanApi.openInboxDocument(documentId),
  reanalyzeInboxDocument: async (documentId) => window.domizanApi.reanalyzeInboxDocument(documentId),
  deleteInboxDocument: async (documentId) => window.domizanApi.deleteInboxDocument(documentId),
  routeInboxDocument: async (input) => window.domizanApi.routeInboxDocument(input)
}));
