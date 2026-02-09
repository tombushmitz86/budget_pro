/**
 * Transactions API client (used when data source is "real").
 * In dev, empty base uses Vite proxy (/api -> backend). In preview/build, use VITE_API_URL or default to localhost:3001.
 */

import type { Transaction } from '../types';

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '' : 'http://localhost:3001');

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? res.statusText ?? String(res.status);
    if (res.status === 404) {
      throw new Error(
        'API not found (404). Start the backend: from budget_pro run `npm run dev:all` (backend + app), or in two terminals run `npm run server` then `npm run dev`. Check backend is up: http://localhost:3001/api/health'
      );
    }
    throw new Error(msg);
  }
  return data as T;
}

export async function fetchTransactions(): Promise<Transaction[]> {
  return api<Transaction[]>('/api/transactions');
}

export async function createTransaction(tx: Omit<Transaction, 'id'> & { id?: string }): Promise<Transaction> {
  return api<Transaction>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({
      merchant: tx.merchant,
      date: tx.date,
      category: tx.category,
      amount: tx.amount,
      status: tx.status ?? 'completed',
      icon: tx.icon ?? 'receipt_long',
      paymentMethod: tx.paymentMethod,
      type: tx.type ?? 'one-time',
      recurringInterval: tx.recurringInterval,
      currency: tx.currency ?? 'EUR',
      ...(tx.id ? { id: tx.id } : {}),
    }),
  });
}

export async function updateTransaction(id: string, tx: Partial<Transaction>): Promise<Transaction> {
  return api<Transaction>(`/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      merchant: tx.merchant,
      date: tx.date,
      category: tx.category,
      amount: tx.amount,
      status: tx.status,
      icon: tx.icon,
      paymentMethod: tx.paymentMethod,
      type: tx.type,
      recurringInterval: tx.recurringInterval,
      currency: tx.currency ?? 'EUR',
      categoryFingerprint: tx.categoryFingerprint,
      categorySource: tx.categorySource,
      categoryConfidence: tx.categoryConfidence,
      matchedRuleId: tx.matchedRuleId,
    }),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return api(`/api/transactions/${id}`, { method: 'DELETE' });
}

export async function clearAllTransactions(): Promise<{ deleted: number }> {
  return api<{ deleted: number }>('/api/transactions', { method: 'DELETE' });
}

/** Import transactions from JSON (e.g. snapshot). Body: { transactions, paymentMethod? }. */
export async function importJson(
  transactions: Array<Record<string, unknown>>,
  paymentMethod?: string
): Promise<ImportResult> {
  const body: { transactions: Array<Record<string, unknown>>; paymentMethod?: string } = { transactions };
  if (paymentMethod != null && String(paymentMethod).trim()) {
    body.paymentMethod = paymentMethod.trim();
  }
  return api<ImportResult>('/api/transactions/import-json', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type ImportResult = { created: number; skipped: number; transactions: Transaction[] };

export type ImportDryRunResult = {
  transactions: Array<{ id?: string; date: string; merchant: string; amount: number }>;
  wouldCreate: number;
  wouldSkip: number;
};

export type ImportCsvOptions = { paymentMethod?: string };

export type ImportXlsxOptions = { paymentMethod?: string; source?: 'bcc' };

export async function importCsvDryRun(csv: string): Promise<ImportDryRunResult> {
  return api<ImportDryRunResult>('/api/transactions/import/dry-run', {
    method: 'POST',
    body: JSON.stringify({ csv }),
  });
}

export async function importXlsxDryRun(base64: string, source?: 'bcc'): Promise<ImportDryRunResult> {
  const body: { data: string; source?: string } = { data: base64 };
  if (source === 'bcc') body.source = 'bcc';
  return api<ImportDryRunResult>('/api/transactions/import-xlsx/dry-run', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function importCsv(csv: string, options?: ImportCsvOptions): Promise<ImportResult> {
  const body: { csv: string; paymentMethod?: string } = { csv };
  if (options?.paymentMethod != null && options.paymentMethod.trim()) {
    body.paymentMethod = options.paymentMethod.trim();
  }
  return api<ImportResult>('/api/transactions/import', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function importXlsx(base64: string, options?: ImportXlsxOptions): Promise<ImportResult> {
  const body: { data: string; paymentMethod?: string; source?: string } = { data: base64 };
  if (options?.paymentMethod != null && options.paymentMethod.trim()) {
    body.paymentMethod = options.paymentMethod.trim();
  }
  if (options?.source === 'bcc') {
    body.source = 'bcc';
  }
  return api<ImportResult>('/api/transactions/import-xlsx', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type ApplyRulesChange = {
  id: string;
  merchant: string;
  date: string;
  currentCategory: string;
  suggestedCategory: string;
  source: string;
};

export type ApplyRulesDryRunResult = { changes: ApplyRulesChange[] };

export async function applyRulesDryRun(): Promise<ApplyRulesDryRunResult> {
  return api<ApplyRulesDryRunResult>('/api/transactions/apply-rules/dry-run', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
