import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { drizzle, type SQLJsDatabase } from "drizzle-orm/sql-js";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

import * as schema from "./schema";

let sqlJs: SqlJsStatic | null = null;
let sqlite: Database | null = null;
let db: SQLJsDatabase<typeof schema> | null = null;
let databaseFilePath: string | null = null;

const ensureDatabaseDirectory = (): string => {
  const dataDirectory = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dataDirectory, { recursive: true });
  return path.join(dataDirectory, "domizan.sqlite");
};

const getWasmPath = () => path.join(app.getAppPath(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");

export const initDatabase = async () => {
  if (db) {
    return db;
  }

  databaseFilePath = ensureDatabaseDirectory();
  sqlJs = await initSqlJs({
    locateFile: () => getWasmPath()
  });

  if (fs.existsSync(databaseFilePath)) {
    const buffer = fs.readFileSync(databaseFilePath);
    sqlite = new sqlJs.Database(buffer);
  } else {
    sqlite = new sqlJs.Database();
  }

  db = drizzle(sqlite, { schema });
  return db;
};

export const getSqlite = (): Database => {
  if (sqlite) {
    return sqlite;
  }

  throw new Error("Database henuz baslatilmadi.");
};

export const getDatabase = (): SQLJsDatabase<typeof schema> => {
  if (db) {
    return db;
  }

  throw new Error("Database henuz baslatilmadi.");
};

export const persistDatabase = () => {
  if (!sqlite || !databaseFilePath) {
    return;
  }

  const data = sqlite.export();
  fs.writeFileSync(databaseFilePath, Buffer.from(data));
};

export const closeDatabase = () => {
  if (!sqlite) {
    return;
  }

  persistDatabase();
  sqlite.close();
  sqlJs = null;
  sqlite = null;
  db = null;
  databaseFilePath = null;
};
