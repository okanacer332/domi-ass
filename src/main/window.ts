import path from "node:path";
import { app, BrowserWindow } from "electron";

export const createMainWindow = () => {
  const runtimeIconPath = app.isPackaged
    ? path.join(process.resourcesPath, "assets", "domizan-icon-source.png")
    : path.join(app.getAppPath(), "assets", "domizan-icon-source.png");

  const window = new BrowserWindow({
    width: 1520,
    height: 940,
    minWidth: 1240,
    minHeight: 780,
    backgroundColor: "#f3efe7",
    icon: runtimeIconPath,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return window;
};
