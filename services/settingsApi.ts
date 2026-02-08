/**
 * User settings API. Load/save preferred_currency etc. from DB.
 */

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '' : 'http://localhost:3001');

export type UserSettings = {
  preferred_currency?: 'USD' | 'EUR' | 'ILS';
};

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

export async function getSettings(): Promise<UserSettings> {
  return api<UserSettings>('/api/settings');
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  return api<UserSettings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}
