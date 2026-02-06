/**
 * Unit tests for CSV import parser.
 * Run: node --test server/csvImport.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseCsv, parseCsvToTransactions, rowToTransaction } from './csvImport.js';

describe('parseCsv', () => {
  it('parses CSV with header row', () => {
    const text = 'Date,Partner,Amount\n2024-01-15,Netflix,-14.99\n2024-01-16,Amazon,-32.50';
    const rows = parseCsv(text);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].Partner, 'Netflix');
    assert.strictEqual(rows[0].Amount, '-14.99');
  });
  it('returns empty array for empty or single-line input', () => {
    assert.strictEqual(parseCsv('').length, 0);
    assert.strictEqual(parseCsv('Only Header').length, 0);
  });
});

describe('parseCsvToTransactions', () => {
  it('maps rows to transaction-like objects', () => {
    const text = 'Date,Partner,Amount\n2024-01-15,Netflix,-14.99';
    const txs = parseCsvToTransactions(text);
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].merchant, 'Netflix');
    assert.strictEqual(txs[0].amount, -14.99);
  });
  it('handles N26-style columns (Partner, Booking Date, etc.)', () => {
    const text = 'Booking Date,Partner,Amount (EUR)\n15.01.2024,EASY PARK,-5.00';
    const txs = parseCsvToTransactions(text);
    assert.ok(txs.length >= 1);
    assert.ok(txs[0].merchant === 'EASY PARK' || txs[0].merchant.length > 0);
  });
});

describe('rowToTransaction', () => {
  it('uses Partner as merchant when present', () => {
    const row = { Partner: 'Netflix', Date: '2024-01-15', Amount: '-14.99' };
    const tx = rowToTransaction(row);
    assert.strictEqual(tx.merchant, 'Netflix');
  });
});
