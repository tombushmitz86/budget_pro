/**
 * N26 PSD2 OAuth: exchange authorization code for tokens.
 * Token endpoint and request format follow Berlin Group / PSD2; exact shape may vary by ASPSP.
 */

import { getTokens, setTokens, clearTokens, isConnected } from './store.js';

const N26_TOKEN_URL = process.env.N26_TOKEN_URL || '';
const N26_CLIENT_ID = process.env.N26_CLIENT_ID || '';
const N26_CLIENT_SECRET = process.env.N26_CLIENT_SECRET || '';

export function n26IsConfigured() {
  return Boolean(N26_TOKEN_URL && N26_CLIENT_ID && N26_CLIENT_SECRET);
}

/**
 * Exchange authorization code for access (and optionally refresh) token.
 * @param {string} code - Authorization code from callback
 * @param {string} redirectUri - Must match the redirect_uri used in the authorization request
 * @returns {{ success: true, expiresIn?: number } | { success: false, error: string }}
 */
export async function exchangeCodeForTokens(code, redirectUri) {
  if (!n26IsConfigured()) {
    return { success: false, error: 'N26 backend not configured (N26_TOKEN_URL, N26_CLIENT_ID, N26_CLIENT_SECRET)' };
  }
  if (!code || !redirectUri) {
    return { success: false, error: 'Missing code or redirect_uri' };
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code.trim(),
    redirect_uri: redirectUri.trim(),
    client_id: N26_CLIENT_ID,
    client_secret: N26_CLIENT_SECRET,
  });

  let res;
  try {
    res = await fetch(N26_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });
  } catch (err) {
    return { success: false, error: `Request failed: ${err.message}` };
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    return { success: false, error: `Invalid response: ${text.slice(0, 200)}` };
  }

  if (!res.ok) {
    const errMsg = data.error_description || data.error || data.message || res.statusText || String(res.status);
    return { success: false, error: errMsg };
  }

  const access_token = data.access_token;
  if (!access_token) {
    return { success: false, error: 'No access_token in response' };
  }

  const expires_in = typeof data.expires_in === 'number' ? data.expires_in : null;
  const stored = {
    access_token,
    refresh_token: data.refresh_token || null,
    token_type: data.token_type || 'Bearer',
    expires_at: expires_in ? Date.now() + expires_in * 1000 : null,
  };
  setTokens(stored);
  return { success: true, expiresIn: expires_in };
}

export function getConnectionStatus() {
  return { connected: isConnected() };
}

export function disconnectN26() {
  clearTokens();
  return { success: true };
}

/**
 * Return stored access token for use in API calls (e.g. accounts, transactions).
 * Caller should check isConnected() first.
 */
export function getAccessToken() {
  const t = getTokens();
  return t ? t.access_token : null;
}
