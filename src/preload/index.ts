import { contextBridge, ipcRenderer } from "electron";

import type { DomizanApi } from "../shared/contracts";
import { UPDATE_STATE_CHANNEL } from "../shared/ipc-channels";

const api: DomizanApi = {
  getBootstrap: () => ipcRenderer.invoke("app:getBootstrap"),
  getSettingsSnapshot: () => ipcRenderer.invoke("app:getSettings"),
  setThemePreference: (theme) => ipcRenderer.invoke("app:setThemePreference", theme),
  openPath: (targetPath) => ipcRenderer.invoke("app:openPath", targetPath),
  getDashboardPlanner: (referenceDate) => ipcRenderer.invoke("app:getDashboardPlanner", referenceDate),
  completeOnboarding: (input) => ipcRenderer.invoke("app:completeOnboarding", input),
  getUpdateState: () => ipcRenderer.invoke("updates:getState"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  onUpdateStateChanged: (listener) => {
    const wrappedListener = (_event: Electron.IpcRendererEvent, state: Parameters<typeof listener>[0]) => {
      listener(state);
    };

    ipcRenderer.on(UPDATE_STATE_CHANNEL, wrappedListener);

    return () => {
      ipcRenderer.removeListener(UPDATE_STATE_CHANNEL, wrappedListener);
    };
  },
  startTrial: () => ipcRenderer.invoke("licensing:startTrial"),
  openCheckout: (input) => ipcRenderer.invoke("licensing:openCheckout", input),
  getStoredLicense: () => ipcRenderer.invoke("licensing:getStoredLicense"),
  activateLicense: (input) => ipcRenderer.invoke("licensing:activateLicense", input),
  validateStoredLicense: () => ipcRenderer.invoke("licensing:validateStoredLicense"),
  updatePlannerEvent: (input) => ipcRenderer.invoke("planner:events:update", input),
  deletePlannerEvent: (id) => ipcRenderer.invoke("planner:events:delete", id),
  createPlannerReminder: (input) => ipcRenderer.invoke("planner:reminders:create", input),
  updatePlannerReminder: (input) => ipcRenderer.invoke("planner:reminders:update", input),
  setPlannerReminderStatus: (input) => ipcRenderer.invoke("planner:reminders:setStatus", input),
  deletePlannerReminder: (id) => ipcRenderer.invoke("planner:reminders:delete", id),
  createPlannerNote: (input) => ipcRenderer.invoke("planner:notes:create", input),
  deletePlannerNote: (id) => ipcRenderer.invoke("planner:notes:delete", id),
  listClients: () => ipcRenderer.invoke("clients:list"),
  getClientDetail: (clientId) => ipcRenderer.invoke("clients:getDetail", clientId),
  createClient: (input) => ipcRenderer.invoke("clients:create", input),
  updateClient: (input) => ipcRenderer.invoke("clients:update", input),
  setClientStatus: (input) => ipcRenderer.invoke("clients:setStatus", input),
  openClientFolder: (clientId) => ipcRenderer.invoke("clients:openFolder", clientId),
  prepareClientImportTemplate: () => ipcRenderer.invoke("clients:prepareImportTemplate"),
  pickClientImportFile: () => ipcRenderer.invoke("clients:pickImportFile"),
  previewClientImport: (filePath) => ipcRenderer.invoke("clients:previewImport", filePath),
  commitClientImport: (input) => ipcRenderer.invoke("clients:commitImport", input),
  listInboxDocuments: () => ipcRenderer.invoke("inbox:list"),
  getInboxMonitor: () => ipcRenderer.invoke("inbox:getMonitor"),
  openInboxFolder: () => ipcRenderer.invoke("inbox:openFolder"),
  openInboxDocument: (documentId) => ipcRenderer.invoke("inbox:openDocument", documentId),
  reanalyzeInboxDocument: (documentId) => ipcRenderer.invoke("inbox:reanalyze", documentId),
  deleteInboxDocument: (documentId) => ipcRenderer.invoke("inbox:delete", documentId),
  routeInboxDocument: (input) => ipcRenderer.invoke("inbox:route", input),
  listMizanCodes: () => ipcRenderer.invoke("mizan:list"),
  createMizanCode: (input) => ipcRenderer.invoke("mizan:create", input),
  deleteMizanCode: (id) => ipcRenderer.invoke("mizan:delete", id)
};

contextBridge.exposeInMainWorld("domizanApi", api);
