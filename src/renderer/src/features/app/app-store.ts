import { create } from "zustand";

import type { BootstrapPayload } from "../../../../shared/contracts";

type AppStore = {
  bootstrap: BootstrapPayload | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  loadBootstrap: () => Promise<void>;
};

export const useAppStore = create<AppStore>((set) => ({
  bootstrap: null,
  status: "idle",
  error: null,
  loadBootstrap: async () => {
    set({ status: "loading", error: null });

    try {
      const bootstrap = await window.domizanApi.getBootstrap();
      set({ bootstrap, status: "ready" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      set({ status: "error", error: message });
    }
  }
}));
