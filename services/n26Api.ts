/**
 * Frontend API client for N26 connection backend.
 * Uses relative /api when same origin or Vite proxy; base URL from env if set.
 */

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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? res.statusText ?? String(res.status));
  }
  return data as T;
}

export interface N26StatusResponse {
  connected: boolean;
}

export interface N26TokenResponse {
  success: boolean;
  expiresIn?: number;
  error?: string;
}

export interface N26DisconnectResponse {
  success: boolean;
}

export async function getN26Status(): Promise<N26StatusResponse> {
  return api<N26StatusResponse>('/api/connect/n26/status');
}

export async function postN26Token(code: string, redirectUri: string): Promise<N26TokenResponse> {
  return api<N26TokenResponse>('/api/connect/n26/token', {
    method: 'POST',
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
}

export async function postN26Disconnect(): Promise<N26DisconnectResponse> {
  return api<N26DisconnectResponse>('/api/connect/n26/disconnect', {
    method: 'POST',
  });
}
