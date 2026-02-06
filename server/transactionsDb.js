/**
 * Transactions CRUD using SQLite.
 * Row shape: id, merchant, date, category, amount, status, icon, payment_method, type, created_at
 */

import { getDb } from './db.js';

function rowToTransaction(row) {
  return {
    id: row.id,
    merchant: row.merchant,
    date: row.date,
    category: row.category,
    amount: row.amount,
    status: row.status,
    icon: row.icon,
    paymentMethod: row.payment_method,
    type: row.type,
  };
}

export function listTransactions() {
  const db = getDb();
  const rows = db.prepare(
    'SELECT id, merchant, date, category, amount, status, icon, payment_method, type FROM transactions ORDER BY date DESC, created_at DESC'
  ).all();
  return rows.map(rowToTransaction);
}

export function createTransaction(tx) {
  const db = getDb();
  const id = tx.id || `db-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO transactions (id, merchant, date, category, amount, status, icon, payment_method, type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tx.merchant ?? '',
    tx.date ?? now.slice(0, 10),
    tx.category ?? 'Food & Dining',
    tx.amount ?? 0,
    tx.status ?? 'completed',
    tx.icon ?? 'receipt_long',
    tx.paymentMethod ?? tx.payment_method ?? '',
    tx.type ?? 'one-time',
    now
  );
  const row = db.prepare('SELECT id, merchant, date, category, amount, status, icon, payment_method, type FROM transactions WHERE id = ?').get(id);
  return row ? rowToTransaction(row) : { ...tx, id };
}

export function updateTransaction(id, tx) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM transactions WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare(
    `UPDATE transactions SET merchant = ?, date = ?, category = ?, amount = ?, status = ?, icon = ?, payment_method = ?, type = ?
     WHERE id = ?`
  ).run(
    tx.merchant ?? '',
    tx.date ?? '',
    tx.category ?? 'Food & Dining',
    tx.amount ?? 0,
    tx.status ?? 'completed',
    tx.icon ?? 'receipt_long',
    tx.paymentMethod ?? tx.payment_method ?? '',
    tx.type ?? 'one-time',
    id
  );
  const row = db.prepare('SELECT id, merchant, date, category, amount, status, icon, payment_method, type FROM transactions WHERE id = ?').get(id);
  return row ? rowToTransaction(row) : null;
}

export function deleteTransaction(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return result.changes > 0;
}
