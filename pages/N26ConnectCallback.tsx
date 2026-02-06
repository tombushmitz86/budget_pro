import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useN26Connection, validateN26State } from '../context/N26ConnectionContext';

/**
 * OAuth callback for N26: reads ?code=...&state=... or ?error=... from URL,
 * validates state, completes or fails connection, then redirects to Settings.
 */
export const N26ConnectCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeConnection, failConnection } = useN26Connection();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description') ?? undefined;

    if (errorParam) {
      failConnection(errorDescription ?? errorParam);
      navigate('/settings', { replace: true });
      return;
    }

    if (code && state) {
      if (!validateN26State(state)) {
        failConnection('Invalid state – please try connecting again.');
        navigate('/settings', { replace: true });
        return;
      }
      const p = completeConnection(code);
      if (p && typeof p.then === 'function') {
        p.then(() => navigate('/settings', { replace: true })).catch(() => navigate('/settings', { replace: true }));
      } else {
        navigate('/settings', { replace: true });
      }
      return;
    }

    // No code and no error – invalid callback
    failConnection('Missing authorization code.');
    navigate('/settings', { replace: true });
  }, [searchParams, navigate, completeConnection, failConnection]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-[#9db9a6] text-sm font-bold uppercase tracking-widest">Completing N26 connection…</p>
    </div>
  );
};
