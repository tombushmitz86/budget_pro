/**
 * BudgetPro API server: N26 connection, transactions DB.
 * Run: node server/index.js (or npm run server)
 * Loads .env from project root if present.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  exchangeCodeForTokens,
  getConnectionStatus,
  disconnectN26,
  n26IsConfigured,
} from './n26.js';
import { initDb } from './db.js';
import { listTransactions, createTransaction, updateTransaction, deleteTransaction, deleteAllTransactions } from './transactionsDb.js';
import { parseCsvToTransactions, stableIdForRow } from './csvImport.js';
import { parseXlsxToTransactions, parseBccXlsxToTransactions } from './xlsxImport.js';
import { getSettings, updateSettings } from './settingsDb.js';
import { getCustomCategories, addCustomCategory } from './categoriesDb.js';
import { listMerchantOverrides } from './merchantOverridesDb.js';
import { classify, backfillMerchantOverrideStems } from './transactionClassifier.js';

initDb();
backfillMerchantOverrideStems();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check (verify server is responding)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/connect/n26/token', async (req, res) => {
  const { code, redirect_uri: redirectUri } = req.body || {};
  const result = await exchangeCodeForTokens(code, redirectUri);
  if (result.success) {
    return res.json({ success: true, expiresIn: result.expiresIn });
  }
  return res.status(400).json({ success: false, error: result.error });
});

app.get('/api/connect/n26/status', (_req, res) => {
  const status = getConnectionStatus();
  res.json(status);
});

app.post('/api/connect/n26/disconnect', (_req, res) => {
  disconnectN26();
  res.json({ success: true });
});

app.get('/api/connect/n26/config', (_req, res) => {
  res.json({ configured: n26IsConfigured() });
});

// User settings (preferred_currency, etc.)
app.get('/api/settings', (_req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (err) {
    console.error('GET /api/settings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const body = req.body || {};
    const settings = updateSettings(body);
    res.json(settings);
  } catch (err) {
    console.error('PUT /api/settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Categories: built-in + custom (for dropdowns and validation)
app.get('/api/categories', (_req, res) => {
  try {
    const custom = getCustomCategories();
    res.json({ custom });
  } catch (err) {
    console.error('GET /api/categories:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const name = req.body?.name != null ? String(req.body.name).trim() : '';
    if (!name) return res.status(400).json({ error: 'name is required' });
    const added = addCustomCategory(name);
    res.status(201).json({ name: added ?? name });
  } catch (err) {
    console.error('POST /api/categories:', err);
    res.status(500).json({ error: err.message });
  }
});

// Merchant rules (overrides: fingerprint -> category). Support both paths for proxy compatibility.
function handleGetMerchantOverrides(_req, res) {
  try {
    const rows = listMerchantOverrides();
    const list = rows.map((r) => ({
      fingerprint: r.fingerprint,
      category: r.category,
      example_merchant: r.example_merchant ?? r.exampleMerchant ?? null,
      updated_at: r.updated_at ?? r.updatedAt ?? '',
    }));
    res.json(list);
  } catch (err) {
    console.error('GET /api/merchant-overrides:', err);
    res.status(500).json({ error: err.message });
  }
}
app.get('/api/merchant-overrides', handleGetMerchantOverrides);
app.get('/api/merchant_overrides', handleGetMerchantOverrides);

// Apply category rules: dry run (what would change)
app.post('/api/transactions/apply-rules/dry-run', (_req, res) => {
  try {
    const transactions = listTransactions();
    const changes = [];
    for (const tx of transactions) {
      const result = classify(tx);
      if (result.category !== tx.category) {
        changes.push({
          id: tx.id,
          merchant: tx.merchant,
          date: tx.date,
          currentCategory: tx.category,
          suggestedCategory: result.category,
          source: result.source || 'RULE',
        });
      }
    }
    res.json({ changes });
  } catch (err) {
    console.error('POST /api/transactions/apply-rules/dry-run:', err);
    res.status(500).json({ error: err.message });
  }
});

// Transactions (real data from DB)
app.get('/api/transactions', (_req, res) => {
  try {
    const list = listTransactions();
    res.json(list);
  } catch (err) {
    console.error('GET /api/transactions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
    const body = req.body || {};
    const created = createTransaction({
      id: body.id,
      merchant: body.merchant,
      date: body.date,
      category: body.category,
      amount: body.amount,
      status: body.status ?? 'completed',
      icon: body.icon ?? 'receipt_long',
      paymentMethod: body.paymentMethod ?? body.payment_method,
      type: body.type ?? 'one-time',
      recurringInterval: body.recurringInterval ?? body.recurring_interval,
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/transactions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const updated = updateTransaction(id, {
      merchant: body.merchant,
      date: body.date,
      category: body.category,
      amount: body.amount,
      status: body.status,
      icon: body.icon,
      paymentMethod: body.paymentMethod ?? body.payment_method,
      type: body.type,
      recurringInterval: body.recurringInterval ?? body.recurring_interval,
      categoryFingerprint: body.categoryFingerprint,
      categorySource: body.categorySource,
      categoryConfidence: body.categoryConfidence,
      matchedRuleId: body.matchedRuleId,
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/transactions/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteTransaction(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /api/transactions/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions', (_req, res) => {
  try {
    const deleted = deleteAllTransactions();
    res.json({ deleted });
  } catch (err) {
    console.error('DELETE /api/transactions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import dry-run: parse only, return list of transactions that would be created (no insert).
app.post('/api/transactions/import/dry-run', (req, res) => {
  try {
    let csvText = '';
    if (typeof req.body === 'string') {
      csvText = req.body;
    } else if (req.body && typeof req.body === 'object' && typeof req.body.csv === 'string') {
      csvText = req.body.csv;
    }
    const parsed = parseCsvToTransactions(csvText);
    const existingIds = new Set(listTransactions().map((t) => t.id));
    const toCreate = parsed.filter((tx) => !existingIds.has(tx.id));
    res.json({
      transactions: toCreate,
      wouldCreate: toCreate.length,
      wouldSkip: parsed.length - toCreate.length,
    });
  } catch (err) {
    console.error('POST /api/transactions/import/dry-run:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions/import-xlsx/dry-run', (req, res) => {
  try {
    let base64 = '';
    let source = '';
    if (req.body && typeof req.body === 'object') {
      if (typeof req.body.data === 'string') base64 = req.body.data;
      if (req.body.source != null && String(req.body.source).toLowerCase() === 'bcc') source = 'bcc';
    }
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid body.data (base64)' });
    }
    const parsed = source === 'bcc' ? parseBccXlsxToTransactions(buffer) : parseXlsxToTransactions(buffer);
    const existingIds = new Set(listTransactions().map((t) => t.id));
    const toCreate = parsed.filter((tx) => !existingIds.has(tx.id));
    res.json({
      transactions: toCreate,
      wouldCreate: toCreate.length,
      wouldSkip: parsed.length - toCreate.length,
    });
  } catch (err) {
    console.error('POST /api/transactions/import-xlsx/dry-run:', err);
    res.status(500).json({ error: err.message });
  }
});

// JSON Import: body { transactions: [ { merchant, date, amount, ... } ], paymentMethod?: "..." }. Idempotent: uses id if provided, else stable id from date+time+amount+merchant.
function normalizeTxFromJson(tx) {
  const dateStr = tx.date != null ? String(tx.date).trim() : '';
  let dateOnly = dateStr.slice(0, 10);
  let timeStr = '';
  if (dateStr.length > 10) {
    const rest = dateStr.slice(10).replace(/^[T\s]+/, '');
    if (/\d{1,2}:\d{2}/.test(rest)) timeStr = rest.slice(0, 8).padEnd(8, '0');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    try {
      const d = new Date(tx.date);
      if (!Number.isNaN(d.getTime())) {
        dateOnly = d.toISOString().slice(0, 10);
        timeStr = d.toISOString().slice(11, 19);
      }
    } catch (_) {}
  }
  const amount = Number(tx.amount);
  const merchant = (tx.merchant != null ? String(tx.merchant).trim() : '') || 'Unknown';
  const id = tx.id && String(tx.id).trim() ? String(tx.id).trim() : stableIdForRow(dateOnly, Number.isNaN(amount) ? 0 : amount, merchant, timeStr);
  return {
    id,
    merchant,
    date: dateOnly,
    amount: Number.isNaN(amount) ? 0 : amount,
    type: tx.type === 'recurring' ? 'recurring' : 'one-time',
    paymentMethod: tx.paymentMethod ?? tx.payment_method ?? 'JSON Import',
    status: tx.status ?? 'completed',
    icon: tx.icon ?? 'receipt_long',
    category: tx.category ?? undefined,
  };
}

app.post('/api/transactions/import-json', (req, res) => {
  try {
    let transactions = [];
    let paymentMethodOverride = null;
    if (req.body && typeof req.body === 'object') {
      if (Array.isArray(req.body.transactions)) transactions = req.body.transactions;
      else if (Array.isArray(req.body)) transactions = req.body;
      if (req.body.paymentMethod != null && String(req.body.paymentMethod).trim()) {
        paymentMethodOverride = String(req.body.paymentMethod).trim();
      }
    }
    const normalized = transactions.map(normalizeTxFromJson).filter((tx) => tx.merchant || tx.amount !== 0);
    const existingIds = new Set(listTransactions().map((t) => t.id));
    const toCreate = normalized.filter((tx) => !existingIds.has(tx.id));
    const created = [];
    for (const tx of toCreate) {
      const toInsert = paymentMethodOverride ? { ...tx, paymentMethod: paymentMethodOverride } : tx;
      const saved = createTransaction(toInsert);
      created.push(saved);
    }
    const skipped = normalized.length - created.length;
    res.status(201).json({
      created: created.length,
      skipped,
      transactions: created,
    });
  } catch (err) {
    console.error('POST /api/transactions/import-json:', err);
    res.status(500).json({ error: err.message });
  }
});

// CSV Import: body { csv: "...", paymentMethod?: "N26" | ... }. Idempotent: skip rows that already exist (same stable id).
// If paymentMethod is provided, assign it to all imported transactions.
app.post('/api/transactions/import', (req, res) => {
  try {
    let csvText = '';
    let paymentMethodOverride = null;
    if (typeof req.body === 'string') {
      csvText = req.body;
    } else if (req.body && typeof req.body === 'object') {
      if (typeof req.body.csv === 'string') csvText = req.body.csv;
      else if (typeof req.body.data === 'string') csvText = req.body.data;
      if (req.body.paymentMethod != null && String(req.body.paymentMethod).trim()) {
        paymentMethodOverride = String(req.body.paymentMethod).trim();
      }
    }
    const parsed = parseCsvToTransactions(csvText);
    const existingIds = new Set(listTransactions().map((t) => t.id));
    const toCreate = parsed.filter((tx) => !existingIds.has(tx.id));
    const created = [];
    for (const tx of toCreate) {
      const toInsert = paymentMethodOverride ? { ...tx, paymentMethod: paymentMethodOverride } : tx;
      const saved = createTransaction(toInsert);
      created.push(saved);
    }
    const skipped = parsed.length - created.length;
    res.status(201).json({
      created: created.length,
      skipped,
      transactions: created,
    });
  } catch (err) {
    console.error('POST /api/transactions/import:', err);
    res.status(500).json({ error: err.message });
  }
});

// XLSX Import: body { data: "<base64>", paymentMethod?: "...", source?: "bcc" }. source=bcc uses BCC credit card schema.
app.post('/api/transactions/import-xlsx', (req, res) => {
  try {
    let base64 = '';
    let paymentMethodOverride = null;
    let source = '';
    if (req.body && typeof req.body === 'object') {
      if (typeof req.body.data === 'string') base64 = req.body.data;
      if (req.body.paymentMethod != null && String(req.body.paymentMethod).trim()) {
        paymentMethodOverride = String(req.body.paymentMethod).trim();
      }
      if (req.body.source != null && String(req.body.source).toLowerCase() === 'bcc') source = 'bcc';
    }
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid body.data (base64-encoded file)' });
    }
    const parsed = source === 'bcc' ? parseBccXlsxToTransactions(buffer) : parseXlsxToTransactions(buffer);
    const existingIds = new Set(listTransactions().map((t) => t.id));
    const toCreate = parsed.filter((tx) => !existingIds.has(tx.id));
    const created = [];
    for (const tx of toCreate) {
      const toInsert = paymentMethodOverride ? { ...tx, paymentMethod: paymentMethodOverride } : tx;
      const saved = createTransaction(toInsert);
      created.push(saved);
    }
    const skipped = parsed.length - created.length;
    res.status(201).json({
      created: created.length,
      skipped,
      transactions: created,
    });
  } catch (err) {
    console.error('POST /api/transactions/import-xlsx:', err);
    res.status(500).json({ error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`BudgetPro API listening on http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log(`  Merchant rules: http://localhost:${PORT}/api/merchant_overrides`);
  if (!n26IsConfigured()) {
    console.warn('N26 not configured: set N26_TOKEN_URL, N26_CLIENT_ID, N26_CLIENT_SECRET for token exchange.');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use. Free it with:\n  lsof -i :${PORT}   # find PID\n  kill <PID>       # or: kill -9 <PID>\n`);
  }
  throw err;
});
