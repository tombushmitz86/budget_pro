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
import { listTransactions, createTransaction, updateTransaction, deleteTransaction } from './transactionsDb.js';

initDb();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`BudgetPro API listening on http://localhost:${PORT}`);
  if (!n26IsConfigured()) {
    console.warn('N26 not configured: set N26_TOKEN_URL, N26_CLIENT_ID, N26_CLIENT_SECRET for token exchange.');
  }
});
