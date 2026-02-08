#!/usr/bin/env node
/**
 * Insert transactions from a JSON file into the BudgetPro DB via the API.
 *
 * Usage (from budget_pro):
 *   node server/scripts/import-json.js <path-to-transactions.json>
 *
 * Start the API first: npm run server
 *
 * JSON file can be:
 *   - An array: [ { "merchant": "...", "date": "2025-01-15", "amount": -42.50 }, ... ]
 *   - An object: { "transactions": [ ... ], "paymentMethod": "N26" }
 *
 * Each transaction must have: merchant, date, amount.
 * Optional: id, category, paymentMethod, type, status, icon.
 * date can be "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss" (time is used for duplicate detection).
 */

import fs from 'fs';
import path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node server/scripts/import-json.js <path-to-transactions.json>');
  process.exit(1);
}

const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
if (!fs.existsSync(absPath)) {
  console.error('File not found:', absPath);
  process.exit(1);
}

let payload;
try {
  const raw = fs.readFileSync(absPath, 'utf8');
  const data = JSON.parse(raw);
  if (Array.isArray(data)) {
    payload = { transactions: data };
  } else if (data && Array.isArray(data.transactions)) {
    payload = { transactions: data.transactions, paymentMethod: data.paymentMethod };
  } else {
    console.error('JSON must be an array or { transactions: [...] }');
    process.exit(1);
  }
} catch (err) {
  console.error('Failed to read or parse JSON:', err.message);
  process.exit(1);
}

const url = `${API_URL}/api/transactions/import-json`;
console.log('POST', url, 'with', payload.transactions.length, 'transaction(s)...');

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Import failed:', res.status, body.error || body);
    process.exit(1);
  }
  console.log('Imported', body.created, 'transaction(s). Skipped', body.skipped, 'duplicate(s).');
} catch (err) {
  console.error('Request failed:', err.message);
  console.error('Is the server running? Start with: npm run server');
  process.exit(1);
}
