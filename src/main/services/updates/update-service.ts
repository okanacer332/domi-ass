import { app, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";

import type { AppUpdateState, AppUpdateStatus } from "../../../shared/contracts";
import { UPDATE_STATE_CHANNEL } from "../../../shared/ipc-channels";

const isSupportedPlatform = () => process.platform === "win32" || process.platform === "darwin";

const isUpdateRuntimeAvailable = () => app.isPackaged && isSupportedPlatform();

const getUnsupportedReason = () => {
  if (!app.isPackaged) {
    return "Otomatik güncelleme yalnızca kurulu masaüstü sürümünde çalışır.";
  }

  if (!isSupportedPlatform()) {
    return "Otomatik güncelleme yalnızca Windows ve macOS için açıktır.";
  }

  return null;
};

const createBaseState = (status: AppUpdateStatus): AppUpdateState => ({
  status,
  currentVersion: app.getVersion(),
  nextVersion: null,
  releaseName: null,
  releaseDate: null,
  progressPercent: null,
  downloadedBytes: null,
  totalBytes: null,
  lastCheckedAt: null,
  error: getUnsupportedReason(),
  canCheck: isUpdateRuntimeAvailable(),
  canInstall: false
});

let initialized = false;
let checkInFlight: Promise<AppUpdateState> | null = null;
let state: AppUpdateState = createBaseState(isUpdateRuntimeAvailable() ? "idle" : "unsupported");

const broadcastState = () => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(UPDATE_STATE_CHANNEL, state);
    }
  }
};

const updateState = (patch: Partial<AppUpdateState>) => {
  state = {
    ...state,
    ...patch,
    currentVersion: app.getVersion(),
    canCheck: isUpdateRuntimeAvailable()
  };
  broadcastState();
  return state;
};

const markChecked = () => new Date().toISOString();

const normalizeErrorMessage = (error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Güncelleme denetimi sırasında beklenmeyen bir hata oluştu.";

  const normalized = message.toLowerCase();

  if (normalized.includes("releases.atom") && normalized.includes("404")) {
    return "GitHub release akisi bulunamadi. Repo public degil ya da yayinlanmis bir release henuz yok.";
  }

  if (normalized.includes("latest.yml") && normalized.includes("404")) {
    return "Yayin sunucusunda latest.yml bulunamadi. Yeni surum artefaktlari henuz yayinlanmamis olabilir.";
  }

  return message;
};

const applySupportState = () => {
  if (isUpdateRuntimeAvailable()) {
    state = {
      ...state,
      status: state.status === "unsupported" ? "idle" : state.status,
      error: state.status === "unsupported" ? null : state.error,
      canCheck: true
    };
    return;
  }

  state = createBaseState("unsupported");
};

export const syncUpdateStateToWindow = (window: BrowserWindow) => {
  if (window.isDestroyed()) {
    return;
  }

  window.webContents.send(UPDATE_STATE_CHANNEL, state);
};

export const getUpdateState = () => {
  applySupportState();
  return state;
};

export const checkForUpdates = async () => {
  applySupportState();

  if (!isUpdateRuntimeAvailable()) {
    return state;
  }

  if (checkInFlight) {
    return checkInFlight;
  }

  checkInFlight = (async () => {
    updateState({
      status: "checking",
      error: null,
      canInstall: false,
      progressPercent: null,
      downloadedBytes: null,
      totalBytes: null
    });

    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      updateState({
        status: "error",
        error: normalizeErrorMessage(error),
        lastCheckedAt: markChecked(),
        canInstall: false
      });
    } finally {
      checkInFlight = null;
    }

    return state;
  })();

  return checkInFlight;
};

export const installDownloadedUpdate = async () => {
  applySupportState();

  if (!isUpdateRuntimeAvailable()) {
    return state;
  }

  if (state.status !== "downloaded") {
    return updateState({
      status: "error",
      error: "Kurulmaya hazır indirilmiş bir güncelleme bulunamadı.",
      canInstall: false
    });
  }

  const nextState = updateState({
    status: "installing",
    error: null,
    canInstall: false
  });

  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });

  return nextState;
};

export const initializeAutoUpdater = () => {
  if (initialized) {
    return;
  }

  initialized = true;
  applySupportState();

  if (!isUpdateRuntimeAvailable()) {
    broadcastState();
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    updateState({
      status: "checking",
      error: null,
      canInstall: false
    });
  });

  autoUpdater.on("update-available", (info) => {
    updateState({
      status: "available",
      nextVersion: info.version ?? null,
      releaseName: info.releaseName ?? null,
      releaseDate: info.releaseDate ?? null,
      lastCheckedAt: markChecked(),
      error: null,
      canInstall: false
    });
  });

  autoUpdater.on("update-not-available", () => {
    updateState({
      status: "not-available",
      nextVersion: null,
      releaseName: null,
      releaseDate: null,
      progressPercent: null,
      downloadedBytes: null,
      totalBytes: null,
      lastCheckedAt: markChecked(),
      error: null,
      canInstall: false
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    updateState({
      status: "downloading",
      progressPercent: progress.percent ?? null,
      downloadedBytes: progress.transferred ?? null,
      totalBytes: progress.total ?? null,
      error: null,
      canInstall: false
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    updateState({
      status: "downloaded",
      nextVersion: info.version ?? state.nextVersion,
      releaseName: info.releaseName ?? state.releaseName,
      releaseDate: info.releaseDate ?? state.releaseDate,
      progressPercent: 100,
      downloadedBytes: state.totalBytes,
      error: null,
      canInstall: true
    });
  });

  autoUpdater.on("error", (error) => {
    updateState({
      status: "error",
      error: normalizeErrorMessage(error),
      lastCheckedAt: markChecked(),
      canInstall: false
    });
  });

  broadcastState();
  setTimeout(() => {
    void checkForUpdates();
  }, 2_500);
};
