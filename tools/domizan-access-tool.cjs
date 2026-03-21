#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const initSqlJs = require("sql.js");

const action = process.argv[2] || "status";
const actionArg = process.argv[3] || "";

const DEFAULT_DOMIZAN_API_BASE_URL = "https://domizan-api-5jzmdzz6lq-ew.a.run.app";

const nowIso = () => new Date().toISOString();

const getAppDataCandidates = () => {
  if (process.platform === "win32") {
    const roamingBase = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return [path.join(roamingBase, "domizan"), path.join(roamingBase, "Domizan")];
  }

  if (process.platform === "darwin") {
    const macBase = path.join(os.homedir(), "Library", "Application Support");
    return [path.join(macBase, "domizan"), path.join(macBase, "Domizan")];
  }

  const linuxBase = path.join(os.homedir(), ".config");
  return [path.join(linuxBase, "domizan"), path.join(linuxBase, "Domizan")];
};

const getSharedSecurityDirectory = () => {
  if (process.platform === "win32") {
    const programData = process.env.PROGRAMDATA || "C:\\ProgramData";
    return path.join(programData, "Domizan", "Security");
  }

  if (process.platform === "darwin") {
    return path.join("/Users/Shared", "Domizan", "Security");
  }

  return path.join(os.homedir(), ".config", "domizan", "security-shared");
};

const databaseCandidates = getAppDataCandidates().map((directory) =>
  path.join(directory, "data", "domizan.sqlite")
);

const defaultDatabasePath = databaseCandidates[0];
const sharedSecurityDirectory = getSharedSecurityDirectory();
const sharedAccessFilePath = path.join(sharedSecurityDirectory, "installation-access.json");
const sharedBindingFilePath = path.join(sharedSecurityDirectory, "machine-binding.json");
const desktopDomizanRoot = path.join(os.homedir(), "Desktop", "Domizan");
const inboxDirectoryPath = path.join(desktopDomizanRoot, "GelenKutusu");

const resolveExistingPath = (candidates) => candidates.find((candidate) => fs.existsSync(candidate)) || null;

const readJsonIfExists = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
};

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
};

const getWasmDirectory = () => path.dirname(require.resolve("sql.js"));

const loadDatabase = async () => {
  const databasePath = resolveExistingPath(databaseCandidates);

  if (!databasePath) {
    return {
      databasePath: defaultDatabasePath,
      sqlite: null
    };
  }

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(getWasmDirectory(), file)
  });

  return {
    databasePath,
    sqlite: new SQL.Database(fs.readFileSync(databasePath))
  };
};

const persistDatabase = (databasePath, sqlite) => {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.writeFileSync(databasePath, Buffer.from(sqlite.export()));
};

const tableExists = (sqlite, tableName) => {
  const result = sqlite.exec(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName]
  );
  return result.length > 0;
};

const upsertExpiredTrial = (sqlite) => {
  if (!tableExists(sqlite, "trial_state")) {
    return;
  }

  const now = new Date();
  const startedAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const expiresAt = new Date(now.getTime() - 60 * 1000).toISOString();
  const timestamp = now.toISOString();
  const existing = sqlite.exec("SELECT id FROM trial_state ORDER BY id DESC LIMIT 1");

  if (existing.length > 0 && existing[0].values.length > 0) {
    const [[id]] = existing[0].values;
    sqlite.run(
      "UPDATE trial_state SET status = ?, started_at = ?, expires_at = ?, converted_at = NULL, updated_at = ? WHERE id = ?",
      ["expired", startedAt, expiresAt, timestamp, id]
    );
    return;
  }

  sqlite.run(
    "INSERT INTO trial_state (status, started_at, expires_at, converted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ["expired", startedAt, expiresAt, null, timestamp, timestamp]
  );
};

const clearLicenseRows = (sqlite) => {
  if (!tableExists(sqlite, "license_state")) {
    return;
  }

  sqlite.run("DELETE FROM license_state");
};

