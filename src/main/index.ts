import path from "node:path";
import { app, BrowserWindow, nativeImage } from "electron";

import { bootstrapDatabase } from "./database/bootstrap";
import { closeDatabase, initDatabase } from "./database/connection";
import { registerIpcHandlers } from "./ipc";
import { disposeAgentRuntime, initializeAgentRuntime } from "./services/agent/agent-runtime";
import { ensureDomizanDirectories } from "./services/domizan-directories";
import { disposeInboxMonitor, initializeInboxMonitor } from "./services/inbox/inbox-service";
import { initializeAutoUpdater, syncUpdateStateToWindow } from "./services/updates/update-service";
import { createMainWindow } from "./window";

const bootstrap = async () => {
  await app.whenReady();

  const runtimeIconPath = app.isPackaged
    ? path.join(process.resourcesPath, "assets", "domizan-icon-source.png")
    : path.join(app.getAppPath(), "assets", "domizan-icon-source.png");

  if (process.platform === "darwin" && app.dock) {
    const dockIcon = nativeImage.createFromPath(runtimeIconPath);

    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon);
    }
  }

  ensureDomizanDirectories();
  await initDatabase();
  bootstrapDatabase();
  registerIpcHandlers();
  initializeInboxMonitor();
  initializeAgentRuntime();
  const mainWindow = createMainWindow();
  initializeAutoUpdater();
  syncUpdateStateToWindow(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createMainWindow();
      syncUpdateStateToWindow(window);
    }
  });
};

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  disposeAgentRuntime();
  disposeInboxMonitor();
  closeDatabase();
});

void bootstrap();
