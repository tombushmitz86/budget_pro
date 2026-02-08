/**
 * Transactions CRUD using SQLite.
 * Row shape: id, merchant, date, category, amount, status, icon, payment_method, type, created_at, classification metadata
 */

import { getDb } from './db.js';
import { applyClassification, recordUserCategory, FALLBACK_CATEGORY } from './transactionClassifier.js';
import { getCustomCategories } from './categoriesDb.js';

const BUILTIN_CATEGORIES = new Set([
  'INCOME_SALARY', 'INCOME_OTHER', 'HOUSING_RENT_MORTGAGE', 'UTILITIES', 'GROCERIES', 'DINING',
  'TRANSPORT_FUEL', 'TRANSPORT_PUBLIC', 'PARKING', 'SHOPPING', 'SUBSCRIPTIONS', 'HEALTH', 'EDUCATION',
  'CHILDCARE', 'ENTERTAINMENT', 'TRAVEL', 'INSURANCE', 'TAXES_FEES', 'CASH_WITHDRAWAL',
  'TRANSFERS_INTERNAL', 'TRANSFERS_EXTERNAL', 'GIFTS_DONATIONS', 'OTHER', 'UNCATEGORIZED',
]);

function coerceCategory(value) {
  if (value == null) return FALLBACK_CATEGORY;
  if (BUILTIN_CATEGORIES.has(value)) return value;
  const custom = getCustomCategories();
  if (custom.includes(value)) return value;
  return FALLBACK_CATEGORY;
}

const DEFAULT_CURRENCY = 'EUR';

function rowToTransaction(row) {
  return {
    id: row.id,
    merchant: row.merchant,
    date: row.date,
    category: coerceCategory(row.category),
    amount: row.amount,
    status: row.status,
    icon: row.icon,
    paymentMethod: row.payment_method,
    type: row.type,
    recurringInterval: (row.recurring_interval === 'yearly' || row.recurring_interval === 'monthly' || /^([2-9]|1[0-2])$/.test(row.recurring_interval || '')) ? row.recurring_interval : undefined,
    currency: (row.currency && ['USD', 'EUR', 'ILS'].includes(row.currency)) ? row.currency : DEFAULT_CURRENCY,
    categorySource: row.category_source ?? undefined,
    categoryConfidence: row.category_confidence != null ? row.category_confidence : undefined,
    categoryFingerprint: row.category_fingerprint ?? undefined,
    matchedRuleId: row.matched_rule_id ?? undefined,
  };
}

const SELECT_COLS = 'id, merchant, date, category, amount, status, icon, payment_method, type, recurring_interval, currency, category_source, category_confidence, category_fingerprint, matched_rule_id';

export function listTransactions() {
  const db = getDb();
  const rows = db.prepare(
    `SELECT ${SELECT_COLS} FROM transactions ORDER BY date DESC, created_at DESC`
  ).all();
  return rows.map(rowToTransaction);
}

export function getTransaction(id) {
  const db = getDb();
  const row = db.prepare(`SELECT ${SELECT_COLS} FROM transactions WHERE id = ?`).get(id);
  return row ? rowToTransaction(row) : null;
}

