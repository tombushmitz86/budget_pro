import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getN26Status, postN26Token, postN26Disconnect } from '../services/n26Api';

const STORAGE_KEY = 'budgetpro_n26_connected';
const STATE_KEY = 'budgetpro_n26_oauth_state';

/** Optional OAuth config (from env or backend). If set, we redirect to N26; otherwise mock flow. */
export interface N26OAuthConfig {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
}

function getStoredConnected(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getOAuthConfig(): N26OAuthConfig | null {
  const authUrl = import.meta.env.VITE_N26_AUTH_URL;
  const clientId = import.meta.env.VITE_N26_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_N26_REDIRECT_URI;
  if (authUrl && clientId && redirectUri) {
    return {
      authorizationEndpoint: authUrl,
      clientId,
      redirectUri,
      scope: import.meta.env.VITE_N26_SCOPE ?? 'AIS',
    };
  }
  return null;
}

function generateState(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

interface N26ConnectionContextValue {
  /** True if user has completed N26 authorization (real or mock). */
  connected: boolean;
  /** Last error message from connect/callback. */
  error: string | null;
  /** True while redirect or mock consent is in progress. */
  isConnecting: boolean;
  /** Start N26 authorization: redirect to N26 (if config set) or open mock consent. */
  startConnect: () => void;
  /** Called from callback page with ?code=... or from mock consent. Completes connection. Returns Promise when using backend. */
  completeConnection: (code?: string) => void | Promise<void>;
  /** Called from callback page when ?error=... is present. */
  failConnection: (errorMessage: string) => void;
  /** Disconnect N26 and clear stored state. */
  disconnect: () => void;
  clearError: () => void;
  /** True when OAuth config is set (real N26 redirect). */
  hasOAuthConfig: boolean;
}

const N26ConnectionContext = createContext<N26ConnectionContextValue | null>(null);

export function N26ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(getStoredConnected);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasFetchedStatus, setHasFetchedStatus] = useState(false);

  // Sync connection state from backend on mount (backend is source of truth when OAuth is used)
  useEffect(() => {
    let cancelled = false;
    getN26Status()
      .then((res) => {
        if (!cancelled && res.connected) setConnected(true);
      })
      .catch(() => {
        // Backend unreachable: keep localStorage as fallback (demo mode)
      })
      .finally(() => {
        if (!cancelled) setHasFetchedStatus(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, connected ? 'true' : 'false');
    } catch (_) {}
  }, [connected]);

  const clearError = useCallback(() => setError(null), []);

  const disconnect = useCallback(async () => {
    try {
      await postN26Disconnect();
    } catch (_) {}
    setConnected(false);
    setError(null);
    try {
      sessionStorage.removeItem(STATE_KEY);
      localStorage.setItem(STORAGE_KEY, 'false');
    } catch (_) {}
  }, []);

  const completeConnection = useCallback((code?: string): void | Promise<void> => {
    const config = getOAuthConfig();
    if (config && code) {
      // Real OAuth: exchange code for tokens on backend; return Promise so callback can await
      return postN26Token(code, config.redirectUri)
        .then((res) => {
          if (res.success) {
            setConnected(true);
            setError(null);
            setIsConnecting(false);
            try { sessionStorage.removeItem(STATE_KEY); } catch (_) {}
          } else {
            setError(res.error ?? 'Token exchange failed');
            setIsConnecting(false);
            throw new Error(res.error ?? 'Token exchange failed');
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Token exchange failed');
          setIsConnecting(false);
          throw err;
        });
    }
    // Demo: no code or no config – just mark connected
    setConnected(true);
    setError(null);
    setIsConnecting(false);
    try { sessionStorage.removeItem(STATE_KEY); } catch (_) {}
  }, []);

  const failConnection = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsConnecting(false);
    try {
      sessionStorage.removeItem(STATE_KEY);
    } catch (_) {}
  }, []);

  const startConnect = useCallback(() => {
    setError(null);
    const config = getOAuthConfig();

    if (config) {
      // Real OAuth: redirect to N26 authorization endpoint
      const state = generateState();
      try {
        sessionStorage.setItem(STATE_KEY, state);
      } catch (_) {}

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        state,
        ...(config.scope ? { scope: config.scope } : {}),
      });
      setIsConnecting(true);
      window.location.href = `${config.authorizationEndpoint}?${params.toString()}`;
      return;
    }

    // Mock/demo: no config – we'll show a consent UI; caller (Settings) opens modal and on confirm calls completeConnection()
    setIsConnecting(true);
    // Settings page will show mock consent modal and call completeConnection() or failConnection()
  }, []);

  const value: N26ConnectionContextValue = {
    connected,
    error,
    isConnecting,
    startConnect,
    completeConnection,
    failConnection,
    disconnect,
    clearError,
    hasOAuthConfig: getOAuthConfig() != null,
  };

  return (
    <N26ConnectionContext.Provider value={value}>
      {children}
    </N26ConnectionContext.Provider>
  );
}

export function useN26Connection(): N26ConnectionContextValue {
  const ctx = useContext(N26ConnectionContext);
  if (!ctx) throw new Error('useN26Connection must be used within N26ConnectionProvider');
  return ctx;
}

/** Validate OAuth state (CSRF). Returns true if state matches. */
export function validateN26State(state: string): boolean {
  try {
    const stored = sessionStorage.getItem(STATE_KEY);
    return stored != null && stored === state;
  } catch {
    return false;
  }
}
