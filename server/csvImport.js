/**
 * CSV import: parse bank-style CSV into transaction-like rows.
 * Supports the bank feed format: date, amount, raw_merchant, canonical_merchant, merchant_normalized, description, instrument, source, recurring.
 * Stable id per row for idempotency (same row = same id, skip if already in DB).
 */

import crypto from 'crypto';

/**
 * Parse CSV text into rows of key-value objects (first row = headers).
 * Handles quoted fields and simple commas.
 */
function parseCsv(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => {
      row[h] = values[j] !== undefined ? values[j] : '';
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || c === '\t') {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/** Normalize header name for matching (lowercase, no extra spaces). */
function normHeader(h) {
  return String(h).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Compute a stable id for a row so re-importing the same row is idempotent (skip if already exists).
 * Uses full timestamp (date + time) when provided so same date but different time = different transaction.
 */
function stableIdForRow(dateStr, amount, merchant, timeStr = '') {
  const timePart = (timeStr && String(timeStr).trim()) || '';
  const payload = [dateStr, timePart, String(amount), (merchant || '').trim()].join('|');
  const hash = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
  return `import-${hash}`;
}

/**
 * Map a CSV row to a transaction-like object for createTransaction.
 * Supports bank feed columns: date, amount, raw_merchant, canonical_merchant, merchant_normalized, description, instrument, source, recurring.
 */
function rowToTransaction(row) {
  const keys = Object.keys(row);
  const byNorm = {};
  keys.forEach((k) => {
    byNorm[normHeader(k)] = row[k];
  });

  const get = (...names) => {
    for (const n of names) {
      const v = byNorm[normHeader(n)];
      if (v !== undefined && v !== '') return String(v).trim();
    }
    return '';
  };

  let rawDate = get('date', 'booking date', 'transaction date', 'datum', 'valuta');
  let timeStr = '';
  if (rawDate && /\s+\d{1,2}:\d{2}/.test(rawDate)) {
    const parts = rawDate.split(/\s+/);
    timeStr = normalizeTimePart(parts.slice(1).join(' '));
    rawDate = parts[0];
  }
  if (!timeStr) timeStr = normalizeTimePart(get('time', 'booking time', 'transaction time'));

  let dateStr = rawDate;
  if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    // already ISO-like
  } else if (dateStr && /^\d{2}[./]\d{2}[./]\d{2,4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split(/[./]/);
    const year = y.length === 2 ? `20${y}` : y;
    dateStr = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  } else if (dateStr) {
    try {
      const d = new Date(dateStr);
      if (!Number.isNaN(d.getTime())) dateStr = d.toISOString().slice(0, 10);
    } catch (_) {}
  }
  if (!dateStr) dateStr = new Date().toISOString().slice(0, 10);

  const merchant = get(
    'canonical_merchant',
    'raw_merchant',
    'merchant_normalized',
    'partner',
    'merchant',
    'payee',
    'counterparty',
    'description',
    'reference',
    'partner name'
  );
  let amountStr = get('amount', 'amount (eur)', 'amount (usd)', 'betrag', 'transaction amount');
  let amount = 0;
  if (amountStr) {
    amountStr = amountStr.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(amountStr);
    if (!Number.isNaN(num)) amount = num;
  }

  const typeRaw = get('recurring', 'type', 'transaction type', 'art');
  const type = /recurring|subscription|abbuchung|dauerauftrag|yes/i.test(typeRaw) ? 'recurring' : 'one-time';

  const paymentMethod = get('instrument', 'source', 'payment method', 'account', 'payment_method');
  const tx = {
    merchant: merchant || 'Unknown',
    date: dateStr,
    amount,
    type,
    paymentMethod: paymentMethod || 'CSV Import',
    status: 'completed',
    icon: 'receipt_long',
  };
  tx.id = stableIdForRow(dateStr, amount, tx.merchant, timeStr);
  return tx;
}

/** Normalize time to HH:mm or HH:mm:ss for stable id. */
function normalizeTimePart(t) {
  if (!t || typeof t !== 'string') return '';
  const s = t.trim().replace(/\s+/g, ' ');
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, h, min, sec] = m;
    return sec !== undefined ? `${h.padStart(2, '0')}:${min.padStart(2, '0')}:${sec.padStart(2, '0')}` : `${h.padStart(2, '0')}:${min.padStart(2, '0')}:00`;
  }
  try {
    const d = new Date('1970-01-01 ' + s);
    if (!Number.isNaN(d.getTime())) {
      const h = d.getHours(), min = d.getMinutes(), sec = d.getSeconds();
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
  } catch (_) {}
  return '';
}

/**
 * Parse CSV text and return an array of transaction-like objects with stable ids.
 * Classifier is run when each is passed to createTransaction.
 */
function parseCsvToTransactions(csvText) {
  const rows = parseCsv(csvText);
  return rows.map(rowToTransaction).filter((tx) => tx.merchant || tx.amount !== 0);
}

export { parseCsv, parseCsvLine, rowToTransaction, parseCsvToTransactions, stableIdForRow };
