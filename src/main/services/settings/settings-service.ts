import os from "node:os";
import { app, shell } from "electron";
import { desc, eq } from "drizzle-orm";

import type {
  FolderOpenResult,
  SettingsSnapshot,
  ThemePreference
} from "../../../shared/contracts";
import { getDatabase, persistDatabase } from "../../database/connection";
import { settingsTable } from "../../database/schema";
import { ensureDomizanDirectories } from "../domizan-directories";
import { ensureInstallationBinding } from "../licensing/device-binding";

const THEME_SETTING_KEY = "ui_theme";

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

const getThemePreference = async (): Promise<ThemePreference> => {
  const db = getDatabase();
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, THEME_SETTING_KEY))
    .orderBy(desc(settingsTable.id))
    .limit(1);

  return isThemePreference(row?.value ?? null) ? row!.value : "system";
};

const upsertSettingValue = async (key: string, value: string) => {
  const db = getDatabase();
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, key))
    .orderBy(desc(settingsTable.id))
    .limit(1);

  if (existing) {
    await db
      .update(settingsTable)
      .set({
        value,
        updatedAt: now
      })
      .where(eq(settingsTable.id, existing.id));
  } else {
    await db.insert(settingsTable).values({
      key,
      value,
      createdAt: now,
      updatedAt: now
    });
  }

  persistDatabase();
};

export const getSettingsSnapshot = async (): Promise<SettingsSnapshot> => {
  const [themePreference, installation] = await Promise.all([
    getThemePreference(),
    ensureInstallationBinding()
  ]);
  const directories = ensureDomizanDirectories();

  return {
    themePreference,
    app: {
      name: "Domizan",
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      platform: process.platform,
      arch: process.arch,
      osRelease: os.release(),
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome ?? null,
      electronVersion: process.versions.electron,
      userDataPath: app.getPath("userData")
    },
    device: {
      hostname: os.hostname(),
      installationId: installation.installationId,
      bindingStatus: installation.bindingStatus,
      sharedBindingPath: installation.sharedBindingPath,
      firstBoundAt: installation.firstBoundAt,
      lastSeenAt: installation.lastSeenAt
    },
    directories
  };
};

export const setThemePreference = async (themePreference: ThemePreference) => {
  await upsertSettingValue(THEME_SETTING_KEY, themePreference);
  return getSettingsSnapshot();
};

export const openPathFromSettings = async (targetPath: string): Promise<FolderOpenResult> => {
  const result = await shell.openPath(targetPath);

  if (result) {
    return {
      opened: false,
      error: result
    };
  }

  return {
    opened: true,
    error: null
  };
};
