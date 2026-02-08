import React, { useState, useEffect } from 'react';
import { getMerchantOverrides, type MerchantOverride } from '../services/merchantOverridesApi';
import { CATEGORY_DISPLAY_LABELS } from '../constants';

const categoryLabel = (c: string) => (CATEGORY_DISPLAY_LABELS as Record<string, string>)[c] ?? c;

export const MerchantRules = () => {
  const [list, setList] = useState<MerchantOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = () => {
    setLoading(true);
    setError(null);
    getMerchantOverrides()
      .then(setList)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-5xl font-black leading-tight tracking-tighter uppercase italic">Merchant rules</h1>
          <p className="text-[#9db9a6] text-sm font-medium tracking-wide">
            Rules applied when classifying transactions. Change a transaction’s category on the Transactions page (with <strong>Real data</strong>) to save a rule here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchList()}
          disabled={loading}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-[10px] font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-card rounded-3xl border border-white/5 p-12 flex flex-col items-center gap-4">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[#9db9a6] text-sm font-bold uppercase tracking-widest">Loading rules…</p>
        </div>
      ) : list.length === 0 ? (
        <div className="glass-card rounded-3xl border border-white/5 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-white/20">rule</span>
          <p className="text-white font-black uppercase tracking-widest mt-4">No merchant rules yet</p>
          <p className="text-[#9db9a6] text-sm mt-2">
            Use <strong>Real data (database)</strong> in Settings, then change a transaction’s category on the Transactions page to save a rule for that merchant.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-white/5 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Merchant (example)</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Category</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {list.map((row) => (
                <tr key={row.fingerprint} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-4">
                    <p className="text-sm font-black text-white">
                      {row.example_merchant || row.fingerprint.slice(0, 12) + '…'}
                    </p>
                  </td>
                  <td className="px-8 py-4">
                    <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                      {categoryLabel(row.category)}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    {row.updated_at ? new Date(row.updated_at).toLocaleDateString(undefined, { dateStyle: 'short' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
