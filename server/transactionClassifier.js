/**
 * Internal transaction classifier: rules + merchant memory overrides.
 * Deterministic, no external API calls. Used on create and CSV import.
 */

import crypto from 'crypto';
import { getDb } from './db.js';

// --- Category enum (must match types.ts Category) ---
const FALLBACK_CATEGORY = 'UNCATEGORIZED';

// --- Normalization ---
function normalizeMerchant(str) {
  if (str == null || typeof str !== 'string') return '';
  let s = str.toUpperCase().trim();
  s = s.replace(/[\s]+/g, ' ').trim();
  s = s.replace(/[^\w\s]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  // Variants
  const variants = [
    [/^AMZN\s/i, 'AMAZON'],
    [/^AMAZON\s+EU\s/i, 'AMAZON'],
    [/^AMAZON/i, 'AMAZON'],
    [/^EASY\s*[-]?\s*PARK/i, 'EASYPARK'],
    [/^EASYPARK/i, 'EASYPARK'],
    [/^NETFLIX/i, 'NETFLIX'],
    [/^SPOTIFY/i, 'SPOTIFY'],
  ];
  for (const [re, replacement] of variants) {
    if (re.test(s)) {
      s = replacement;
      break;
    }
  }
  return s;
}

function tokenize(str) {
  if (str == null || typeof str !== 'string') return [];
  const normalized = normalizeMerchant(str);
  return normalized.split(/\s+/).filter(Boolean);
}

// --- Fingerprint ---
function fingerprintPayload(merchant, mcc = '', ibanCountryPrefix = '', typeOrChannel = '') {
  const candidate = [merchant, mcc, ibanCountryPrefix, typeOrChannel || '']
    .map((x) => (x != null ? String(x).trim() : ''))
    .join('|');
  return crypto.createHash('sha256').update(candidate).digest('hex');
}

function getMerchantCandidate(tx) {
  const raw = tx.merchant ?? tx.payee ?? tx.counterparty ?? tx.description ?? '';
  return normalizeMerchant(raw);
}

function computeFingerprint(tx) {
  const merchantCandidate = getMerchantCandidate(tx);
  const mcc = tx.mcc ?? tx.mccCode ?? '';
  const ibanPrefix = tx.ibanCountryPrefix ?? tx.ibanPrefix ?? '';
  const typeOrChannel = tx.type ?? tx.channel ?? '';
  return fingerprintPayload(merchantCandidate, mcc, ibanPrefix, typeOrChannel);
}

// --- Overrides (DB) ---
function getOverride(fingerprint) {
  const db = getDb();
  const row = db.prepare('SELECT category FROM merchant_overrides WHERE fingerprint = ?').get(fingerprint);
  return row ? row.category : null;
}

function upsertOverride(fingerprint, category, exampleMerchant) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO merchant_overrides (fingerprint, category, example_merchant, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(fingerprint) DO UPDATE SET category = ?, example_merchant = ?, updated_at = ?`
  ).run(fingerprint, category, exampleMerchant ?? '', now, category, exampleMerchant ?? '', now);
}

// --- Rules (ordered; first match wins) ---
const RULES = [
  {
    id: 'cash_withdrawal',
    confidence: 0.95,
    test: (tx, tokens, norm) => {
      const t = (tx.type || '').toLowerCase();
      const m = (tx.merchant || '').toUpperCase();
      if (t === 'cash' || /ATM|CASH\s*WITHDRAWAL|BANCOMAT/i.test(m)) return true;
      if (/\bATM\b|CASH\s*OUT\b/i.test(norm)) return true;
      return false;
    },
    category: 'CASH_WITHDRAWAL',
  },
  {
    id: 'amazon_shopping',
    confidence: 0.9,
    test: (tx, tokens, norm) => norm === 'AMAZON' || /^AMAZON/.test(norm),
    category: 'SHOPPING',
  },
  {
    id: 'easypark_parking',
    confidence: 0.95,
    test: (tx, tokens, norm) => norm === 'EASYPARK' || /EASYPARK|EASY\s*PARK/i.test(norm),
    category: 'PARKING',
  },
  {
    id: 'subscriptions_streaming',
    confidence: 0.9,
    test: (tx, tokens, norm) =>
      /NETFLIX|SPOTIFY|PRIME|GOOGLE\s*ONE|APPLE\s*MUSIC|APPLE\s*TV|DISNEY|HBO|YOUTUBE\s*PREMIUM/i.test(norm),
    category: 'SUBSCRIPTIONS',
  },
  {
    id: 'groceries_mcc',
    confidence: 0.9,
    test: (tx, tokens, norm) => String(tx.mcc || tx.mccCode || '') === '5411',
    category: 'GROCERIES',
  },
  {
    id: 'groceries_keywords',
    confidence: 0.85,
    test: (tx, tokens, norm) =>
      /\b(SUPERMARKET|GROCERY|LIDL|ALDI|CARREFOUR|TESCO|REWE|WHOLE\s*FOODS|SAINSBURY)\b/i.test(norm),
    category: 'GROCERIES',
  },
  {
    id: 'dining_mcc',
    confidence: 0.9,
    test: (tx, tokens, norm) => /^581[24]$/.test(String(tx.mcc || tx.mccCode || '').trim()),
    category: 'DINING',
  },
  {
    id: 'dining_keywords',
    confidence: 0.85,
    test: (tx, tokens, norm) =>
      /\b(RESTAURANT|CAFE|COFFEE|PIZZA|UBER\s*EATS|DELIVEROO|WOLT|STARBUCKS|MCDONALD)\b/i.test(norm),
    category: 'DINING',
  },
  {
    id: 'fuel_keywords',
    confidence: 0.9,
    test: (tx, tokens, norm) =>
      /\b(ENI|Q8|SHELL|BP|EXXON|TOTAL|CHEVRON|FUEL|GAS\s*STATION|PETROL)\b/i.test(norm),
    category: 'TRANSPORT_FUEL',
  },
  {
    id: 'fuel_mcc',
    confidence: 0.9,
    test: (tx, tokens, norm) => /^554[12]$/.test(String(tx.mcc || tx.mccCode || '').trim()),
    category: 'TRANSPORT_FUEL',
  },
  {
    id: 'rent_keywords',
    confidence: 0.9,
    test: (tx, tokens, norm) => /\b(RENT|AFFITTO|MIETE|MORTGAGE|LANDLORD)\b/i.test(norm),
    category: 'HOUSING_RENT_MORTGAGE',
  },
  {
    id: 'utilities_keywords',
    confidence: 0.9,
    test: (tx, tokens, norm) =>
      /\b(ENEL|EDISON|A2A|GAS\s*BILL|ELECTRICITY|ACQUA|TARI|UTILITY|PGE|WATER|ELECTRIC)\b/i.test(norm),
    category: 'UTILITIES',
  },
  {
    id: 'insurance_keywords',
    confidence: 0.85,
    test: (tx, tokens, norm) => /\b(INSURANCE|ASSICURAZIONE|VERSICHERUNG)\b/i.test(norm),
    category: 'INSURANCE',
  },
  {
    id: 'salary_keywords',
    confidence: 0.9,
    test: (tx, tokens, norm) => {
      const amount = Number(tx.amount);
      if (amount <= 0) return false;
      return /\b(STIPENDIO|SALARY|PAYROLL|WAGE|PAY\s*SLIP)\b/i.test(norm);
    },
    category: 'INCOME_SALARY',
  },
  {
    id: 'income_positive',
    confidence: 0.7,
    test: (tx, tokens, norm) => Number(tx.amount) > 0,
    category: 'INCOME_OTHER',
  },
  {
    id: 'transfers_internal',
    confidence: 0.9,
    test: (tx, tokens, norm) => {
      const m = (tx.merchant || '').toUpperCase();
      const t = (tx.type || '').toLowerCase();
      if (/\b(TRANSFER\s*FROM|INTERNAL|OWN\s*ACCOUNT)\b/i.test(m)) return true;
      if (t === 'transfer' && /SELF|INTERNAL/i.test(m)) return true;
      return false;
    },
    category: 'TRANSFERS_INTERNAL',
  },
  {
    id: 'transfers_external',
    confidence: 0.7,
    test: (tx, tokens, norm) => /\b(TRANSFER|BANK\s*TRANSFER|SEPA)\b/i.test(norm),
    category: 'TRANSFERS_EXTERNAL',
  },
];

const VALID_CATEGORIES = new Set([
  'INCOME_SALARY', 'INCOME_OTHER', 'HOUSING_RENT_MORTGAGE', 'UTILITIES', 'GROCERIES', 'DINING',
  'TRANSPORT_FUEL', 'TRANSPORT_PUBLIC', 'PARKING', 'SHOPPING', 'SUBSCRIPTIONS', 'HEALTH', 'EDUCATION',
  'CHILDCARE', 'ENTERTAINMENT', 'TRAVEL', 'INSURANCE', 'TAXES_FEES', 'CASH_WITHDRAWAL',
  'TRANSFERS_INTERNAL', 'TRANSFERS_EXTERNAL', 'GIFTS_DONATIONS', 'OTHER', 'UNCATEGORIZED',
]);

function ensureValidCategory(cat) {
  return VALID_CATEGORIES.has(cat) ? cat : FALLBACK_CATEGORY;
}

/**
 * @param {object} tx - Transaction-like object (merchant, amount, type, mcc, etc.)
 * @returns {{ category: string, confidence: number, source: 'OVERRIDE'|'RULE'|'FALLBACK', fingerprint: string, matchedRuleId?: string, matchedSignals?: string[] }}
 */
function classify(tx) {
  const norm = getMerchantCandidate(tx);
  const tokens = tokenize(tx.merchant ?? tx.payee ?? tx.description ?? '');
  const fp = computeFingerprint(tx);

  const override = getOverride(fp);
  if (override != null) {
    return {
      category: ensureValidCategory(override),
      confidence: 1.0,
      source: 'OVERRIDE',
      fingerprint: fp,
      matchedSignals: ['merchant_override'],
    };
  }

  for (const rule of RULES) {
    try {
      if (rule.test(tx, tokens, norm)) {
        return {
          category: rule.category,
          confidence: rule.confidence,
          source: 'RULE',
          fingerprint: fp,
          matchedRuleId: rule.id,
          matchedSignals: [rule.id],
        };
      }
    } catch (_) {}
  }

  return {
    category: FALLBACK_CATEGORY,
    confidence: 0.2,
    source: 'FALLBACK',
    fingerprint: fp,
    matchedSignals: [],
  };
}

/**
 * Mutates tx with category and optional metadata. Returns tx.
 */
function applyClassification(tx) {
  const result = classify(tx);
  tx.category = result.category;
  tx.categorySource = result.source;
  tx.categoryConfidence = result.confidence;
  tx.categoryFingerprint = result.fingerprint;
  tx.matchedRuleId = result.matchedRuleId ?? null;
  return tx;
}

/**
 * Store user override and update the given transaction in memory.
 * Caller must persist the updated tx (e.g. via updateTransaction).
 * @param {object} tx - Transaction object (will be mutated)
 * @param {string} chosenCategory - Category enum value
 */
function recordUserCategory(tx, chosenCategory) {
  const category = ensureValidCategory(chosenCategory);
  if (!tx) return;
  const fingerprint = tx.categoryFingerprint || computeFingerprint(tx);
  const exampleMerchant = getMerchantCandidate(tx);
  upsertOverride(fingerprint, category, exampleMerchant);
  tx.category = category;
  tx.categorySource = 'OVERRIDE';
  tx.categoryConfidence = 1.0;
  tx.categoryFingerprint = fingerprint;
  tx.matchedRuleId = null;
}

export {
  normalizeMerchant,
  tokenize,
  computeFingerprint,
  getOverride,
  upsertOverride,
  classify,
  applyClassification,
  recordUserCategory,
  FALLBACK_CATEGORY,
  VALID_CATEGORIES,
};