const replaceLicenseRows = (sqlite, license) => {
  if (!tableExists(sqlite, "license_state")) {
    return;
  }

  sqlite.run("DELETE FROM license_state");
  sqlite.run(
    `INSERT INTO license_state (
      provider, license_key, license_status, instance_id, instance_name, customer_email, customer_name,
      store_id, product_id, variant_id, order_id, order_item_id, expires_at, activated_at, validated_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "lemonsqueezy",
      license.licenseKey,
      license.licenseStatus,
      license.instanceId,
      license.instanceName,
      license.customerEmail,
      license.customerName,
      license.storeId,
      license.productId,
      license.variantId,
      license.orderId,
      license.orderItemId,
      license.expiresAt,
      license.activatedAt,
      license.validatedAt,
      license.updatedAt,
      license.updatedAt
    ]
  );
};

const mutateSharedAccess = (mutator) => {
  const accessState = readJsonIfExists(sharedAccessFilePath);

  if (!accessState) {
    return false;
  }

  const nextState = mutator({
    ...accessState,
    updatedAt: nowIso()
  });

  writeJson(sharedAccessFilePath, nextState);
  return true;
};

const printStatus = async () => {
  const { databasePath, sqlite } = await loadDatabase();
  const sharedAccess = readJsonIfExists(sharedAccessFilePath);
  const sharedBinding = readJsonIfExists(sharedBindingFilePath);

  console.log("Domizan erisim durumu");
  console.log(`- Database: ${sqlite ? databasePath : "bulunamadi"}`);
  console.log(`- Shared access: ${fs.existsSync(sharedAccessFilePath) ? sharedAccessFilePath : "bulunamadi"}`);
  console.log(`- Machine binding: ${fs.existsSync(sharedBindingFilePath) ? sharedBindingFilePath : "bulunamadi"}`);

  if (sqlite) {
    const licenseRows = tableExists(sqlite, "license_state")
      ? sqlite.exec("SELECT license_key, license_status, validated_at FROM license_state ORDER BY id DESC LIMIT 1")
      : [];
    const trialRows = tableExists(sqlite, "trial_state")
      ? sqlite.exec("SELECT status, started_at, expires_at FROM trial_state ORDER BY id DESC LIMIT 1")
      : [];

    if (licenseRows.length > 0 && licenseRows[0].values.length > 0) {
      const [[licenseKey, licenseStatus, validatedAt]] = licenseRows[0].values;
      console.log(`- Lisans: ${licenseStatus || "bilinmiyor"} (${licenseKey || "anahtar yok"})`);
      console.log(`- Son dogrulama: ${validatedAt || "yok"}`);
    } else {
      console.log("- Lisans: kayit yok");
    }

    if (trialRows.length > 0 && trialRows[0].values.length > 0) {
      const [[status, startedAt, expiresAt]] = trialRows[0].values;
      console.log(`- Deneme: ${status || "bilinmiyor"}`);
      console.log(`- Baslangic: ${startedAt || "yok"}`);
      console.log(`- Bitis: ${expiresAt || "yok"}`);
    } else {
      console.log("- Deneme: kayit yok");
    }

    sqlite.close();
  }

  if (sharedAccess) {
    console.log(`- Shared trial: ${sharedAccess.trial?.status || "bilinmiyor"}`);
    console.log(`- Shared license: ${sharedAccess.license?.status || "yok"}`);
  }

  if (sharedBinding) {
    console.log(`- Installation ID: ${sharedBinding.installationId || "yok"}`);
  }
};

const clearLicense = async () => {
  const { databasePath, sqlite } = await loadDatabase();

  if (sqlite) {
    clearLicenseRows(sqlite);
    persistDatabase(databasePath, sqlite);
    sqlite.close();
  }

  const touchedSharedAccess = mutateSharedAccess((accessState) => ({
    ...accessState,
    license: {
      keyHash: null,
      status: null,
      activatedAt: null,
      validatedAt: null
    },
    updatedAt: nowIso()
  }));

  console.log("Lisans bilgisi temizlendi.");
  console.log(`- Database: ${sqlite ? "guncellendi" : "bulunamadi"}`);
  console.log(`- Shared access: ${touchedSharedAccess ? "guncellendi" : "bulunamadi"}`);
};

const expireTrial = async () => {
  const { databasePath, sqlite } = await loadDatabase();

  if (sqlite) {
    upsertExpiredTrial(sqlite);
    persistDatabase(databasePath, sqlite);
    sqlite.close();
  }

  const now = new Date();
  const startedAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const expiresAt = new Date(now.getTime() - 60 * 1000).toISOString();

  const touchedSharedAccess = mutateSharedAccess((accessState) => ({
    ...accessState,
    trial: {
      status: "expired",
      startedAt,
      expiresAt,
      convertedAt: null
    },
    updatedAt: nowIso()
  }));

  console.log("Deneme suresi bitmis olarak isaretlendi.");
  console.log(`- Database: ${sqlite ? "guncellendi" : "bulunamadi"}`);
  console.log(`- Shared access: ${touchedSharedAccess ? "guncellendi" : "bulunamadi"}`);
};

const resetTrial = async () => {
  const { databasePath, sqlite } = await loadDatabase();

  if (sqlite && tableExists(sqlite, "trial_state")) {
    sqlite.run("DELETE FROM trial_state");
    persistDatabase(databasePath, sqlite);
    sqlite.close();
  }

  const touchedSharedAccess = mutateSharedAccess((accessState) => ({
    ...accessState,
    trial: {
      status: "not_started",
      startedAt: null,
      expiresAt: null,
      convertedAt: null
    },
    updatedAt: nowIso()
  }));

  console.log("Deneme kaydi temizlendi.");
  console.log(`- Database: ${sqlite ? "guncellendi" : "bulunamadi"}`);
  console.log(`- Shared access: ${touchedSharedAccess ? "guncellendi" : "bulunamadi"}`);
};

const clearInbox = async () => {
  const { databasePath, sqlite } = await loadDatabase();

  if (sqlite && tableExists(sqlite, "documents")) {
    sqlite.run("DELETE FROM documents WHERE source = ?", ["team_inbox"]);
    persistDatabase(databasePath, sqlite);
    sqlite.close();
  }

  if (fs.existsSync(inboxDirectoryPath)) {
    for (const entry of fs.readdirSync(inboxDirectoryPath, { withFileTypes: true })) {
      const entryPath = path.join(inboxDirectoryPath, entry.name);
      fs.rmSync(entryPath, { recursive: true, force: true });
    }
  } else {
    fs.mkdirSync(inboxDirectoryPath, { recursive: true });
  }

  console.log("Gelen kutusu temizlendi.");
  console.log(`- Database: ${sqlite ? "guncellendi" : "bulunamadi"}`);
  console.log(`- Klasor: ${inboxDirectoryPath}`);
};

const restoreLicense = async (licenseKey) => {
  if (!licenseKey) {
    throw new Error("restore-license komutu icin lisans anahtari gereklidir.");
  }

  const response = await fetch(`${process.env.DOMIZAN_API_BASE_URL || DEFAULT_DOMIZAN_API_BASE_URL}/licenses/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      licenseKey,
      instanceName: `Domizan Desktop - ${os.hostname()}`
    })
  });

  const result = await response.json();

  if (!response.ok || !result?.success || !result?.license) {
    throw new Error(result?.error || "Lisans geri yuklenemedi.");
  }

  const { databasePath, sqlite } = await loadDatabase();

  if (sqlite) {
    replaceLicenseRows(sqlite, result.license);
    persistDatabase(databasePath, sqlite);
    sqlite.close();
  }

  const touchedSharedAccess = mutateSharedAccess((accessState) => ({
    ...accessState,
    license: {
      keyHash: createHash("sha256").update(result.license.licenseKey).digest("hex"),
      status: result.license.licenseStatus,
      activatedAt: result.license.activatedAt,
      validatedAt: result.license.validatedAt
    },
    updatedAt: nowIso()
  }));

  console.log("Lisans kaydi geri yuklendi.");
  console.log(`- Database: ${sqlite ? "guncellendi" : "bulunamadi"}`);
  console.log(`- Shared access: ${touchedSharedAccess ? "guncellendi" : "bulunamadi"}`);
};

const main = async () => {
  switch (action) {
    case "status":
      await printStatus();
      break;
    case "clear-license":
      await clearLicense();
      break;
    case "expire-trial":
      await expireTrial();
      break;
    case "reset-trial":
      await resetTrial();
      break;
    case "clear-inbox":
      await clearInbox();
      break;
    case "restore-license":
      await restoreLicense(actionArg);
      break;
    default:
      console.error(`Bilinmeyen komut: ${action}`);
      console.error(
        "Kullanilabilir komutlar: status, clear-license, expire-trial, reset-trial, clear-inbox, restore-license"
      );
      process.exitCode = 1;
  }
};

void main();
