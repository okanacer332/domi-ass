import { ipcMain } from "electron";

import { getBootstrapPayload } from "./services/bootstrap";
import {
  commitClientImport,
  pickClientImportFile,
  previewClientImport
} from "./services/clients/client-import";
import { prepareClientImportTemplate } from "./services/clients/client-import-template";
import { getClientDetail } from "./services/clients/client-detail";
import {
  createClient,
  listClients,
  openClientFolder,
  setClientStatus,
  updateClient
} from "./services/clients/client-service";
import { startTrial } from "./services/licensing/access-service";
import {
  activateLicense,
  openHostedCheckout,
  validateStoredLicense
} from "./services/licensing/lemon";
import {
  createMizanCode,
  deleteMizanCode,
  listMizanCodes
} from "./services/mizan/mizan-service";
import {
  getSettingsSnapshot,
  openPathFromSettings,
  setThemePreference
} from "./services/settings/settings-service";
import {
  createPlannerNote,
  createPlannerReminder,
  deletePlannerNote,
  deletePlannerEvent,
  deletePlannerReminder,
  getDashboardPlanner,
  updatePlannerEvent,
  updatePlannerReminder,
  setPlannerReminderStatus
} from "./services/planner/planner-service";
import {
  getInboxMonitor,
  deleteInboxDocument,
  listInboxDocuments,
  openInboxDocument,
  openInboxFolder,
  routeInboxDocument,
  reanalyzeInboxDocument
} from "./services/inbox/inbox-service";
import { getStoredLicenseState } from "./services/licensing/license-store";
import { completeOnboarding } from "./services/onboarding/workspace-service";
import {
  checkForUpdates,
  getUpdateState,
  installDownloadedUpdate
} from "./services/updates/update-service";

export const registerIpcHandlers = () => {
  ipcMain.handle("app:getBootstrap", async () => getBootstrapPayload());
  ipcMain.handle("app:getSettings", async () => getSettingsSnapshot());
  ipcMain.handle("app:setThemePreference", async (_, theme) => setThemePreference(theme));
  ipcMain.handle("app:openPath", async (_, targetPath: string) => openPathFromSettings(targetPath));
  ipcMain.handle("app:getDashboardPlanner", async (_, referenceDate?: string) =>
    getDashboardPlanner(referenceDate)
  );
  ipcMain.handle("app:completeOnboarding", async (_, input) => completeOnboarding(input));
  ipcMain.handle("updates:getState", async () => getUpdateState());
  ipcMain.handle("updates:check", async () => checkForUpdates());
  ipcMain.handle("updates:install", async () => installDownloadedUpdate());

  ipcMain.handle("licensing:startTrial", async () => startTrial());
  ipcMain.handle("licensing:openCheckout", async (_, input) => openHostedCheckout(input));
  ipcMain.handle("licensing:getStoredLicense", async () => getStoredLicenseState());
  ipcMain.handle("licensing:activateLicense", async (_, input) => activateLicense(input));
  ipcMain.handle("licensing:validateStoredLicense", async () => validateStoredLicense());
  ipcMain.handle("planner:reminders:create", async (_, input) => createPlannerReminder(input));
  ipcMain.handle("planner:reminders:update", async (_, input) => updatePlannerReminder(input));
  ipcMain.handle("planner:reminders:setStatus", async (_, input) => setPlannerReminderStatus(input));
  ipcMain.handle("planner:reminders:delete", async (_, id: number) => deletePlannerReminder(id));
  ipcMain.handle("planner:events:update", async (_, input) => updatePlannerEvent(input));
  ipcMain.handle("planner:events:delete", async (_, id: number) => deletePlannerEvent(id));
  ipcMain.handle("planner:notes:create", async (_, input) => createPlannerNote(input));
  ipcMain.handle("planner:notes:delete", async (_, id: number) => deletePlannerNote(id));

  ipcMain.handle("clients:list", async () => listClients());
  ipcMain.handle("clients:getDetail", async (_, clientId: number) => getClientDetail(clientId));
  ipcMain.handle("clients:create", async (_, input) => createClient(input));
  ipcMain.handle("clients:update", async (_, input) => updateClient(input));
  ipcMain.handle("clients:setStatus", async (_, input) => setClientStatus(input));
  ipcMain.handle("clients:openFolder", async (_, clientId: number) => openClientFolder(clientId));
  ipcMain.handle("clients:prepareImportTemplate", async () => prepareClientImportTemplate());
  ipcMain.handle("clients:pickImportFile", async () => pickClientImportFile());
  ipcMain.handle("clients:previewImport", async (_, filePath: string) => previewClientImport(filePath));
  ipcMain.handle("clients:commitImport", async (_, input) => commitClientImport(input));

  ipcMain.handle("inbox:list", async () => listInboxDocuments());
  ipcMain.handle("inbox:getMonitor", async () => getInboxMonitor());
  ipcMain.handle("inbox:openFolder", async () => openInboxFolder());
  ipcMain.handle("inbox:openDocument", async (_, documentId: number) => openInboxDocument(documentId));
  ipcMain.handle("inbox:reanalyze", async (_, documentId: number) => reanalyzeInboxDocument(documentId));
  ipcMain.handle("inbox:delete", async (_, documentId: number) => deleteInboxDocument(documentId));
  ipcMain.handle("inbox:route", async (_, input) => routeInboxDocument(input));

  ipcMain.handle("mizan:list", async () => listMizanCodes());
  ipcMain.handle("mizan:create", async (_, input) => createMizanCode(input));
  ipcMain.handle("mizan:delete", async (_, id: number) => deleteMizanCode(id));
};
