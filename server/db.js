/**
 * SQLite database: init, schema, and connection.
 * DB file: server/data/budgetpro.db (created on first run).
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'budgetpro.db');

let db = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const SCHEMA = `
-- Transactions (ledger entries)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  merchant TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  icon TEXT NOT NULL DEFAULT 'receipt_long',
  payment_method TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'one-time',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for listing by date
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
`;

export function initDb() {
  if (db) return db;
  ensureDataDir();
  db = new Database(DB_PATH);
  db.exec(SCHEMA);
  return db;
}

export function getDb() {
  if (!db) initDb();
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
