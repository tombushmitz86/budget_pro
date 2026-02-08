/**
 * Custom categories (user-created). Built-in categories are in transactionClassifier VALID_CATEGORIES.
 */

import { getDb } from './db.js';

export function getCustomCategories() {
  const db = getDb();
  const rows = db.prepare('SELECT name FROM custom_categories ORDER BY name').all();
  return rows.map((r) => r.name);
}

export function addCustomCategory(name) {
  const trimmed = String(name).trim();
  if (!trimmed) return null;
  const db = getDb();
  const now = new Date().toISOString();
  try {
    db.prepare('INSERT INTO custom_categories (name, created_at) VALUES (?, ?)').run(trimmed, now);
    return trimmed;
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') return trimmed; // already exists
    throw e;
  }
}

export function removeCustomCategory(name) {
  const db = getDb();
  const result = db.prepare('DELETE FROM custom_categories WHERE name = ?').run(String(name).trim());
  return result.changes > 0;
}
