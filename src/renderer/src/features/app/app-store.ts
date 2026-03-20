import { create } from "zustand";

import type {
  AppUpdateState,
  BootstrapPayload,
  CheckoutOpenInput,
  CheckoutOpenResult,
  LicenseActivationInput,
  LicenseActivationResult,
  OnboardingSetupInput
} from "../../../../shared/contracts";

type AppStore = {
  bootstrap: BootstrapPayload | null;
  updateState: AppUpdateState | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  loadBootstrap: () => Promise<void>;
  refreshBootstrap: () => Promise<BootstrapPayload>;
  loadUpdateState: () => Promise<void>;
  watchUpdateState: () => () => void;
  checkForUpdates: () => Promise<AppUpdateState>;
  installUpdate: () => Promise<AppUpdateState>;
  completeOnboarding: (input: OnboardingSetupInput) => Promise<void>;
  startTrial: () => Promise<void>;
  activateLicense: (input: LicenseActivationInput) => Promise<LicenseActivationResult>;
  validateStoredLicense: () => Promise<void>;
  openCheckout: (input?: CheckoutOpenInput) => Promise<CheckoutOpenResult>;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.";

export const useAppStore = create<AppStore>((set) => ({
  bootstrap: null,
  updateState: null,
  status: "idle",
  error: null,
  refreshBootstrap: async () => {
    const bootstrap = await window.domizanApi.getBootstrap();
    set({ bootstrap, status: "ready", error: null });
    return bootstrap;
  },
  loadBootstrap: async () => {
    set({ status: "loading", error: null });

    try {
      const bootstrap = await window.domizanApi.getBootstrap();
      set({ bootstrap, status: "ready", error: null });
    } catch (error) {
      set({ status: "error", error: getErrorMessage(error) });
    }
  },
  loadUpdateState: async () => {
    const updateState = await window.domizanApi.getUpdateState();
    set({ updateState });
  },
  watchUpdateState: () =>
    window.domizanApi.onUpdateStateChanged((updateState) => {
      set({ updateState });
    }),
  checkForUpdates: async () => {
    const updateState = await window.domizanApi.checkForUpdates();
    set({ updateState });
    return updateState;
  },
  installUpdate: async () => {
    const updateState = await window.domizanApi.installUpdate();
    set({ updateState });
    return updateState;
  },
  completeOnboarding: async (input) => {
    await window.domizanApi.completeOnboarding(input);
    const bootstrap = await window.domizanApi.getBootstrap();
    set({ bootstrap, status: "ready", error: null });
  },
  startTrial: async () => {
    await window.domizanApi.startTrial();
    const bootstrap = await window.domizanApi.getBootstrap();
    set({ bootstrap, status: "ready", error: null });
  },
  activateLicense: async (input) => {
    const result = await window.domizanApi.activateLicense(input);

    if (result.success) {
      const bootstrap = await window.domizanApi.getBootstrap();
      set({ bootstrap, status: "ready", error: null });
    }

    return result;
  },
  validateStoredLicense: async () => {
    await window.domizanApi.validateStoredLicense();
    const bootstrap = await window.domizanApi.getBootstrap();
    set({ bootstrap, status: "ready", error: null });
  },
  openCheckout: async (input) => window.domizanApi.openCheckout(input)
}));
