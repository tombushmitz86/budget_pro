/**
 * User settings stored in SQLite (key-value).
 * Keys: preferred_currency (USD | EUR | ILS), etc.
 */

import { getDb } from './db.js';

const VALID_CURRENCIES = new Set(['USD', 'EUR', 'ILS']);

function coerceCurrency(value) {
  if (value != null && VALID_CURRENCIES.has(value)) return value;
  return 'USD';
}

export function getSetting(key) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM user_settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

export function setSetting(key, value) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO user_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`
  ).run(key, String(value), now, String(value), now);
}

/**
 * Get all settings as a plain object. Preferred keys are coerced (e.g. currency).
 */
export function getSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM user_settings').all();
  const out = {};
  for (const row of rows) {
    out[row.key] = row.value;
  }
  if (out.preferred_currency != null) {
    out.preferred_currency = coerceCurrency(out.preferred_currency);
  }
  return out;
}

/**
 * Update settings from a partial object. Only known keys are written.
 */
export function updateSettings(patch) {
  if (patch.preferred_currency != null) {
    setSetting('preferred_currency', coerceCurrency(patch.preferred_currency));
  }
  return getSettings();
}
