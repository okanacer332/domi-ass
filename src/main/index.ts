import { app } from "electron";

import { bootstrapDatabase } from "./database/bootstrap";
import { closeDatabase, initDatabase } from "./database/connection";
import { registerIpcHandlers } from "./ipc";
import { ensureDomizanDirectories } from "./services/domizan-directories";
import { createMainWindow } from "./window";

const bootstrap = async () => {
  await app.whenReady();

  ensureDomizanDirectories();
  await initDatabase();
  bootstrapDatabase();
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (app.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
};

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  closeDatabase();
});

void bootstrap();
