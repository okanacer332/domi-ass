import { ipcMain } from "electron";

import { getBootstrapPayload } from "./services/bootstrap";
import {
  commitClientImport,
  pickClientImportFile,
  previewClientImport
} from "./services/clients/client-import";
import {
  createClient,
  listClients,
  openClientFolder,
  setClientStatus,
  updateClient
} from "./services/clients/client-service";
import {
  activateLicense,
  openHostedCheckout,
  validateStoredLicense
} from "./services/licensing/lemon";
import { getStoredLicenseState } from "./services/licensing/license-store";

export const registerIpcHandlers = () => {
  ipcMain.handle("app:getBootstrap", async () => getBootstrapPayload());
  ipcMain.handle("licensing:openCheckout", async (_, input) => openHostedCheckout(input));
  ipcMain.handle("licensing:getStoredLicense", async () => getStoredLicenseState());
  ipcMain.handle("licensing:activateLicense", async (_, input) => activateLicense(input));
  ipcMain.handle("licensing:validateStoredLicense", async () => validateStoredLicense());

  ipcMain.handle("clients:list", async () => listClients());
  ipcMain.handle("clients:create", async (_, input) => createClient(input));
  ipcMain.handle("clients:update", async (_, input) => updateClient(input));
  ipcMain.handle("clients:setStatus", async (_, input) => setClientStatus(input));
  ipcMain.handle("clients:openFolder", async (_, clientId: number) => openClientFolder(clientId));
  ipcMain.handle("clients:pickImportFile", async () => pickClientImportFile());
  ipcMain.handle("clients:previewImport", async (_, filePath: string) => previewClientImport(filePath));
  ipcMain.handle("clients:commitImport", async (_, input) => commitClientImport(input));
};
