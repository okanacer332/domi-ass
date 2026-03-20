import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

import { DOMIZAN_FOLDER_NAMES, type DomizanDirectoryMap } from "../../shared/contracts";

export const ensureDomizanDirectories = (): DomizanDirectoryMap => {
  const root = path.join(app.getPath("desktop"), DOMIZAN_FOLDER_NAMES.root);
  const directories: DomizanDirectoryMap = {
    root,
    clients: path.join(root, DOMIZAN_FOLDER_NAMES.clients),
    inbox: path.join(root, DOMIZAN_FOLDER_NAMES.inbox),
    data: path.join(root, DOMIZAN_FOLDER_NAMES.data),
    reports: path.join(root, DOMIZAN_FOLDER_NAMES.reports),
    templates: path.join(root, DOMIZAN_FOLDER_NAMES.templates),
    system: path.join(root, DOMIZAN_FOLDER_NAMES.system),
    monthlySummary: path.join(root, DOMIZAN_FOLDER_NAMES.reports, DOMIZAN_FOLDER_NAMES.monthlySummary),
    declarationTracking: path.join(root, DOMIZAN_FOLDER_NAMES.reports, DOMIZAN_FOLDER_NAMES.declarationTracking)
  };

  Object.values(directories).forEach((directory) => {
    fs.mkdirSync(directory, { recursive: true });
  });

  return directories;
};
