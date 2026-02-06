/**
 * Transactions API client (used when data source is "real").
 */

import type { Transaction } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

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
    throw new Error((data as { error?: string }).error ?? res.statusText ?? String(res.status));
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
    }),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return api(`/api/transactions/${id}`, { method: 'DELETE' });
}
