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
-- Transactions (ledger entries). amount is always stored as monthly value for aggregations.
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
  recurring_interval TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for listing by date
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Classification metadata (optional)
-- category_source, category_confidence, category_fingerprint, matched_rule_id added via ALTER below.

-- Merchant memory overrides (fingerprint -> category)
CREATE TABLE IF NOT EXISTS merchant_overrides (
  fingerprint TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  example_merchant TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_merchant_overrides_updated ON merchant_overrides(updated_at);

-- Merchant override by stem (first word of normalized name), so "ESSELUNGA XXXX" and "ESSELUNGA YYYY" both match
CREATE TABLE IF NOT EXISTS merchant_override_stems (
  stem TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  example_merchant TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User settings (key-value). preferred_currency, etc.
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Custom categories (user-created, in addition to built-in enum)
CREATE TABLE IF NOT EXISTS custom_categories (
  name TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function initDb() {
  if (db) return db;
  ensureDataDir();
  db = new Database(DB_PATH);
  db.exec(SCHEMA);
  const alterTx = [
    'ALTER TABLE transactions ADD COLUMN recurring_interval TEXT',
    'ALTER TABLE transactions ADD COLUMN category_source TEXT',
    'ALTER TABLE transactions ADD COLUMN category_confidence REAL',
    'ALTER TABLE transactions ADD COLUMN category_fingerprint TEXT',
    'ALTER TABLE transactions ADD COLUMN matched_rule_id TEXT',
  ];
  alterTx.forEach((sql) => {
    try { db.exec(sql); } catch (_) {}
  });
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
