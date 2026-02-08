/**
 * Categories API: fetch custom categories (built-in list is in constants).
 */

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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? res.statusText ?? String(res.status);
    throw new Error(msg);
  }
  return data as T;
}

export async function getCustomCategories(): Promise<string[]> {
  const out = await api<{ custom: string[] }>('/api/categories');
  return out.custom ?? [];
}

export async function addCategory(name: string): Promise<{ name: string }> {
  return api<{ name: string }>('/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name: name.trim() }),
  });
}
