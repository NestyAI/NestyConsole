import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { getCredentialStorageMode } from "@/lib/console/storage-mode";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "nesty-console.db");

let dbSingleton: DatabaseSync | null = null;

function getDbPath(): string {
  const configured = process.env.NESTY_CONSOLE_DB_PATH?.trim();
  return configured || DEFAULT_DB_PATH;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS gateway_credentials (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      gateway_url TEXT DEFAULT NULL,
      encrypted_gateway_api_key TEXT DEFAULT NULL,
      encrypted_internal_admin_token TEXT DEFAULT NULL,
      internal_admin_enabled INTEGER NOT NULL DEFAULT 0,
      last_verified_at TEXT DEFAULT NULL,
      last_status TEXT DEFAULT NULL,
      last_error TEXT DEFAULT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export function getConsoleDb(): DatabaseSync {
  if (getCredentialStorageMode() !== "sqlite") {
    throw new Error("Database Sync is disabled when credential storage mode is not sqlite.");
  }
  if (dbSingleton) {
    return dbSingleton;
  }

  const dbPath = getDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");

  initSchema(db);
  dbSingleton = db;
  return db;
}
