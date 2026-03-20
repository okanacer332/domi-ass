import { inferIdentityFromValue } from "../../shared/client-identity";
import { getSqlite, persistDatabase } from "./connection";

const columnExists = (tableName: string, columnName: string) => {
  const result = getSqlite().exec(`PRAGMA table_info(${tableName})`);
  const rows = result[0];

  if (!rows) {
    return false;
  }

  const nameIndex = rows.columns.indexOf("name");
  return rows.values.some((row) => row[nameIndex] === columnName);
};

const ensureColumn = (tableName: string, columnName: string, definition: string) => {
  if (!columnExists(tableName, columnName)) {
    getSqlite().run(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
};

const migrateLegacyClientIdentityData = () => {
  const sqlite = getSqlite();
  const result = sqlite.exec(`
    SELECT id, tax_id, identity_type, identity_number
    FROM clients
  `);

  const rows = result[0];
  if (!rows) {
    return;
  }

  const idIndex = rows.columns.indexOf("id");
  const taxIdIndex = rows.columns.indexOf("tax_id");
  const identityTypeIndex = rows.columns.indexOf("identity_type");
  const identityNumberIndex = rows.columns.indexOf("identity_number");

  rows.values.forEach((row) => {
    const id = Number(row[idIndex]);
    const taxId = typeof row[taxIdIndex] === "string" ? row[taxIdIndex] : null;
    const currentIdentityType =
      row[identityTypeIndex] === "vkn" || row[identityTypeIndex] === "tckn"
        ? row[identityTypeIndex]
        : null;
    const currentIdentityNumber =
      typeof row[identityNumberIndex] === "string" ? row[identityNumberIndex] : null;

    if (currentIdentityType && currentIdentityNumber) {
      return;
    }

    const inferred = inferIdentityFromValue(currentIdentityNumber ?? taxId);

    sqlite.run(
      `
      UPDATE clients
      SET identity_type = ?, identity_number = ?
      WHERE id = ?
    `,
      [inferred.isValid ? inferred.identityType : null, inferred.normalizedValue, id]
    );
  });
};

export const bootstrapDatabase = () => {
  const sqlite = getSqlite();

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tax_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      folder_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      source TEXT NOT NULL DEFAULT 'manual',
      original_name TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      detected_type TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      title TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      channel TEXT NOT NULL DEFAULT 'desktop',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS license_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL DEFAULT 'lemonsqueezy',
      license_key TEXT NOT NULL,
      license_status TEXT NOT NULL,
      instance_id TEXT,
      instance_name TEXT,
      customer_email TEXT,
      customer_name TEXT,
      store_id INTEGER,
      product_id INTEGER,
      variant_id INTEGER,
      order_id INTEGER,
      order_item_id INTEGER,
      expires_at TEXT,
      activated_at TEXT,
      validated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  ensureColumn("clients", "identity_type", "identity_type TEXT");
  ensureColumn("clients", "identity_number", "identity_number TEXT");
  ensureColumn("clients", "tax_office", "tax_office TEXT");
  ensureColumn("clients", "authorized_person", "authorized_person TEXT");
  ensureColumn("clients", "phone", "phone TEXT");
  ensureColumn("clients", "email", "email TEXT");
  ensureColumn("clients", "city", "city TEXT");
  ensureColumn("clients", "address", "address TEXT");
  ensureColumn("clients", "notes", "notes TEXT");

  migrateLegacyClientIdentityData();

  const now = new Date().toISOString();
  sqlite.run(
    `
    INSERT OR IGNORE INTO settings (key, value, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `,
    ["office_mode", "team-inbox", now, now]
  );

  sqlite.run(
    `
    INSERT OR IGNORE INTO settings (key, value, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `,
    ["telegram_mode", "owner-briefing", now, now]
  );

  const reminderRows = sqlite.exec("SELECT id FROM reminders LIMIT 1");
  if (reminderRows.length === 0) {
    sqlite.run(
      `
      INSERT INTO reminders (title, due_date, status, channel, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        "İlk günde örnek hatırlatma",
        new Date(Date.now() + 86400000).toISOString(),
        "pending",
        "telegram",
        now,
        now
      ]
    );
  }

  persistDatabase();
};
