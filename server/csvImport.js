/**
 * CSV import: parse bank-style CSV (e.g. N26) into transaction-like rows.
 * No external API calls. Each row is then passed to createTransaction (classifier runs per row).
 */

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
 * Map a CSV row (object with various column names) to a transaction-like object
 * for createTransaction. Supports N26-style and generic columns.
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

  let dateStr = get('date', 'booking date', 'transaction date', 'datum', 'valuta');
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

  const merchant = get('partner', 'merchant', 'payee', 'counterparty', 'description', 'reference', 'partner name');
  let amountStr = get('amount', 'amount (eur)', 'amount (usd)', 'betrag', 'transaction amount');
  let amount = 0;
  if (amountStr) {
    amountStr = amountStr.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(amountStr);
    if (!Number.isNaN(num)) amount = num;
  }

  const typeRaw = get('type', 'transaction type', 'art');
  const type = /recurring|subscription|abbuchung|dauerauftrag/i.test(typeRaw) ? 'recurring' : 'one-time';

  return {
    merchant: merchant || 'Unknown',
    date: dateStr,
    amount,
    type,
    paymentMethod: get('payment method', 'account', 'payment_method') || 'CSV Import',
    status: 'completed',
    icon: 'receipt_long',
  };
}

/**
 * Parse CSV text and return an array of transaction-like objects (not yet classified).
 * Classifier is run when each is passed to createTransaction.
 */
function parseCsvToTransactions(csvText) {
  const rows = parseCsv(csvText);
  return rows.map(rowToTransaction).filter((tx) => tx.merchant || tx.amount !== 0);
}

export { parseCsv, parseCsvLine, rowToTransaction, parseCsvToTransactions };
