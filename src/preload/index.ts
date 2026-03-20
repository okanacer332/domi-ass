import { contextBridge, ipcRenderer } from "electron";

import type { DomizanApi } from "../shared/contracts";

const api: DomizanApi = {
  getBootstrap: () => ipcRenderer.invoke("app:getBootstrap"),
  openCheckout: (input) => ipcRenderer.invoke("licensing:openCheckout", input),
  getStoredLicense: () => ipcRenderer.invoke("licensing:getStoredLicense"),
  activateLicense: (input) => ipcRenderer.invoke("licensing:activateLicense", input),
  validateStoredLicense: () => ipcRenderer.invoke("licensing:validateStoredLicense"),
  listClients: () => ipcRenderer.invoke("clients:list"),
  createClient: (input) => ipcRenderer.invoke("clients:create", input),
  updateClient: (input) => ipcRenderer.invoke("clients:update", input),
  setClientStatus: (input) => ipcRenderer.invoke("clients:setStatus", input),
  openClientFolder: (clientId) => ipcRenderer.invoke("clients:openFolder", clientId),
  pickClientImportFile: () => ipcRenderer.invoke("clients:pickImportFile"),
  previewClientImport: (filePath) => ipcRenderer.invoke("clients:previewImport", filePath),
  commitClientImport: (input) => ipcRenderer.invoke("clients:commitImport", input)
};

contextBridge.exposeInMainWorld("domizanApi", api);
