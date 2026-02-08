/**
 * Read merchant overrides from DB. Used by GET /api/merchant_overrides.
 * No dependency on transactionClassifier (avoids load/hang issues).
 */

import { getDb } from './db.js';

export function listMerchantOverrides() {
  const db = getDb();
  return db.prepare(
    'SELECT fingerprint, category, example_merchant, updated_at FROM merchant_overrides ORDER BY updated_at DESC'
  ).all();
}
