/**
 * Unit tests for transaction classifier (normalization, fingerprint, rules, override).
 * Run: npm test (or node --test server/transactionClassifier.test.js from budget_pro).
 * Tests that call classify() require SQLite (better-sqlite3); they are skipped if DB is unavailable.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeMerchant,
  tokenize,
  computeFingerprint,
  classify,
  applyClassification,
  getOverride,
  upsertOverride,
  FALLBACK_CATEGORY,
  VALID_CATEGORIES,
} from './transactionClassifier.js';
import { initDb, getDb } from './db.js';

let dbAvailable = false;
try {
  initDb();
  dbAvailable = true;
} catch (_) {
  // better-sqlite3 native bindings may be missing in some environments
}

describe('normalizeMerchant', () => {
  it('normalizes AMZN MKTP IT to AMAZON', () => {
    assert.strictEqual(normalizeMerchant('AMZN MKTP IT'), 'AMAZON');
  });
  it('normalizes Amazon EU to AMAZON', () => {
    assert.strictEqual(normalizeMerchant('Amazon EU Sarl'), 'AMAZON');
  });
  it('normalizes EASY PARK to EASYPARK', () => {
    assert.strictEqual(normalizeMerchant('EASY PARK'), 'EASYPARK');
  });
  it('normalizes EASY-PARK to EASYPARK', () => {
    assert.strictEqual(normalizeMerchant('EASY-PARK'), 'EASYPARK');
  });
  it('normalizes NETFLIX to NETFLIX', () => {
    assert.strictEqual(normalizeMerchant('NETFLIX'), 'NETFLIX');
  });
  it('normalizes SPOTIFY to SPOTIFY', () => {
    assert.strictEqual(normalizeMerchant('SPOTIFY'), 'SPOTIFY');
  });
  it('uppercases and trims', () => {
    assert.strictEqual(normalizeMerchant('  netflix  '), 'NETFLIX');
  });
});

describe('tokenize', () => {
  it('returns array of tokens from normalized string', () => {
    const tokens = tokenize('Some Merchant Name');
    assert.ok(Array.isArray(tokens));
    assert.ok(tokens.length >= 1);
  });
});

describe('fingerprint stability', () => {
  it('same merchant, mcc, type -> same fingerprint', () => {
    const tx1 = { merchant: 'Netflix', type: 'one-time' };
    const tx2 = { merchant: 'Netflix', type: 'one-time' };
    const fp1 = computeFingerprint(tx1);
    const fp2 = computeFingerprint(tx2);
    assert.strictEqual(fp1, fp2);
  });
  it('different merchant -> different fingerprint', () => {
    const fp1 = computeFingerprint({ merchant: 'Netflix', type: 'one-time' });
    const fp2 = computeFingerprint({ merchant: 'Spotify', type: 'one-time' });
    assert.notStrictEqual(fp1, fp2);
  });
});

describe('classify rules', () => {
  it('EASY PARK -> PARKING', { skip: !dbAvailable }, () => {
    const result = classify({ merchant: 'EASY PARK', amount: -5, type: 'one-time' });
    assert.strictEqual(result.category, 'PARKING');
    assert.strictEqual(result.source, 'RULE');
  });
  it('NETFLIX -> SUBSCRIPTIONS', { skip: !dbAvailable }, () => {
    const result = classify({ merchant: 'NETFLIX', amount: -15, type: 'recurring' });
    assert.strictEqual(result.category, 'SUBSCRIPTIONS');
    assert.strictEqual(result.source, 'RULE');
  });
  it('SPOTIFY -> SUBSCRIPTIONS', { skip: !dbAvailable }, () => {
    const result = classify({ merchant: 'SPOTIFY', amount: -10, type: 'one-time' });
    assert.strictEqual(result.category, 'SUBSCRIPTIONS');
  });
  it('AMAZON -> SHOPPING', { skip: !dbAvailable }, () => {
    const result = classify({ merchant: 'AMAZON', amount: -50, type: 'one-time' });
    assert.strictEqual(result.category, 'SHOPPING');
  });
  it('unknown merchant -> UNCATEGORIZED fallback', { skip: !dbAvailable }, () => {
    const result = classify({ merchant: 'XYZ Unknown 123', amount: -1, type: 'one-time' });
    assert.strictEqual(result.category, FALLBACK_CATEGORY);
    assert.strictEqual(result.source, 'FALLBACK');
  });
  it('positive amount can be INCOME_OTHER', { skip: !dbAvailable }, () => {
    const result = classify({ merchant: 'Some Payer', amount: 100, type: 'one-time' });
    assert.strictEqual(result.category, 'INCOME_OTHER');
  });
});

describe('applyClassification', () => {
  it('sets category and metadata on tx', { skip: !dbAvailable }, () => {
    const tx = { merchant: 'NETFLIX', amount: -15, type: 'one-time' };
    applyClassification(tx);
    assert.strictEqual(tx.category, 'SUBSCRIPTIONS');
    assert.strictEqual(tx.categorySource, 'RULE');
    assert.ok(typeof tx.categoryConfidence === 'number');
    assert.ok(typeof tx.categoryFingerprint === 'string');
  });
});

describe('override precedence', () => {
  it('override wins over rules when stored', { skip: !dbAvailable }, () => {
    const tx = { merchant: 'NETFLIX', amount: -15, type: 'one-time' };
    const fp = computeFingerprint(tx);
    upsertOverride(fp, 'ENTERTAINMENT', 'NETFLIX');
    const result = classify(tx);
    assert.strictEqual(result.category, 'ENTERTAINMENT');
    assert.strictEqual(result.source, 'OVERRIDE');
    assert.strictEqual(result.confidence, 1.0);
    const db = getDb();
    db.prepare('DELETE FROM merchant_overrides WHERE fingerprint = ?').run(fp);
  });
});

describe('VALID_CATEGORIES', () => {
  it('includes all 24 categories', () => {
    assert.strictEqual(VALID_CATEGORIES.size, 24);
    assert.ok(VALID_CATEGORIES.has('UNCATEGORIZED'));
    assert.ok(VALID_CATEGORIES.has('GROCERIES'));
    assert.ok(VALID_CATEGORIES.has('INCOME_SALARY'));
  });
});