export function createTransaction(tx) {
  const db = getDb();
  const id = tx.id || `db-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const toInsert = {
    id,
    merchant: tx.merchant ?? '',
    date: tx.date ?? now.slice(0, 10),
    category: tx.category,
    amount: tx.amount ?? 0,
    status: tx.status ?? 'completed',
    icon: tx.icon ?? 'receipt_long',
    paymentMethod: tx.paymentMethod ?? tx.payment_method ?? '',
    type: tx.type ?? 'one-time',
    recurringInterval: tx.recurringInterval ?? null,
    currency: (tx.currency && ['USD', 'EUR', 'ILS'].includes(tx.currency)) ? tx.currency : DEFAULT_CURRENCY,
    categorySource: tx.categorySource,
    categoryConfidence: tx.categoryConfidence,
    categoryFingerprint: tx.categoryFingerprint,
    matchedRuleId: tx.matchedRuleId ?? null,
  };
  applyClassification(toInsert);
  db.prepare(
    `INSERT INTO transactions (id, merchant, date, category, amount, status, icon, payment_method, type, recurring_interval, currency, category_source, category_confidence, category_fingerprint, matched_rule_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    toInsert.id,
    toInsert.merchant,
    toInsert.date,
    toInsert.category,
    toInsert.amount,
    toInsert.status,
    toInsert.icon,
    toInsert.paymentMethod,
    toInsert.type,
    toInsert.recurringInterval,
    toInsert.currency,
    toInsert.categorySource ?? null,
    toInsert.categoryConfidence ?? null,
    toInsert.categoryFingerprint ?? null,
    toInsert.matchedRuleId ?? null,
    now
  );
  const row = db.prepare(`SELECT ${SELECT_COLS} FROM transactions WHERE id = ?`).get(id);
  return row ? rowToTransaction(row) : { ...toInsert };
}

export function updateTransaction(id, tx) {
  const db = getDb();
  const existing = db.prepare(`SELECT ${SELECT_COLS} FROM transactions WHERE id = ?`).get(id);
  if (!existing) return null;
  const current = rowToTransaction(existing);
  const categoryChanged = tx.category != null && tx.category !== current.category;
  let toSave = {
    merchant: tx.merchant ?? current.merchant,
    date: tx.date ?? current.date,
    category: tx.category != null ? coerceCategory(tx.category) : current.category,
    amount: tx.amount ?? current.amount,
    status: tx.status ?? current.status,
    icon: tx.icon ?? current.icon,
    paymentMethod: tx.paymentMethod ?? tx.payment_method ?? current.paymentMethod,
    type: tx.type ?? current.type,
    recurringInterval: tx.recurringInterval ?? current.recurringInterval,
    currency: (tx.currency && ['USD', 'EUR', 'ILS'].includes(tx.currency)) ? tx.currency : (current.currency || DEFAULT_CURRENCY),
    categorySource: tx.categorySource ?? current.categorySource,
    categoryConfidence: tx.categoryConfidence ?? current.categoryConfidence,
    categoryFingerprint: tx.categoryFingerprint ?? current.categoryFingerprint,
    matchedRuleId: tx.matchedRuleId !== undefined ? tx.matchedRuleId : current.matchedRuleId,
  };
  if (categoryChanged) {
    const txForOverride = {
      ...current,
      ...toSave,
      merchant: (toSave.merchant || current.merchant || '').trim() || current.merchant,
    };
    console.log('[Merchant rules] Category changed for transaction:', current.merchant, '->', toSave.category);
    recordUserCategory(txForOverride, toSave.category);
    toSave = { ...toSave, ...txForOverride };
  }
  db.prepare(
    `UPDATE transactions SET merchant = ?, date = ?, category = ?, amount = ?, status = ?, icon = ?, payment_method = ?, type = ?, recurring_interval = ?, currency = ?,
     category_source = ?, category_confidence = ?, category_fingerprint = ?, matched_rule_id = ?
     WHERE id = ?`
  ).run(
    toSave.merchant,
    toSave.date,
    toSave.category,
    toSave.amount,
    toSave.status,
    toSave.icon,
    toSave.paymentMethod,
    toSave.type,
    toSave.recurringInterval ?? null,
    toSave.currency ?? DEFAULT_CURRENCY,
    toSave.categorySource ?? null,
    toSave.categoryConfidence ?? null,
    toSave.categoryFingerprint ?? null,
    toSave.matchedRuleId ?? null,
    id
  );
  const row = db.prepare(`SELECT ${SELECT_COLS} FROM transactions WHERE id = ?`).get(id);
  return row ? rowToTransaction(row) : null;
}

export function deleteTransaction(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return result.changes > 0;
}

export function deleteAllTransactions() {
  const db = getDb();
  const result = db.prepare('DELETE FROM transactions').run();
  return result.changes;
}
