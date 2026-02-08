
import React, { useState } from 'react';
import { TRANSACTIONS, BUDGETS, ASSETS, PAYMENT_METHODS } from '../constants';
import { AppSnapshot, PaymentMethod, Currency } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useN26Connection } from '../context/N26ConnectionContext';
import { useDataSource } from '../context/DataSourceContext';
import { clearAllTransactions } from '../services/transactionsApi';

export const Settings = () => {
  const { currency, setCurrency } = useCurrency();
  const { mode: dataSourceMode, setMode: setDataSourceMode } = useDataSource();
  const {
    connected: n26Connected,
    error: n26Error,
    isConnecting: n26Connecting,
    startConnect: n26StartConnect,
    completeConnection: n26CompleteConnection,
    failConnection: n26FailConnection,
    disconnect: n26Disconnect,
    clearError: n26ClearError,
    hasOAuthConfig: n26HasOAuthConfig,
  } = useN26Connection();
  const [methods, setMethods] = useState<PaymentMethod[]>(PAYMENT_METHODS);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethod, setNewMethod] = useState<Partial<PaymentMethod>>({ type: 'bank', icon: 'account_balance' });
  const [importText, setImportText] = useState('');
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const handleDump = () => {
    const snapshot: AppSnapshot = {
      transactions: TRANSACTIONS,
      budgets: BUDGETS,
      assets: ASSETS,
      paymentMethods: methods,
      version: "1.0.0",
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budgetpro_snapshot_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    setShowSuccess('Snapshot downloaded successfully');
    setTimeout(() => setShowSuccess(null), 3000);
  };

  const handleBlueprintExport = () => {
    const manifest = {
      instructions: "ACT AS A SENIOR SOFTWARE ARCHITECT. The following is the current architectural state and data model of my BudgetPro application. Index this blueprint to ensure consistency across future modules. The application is completely decoupled from external AI APIs and uses an IntelligenceService interface for all smart features.",
      architecture: {
        serviceModel: "IntelligenceService (Agnostic)",
        routing: "React Router v7",
        theming: "Tailwind CSS (Institutional Dark Mode)",
        stateManagement: "Local State (Immutable Defaults)"
      },
      appState: {
        transactionsCount: TRANSACTIONS.length,
        activeAccounts: methods.map(m => m.name),
        sampleData: TRANSACTIONS.slice(0, 3),
        fullSnapshot: {
          transactions: TRANSACTIONS,
          budgets: BUDGETS,
          assets: ASSETS,
          paymentMethods: methods
        }
      }
    };
    
    const text = JSON.stringify(manifest, null, 2);
    navigator.clipboard.writeText(text);
    setShowSuccess('System Blueprint copied to clipboard!');
    setTimeout(() => setShowSuccess(null), 3000);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText) as AppSnapshot;
      if (!parsed.transactions || !parsed.paymentMethods) throw new Error("Invalid format");
      
      console.log("Importing:", parsed);
      setMethods(parsed.paymentMethods);
      setImportText('');
      setShowSuccess('Ledger data synchronized successfully');
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (e) {
      alert("Invalid JSON snapshot provided.");
    }
  };

  const handleAddMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethod.name) return;

    const method: PaymentMethod = {
      id: `pm-${Date.now()}`,
      name: newMethod.name,
      type: newMethod.type as any || 'bank',
      icon: newMethod.type === 'card' ? 'credit_card' : 
            newMethod.type === 'wallet' ? 'account_balance_wallet' : 
            newMethod.type === 'cash' ? 'payments' : 'account_balance'
    };

    setMethods([...methods, method]);
    setNewMethod({ type: 'bank', icon: 'account_balance' });
    setShowAddMethod(false);
    setShowSuccess('New payment source integrated');
    setTimeout(() => setShowSuccess(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-white text-5xl font-black leading-tight tracking-tighter uppercase italic">System Control</h1>
        <p className="text-[#9db9a6] text-sm font-medium tracking-wide">Configure your financial ecosystem and manage data portability.</p>
      </div>

      {showSuccess && (
        <div className="bg-primary/10 border border-primary/30 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <p className="text-primary text-[10px] font-black uppercase tracking-widest">{showSuccess}</p>
        </div>
      )}

      {n26Error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center justify-between gap-3">
          <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{n26Error}</p>
          <button type="button" onClick={n26ClearError} className="text-red-400 hover:text-white p-1">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* Data source: Mock vs Real (database) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">storage</span>
          </div>
          <h2 className="text-white text-xl font-black uppercase tracking-widest italic">Data source</h2>
        </div>
        <div className="glass-card p-8 rounded-3xl border border-white/5 space-y-4">
          <p className="text-[#9db9a6] text-xs leading-relaxed">
            Use mock data (in-memory, sample transactions) or real data from the database. With real data, everything starts empty until transactions are loaded or created.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDataSourceMode('mock')}
              className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all border ${
                dataSourceMode === 'mock'
                  ? 'bg-primary text-background-dark border-primary shadow-lg shadow-primary/20'
                  : 'bg-white/5 text-[#9db9a6] border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              Mock data
            </button>
            <button
              type="button"
              onClick={() => setDataSourceMode('real')}
              className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all border ${
                dataSourceMode === 'real'
                  ? 'bg-primary text-background-dark border-primary shadow-lg shadow-primary/20'
                  : 'bg-white/5 text-[#9db9a6] border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              Real data (database)
            </button>
          </div>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
            Current: {dataSourceMode === 'mock' ? 'Mock data' : 'Real data (database)'}
          </p>
          {dataSourceMode === 'real' && (
            <p className="text-primary/80 text-xs font-medium">
              Database is empty until transactions are loaded or created. Use the Transactions page to add entries.
            </p>
          )}
          {dataSourceMode === 'real' && (
            <div className="pt-4 mt-4 border-t border-white/5">
              <p className="text-[#9db9a6] text-xs leading-relaxed mb-3">Remove every transaction from the database. This cannot be undone.</p>
              {clearError && (
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-2">{clearError}</p>
              )}
              <button
                type="button"
                disabled={clearLoading}
                onClick={async () => {
                  if (!window.confirm('Clear all transactions from the database? This cannot be undone.')) return;
                  setClearError(null);
                  setClearLoading(true);
                  try {
                    const { deleted } = await clearAllTransactions();
                    setShowSuccess(`Cleared ${deleted} transaction${deleted !== 1 ? 's' : ''} from the database.`);
                    setTimeout(() => setShowSuccess(null), 4000);
                  } catch (err) {
                    setClearError(err instanceof Error ? err.message : 'Failed to clear. Is the server running?');
                  } finally {
                    setClearLoading(false);
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-black uppercase tracking-widest hover:bg-red-500/30 hover:text-red-300 transition-all disabled:opacity-50"
              >
                {clearLoading ? (
                  <>
                    <div className="size-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    Clearing…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">delete_forever</span>
                    Clear all transactions
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* N26 account */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#36a18b]/10 flex items-center justify-center text-[#36a18b]">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <h2 className="text-white text-xl font-black uppercase tracking-widest italic">N26 Account</h2>
        </div>
        <div className="glass-card p-8 rounded-3xl border border-white/5 space-y-4">
          <p className="text-[#9db9a6] text-xs leading-relaxed">
            Connect your N26 bank account to sync transactions. Authorization uses OAuth 2.0 (PSD2). Without backend config, a demo consent is shown.
          </p>
          {n26Connected ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#36a18b]/20 border border-[#36a18b]/30">
                <span className="size-2 rounded-full bg-[#36a18b] animate-pulse" />
                <span className="text-[#36a18b] text-sm font-black uppercase tracking-widest">N26 Connected</span>
              </div>
              <button
                type="button"
                onClick={n26Disconnect}
                className="px-6 py-3 rounded-xl bg-white/5 text-[#9db9a6] text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={n26StartConnect}
              disabled={n26Connecting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#36a18b] text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {n26Connecting && n26HasOAuthConfig ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Redirecting to N26…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">link</span>
                  Connect N26
                </>
              )}
            </button>
          )}
        </div>
      </section>

      {/* Mock N26 consent modal (when no OAuth config – demo flow) */}
      {n26Connecting && !n26HasOAuthConfig && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 backdrop-blur-lg bg-black/70 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-12 rounded-xl bg-[#36a18b]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#36a18b] text-2xl">account_balance</span>
              </div>
              <h3 className="text-white text-lg font-black uppercase tracking-tight">N26 Authorization</h3>
            </div>
            <p className="text-[#9db9a6] text-sm leading-relaxed mb-6">
              BudgetPro would like to access your N26 account balances and transactions (read-only). This is a demo flow; in production you would be redirected to N26 to sign in.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => n26FailConnection('Cancelled')}
                className="flex-1 py-3 rounded-xl bg-white/5 text-[#9db9a6] text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => n26CompleteConnection()}
                className="flex-1 py-3 rounded-xl bg-[#36a18b] text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
              >
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Display currency */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">attach_money</span>
          </div>
          <h2 className="text-white text-xl font-black uppercase tracking-widest italic">Display Currency</h2>
        </div>
        <div className="glass-card p-8 rounded-3xl border border-white/5 space-y-4">
          <p className="text-[#9db9a6] text-xs leading-relaxed">Transaction amounts are stored in EUR (each transaction has a currency field). Amounts are shown in your selected display currency. Your choice is saved in the database (user settings) and used across the app.</p>
          <div className="flex flex-wrap gap-3">
            {(['USD', 'EUR', 'ILS'] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border ${
                  currency === c
                    ? 'bg-primary text-background-dark border-primary shadow-lg shadow-primary/20'
                    : 'bg-white/5 text-[#9db9a6] border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                {c === 'USD' ? 'USD ($)' : c === 'EUR' ? 'Euro (€)' : 'ILS (₪)'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Current: {currency}</p>
        </div>
      </section>

      {/* Developer System Blueprint Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">terminal</span>
          </div>
          <h2 className="text-white text-xl font-black uppercase tracking-widest italic">Developer Orchestration</h2>
        </div>

        <div className="glass-card p-8 rounded-3xl border-2 border-primary/20 bg-primary/[0.02] flex flex-col md:flex-row items-center gap-8 group">
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-primary font-black text-sm uppercase italic mb-2 tracking-widest">System Blueprint Export</p>
              <p className="text-gray-400 text-xs leading-relaxed">Generates a technical manifest describing the application state and architecture. Paste this into any AI-integrated IDE (like Cursor) to continue building with perfect context.</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-lg border border-white/5">
                 <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                 <span className="text-[9px] font-black uppercase text-gray-500">Decoupled Architecture</span>
               </div>
               <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-lg border border-white/5">
                 <span className="material-symbols-outlined text-[10px] text-gray-500">inventory_2</span>
                 <span className="text-[9px] font-black uppercase text-gray-500">v1.1.0-agnostic</span>
               </div>
            </div>
          </div>
          <button 
            onClick={handleBlueprintExport}
            className="shrink-0 px-8 py-5 rounded-2xl bg-primary text-background-dark font-black text-[12px] uppercase tracking-[0.15em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-3"
          >
            <span className="material-symbols-outlined font-bold">account_tree</span>
            Export Blueprint
          </button>
        </div>
      </section>

      {/* Snapshot Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">database</span>
          </div>
          <h2 className="text-white text-xl font-black uppercase tracking-widest italic">Ledger Snapshots</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-8 rounded-3xl border border-white/5 space-y-6">
            <div>
              <p className="text-white font-black text-sm uppercase italic mb-2">Dump Snapshot</p>
              <p className="text-gray-500 text-xs leading-relaxed">Extract a complete high-fidelity JSON representation of your transactions, assets, and budgets for cold storage or migration.</p>
            </div>
            <button 
              onClick={handleDump}
              className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Generate JSON Export
            </button>
          </div>

          <div className="glass-card p-8 rounded-3xl border border-white/5 space-y-6">
            <div>
              <p className="text-white font-black text-sm uppercase italic mb-2">Import Snapshot</p>
              <p className="text-gray-500 text-xs leading-relaxed">Restore your entire ecosystem from a previous export. Warning: This will override current session data.</p>
            </div>
            <textarea 
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste snapshot JSON here..."
              className="w-full h-24 bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] font-mono text-primary placeholder:text-gray-700 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
            />
            <button 
              onClick={handleImport}
              disabled={!importText}
              className="w-full py-4 rounded-2xl bg-primary text-background-dark text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">upload</span>
              Synchronize Ledger
            </button>
          </div>
        </div>
      </section>

      {/* Payment Methods Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <h2 className="text-white text-xl font-black uppercase tracking-widest italic">Integrated Accounts</h2>
          </div>
          <button 
            onClick={() => setShowAddMethod(true)}
            className="px-6 py-2 rounded-xl bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span> Add Account
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {methods.map((pm) => (
            <div key={pm.id} className="glass-card p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-primary/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-black/40 flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-2xl">{pm.icon}</span>
                </div>
                <div>
                  <p className="text-white font-black text-sm leading-none">{pm.name}</p>
                  <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mt-1.5">{pm.type}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-800 group-hover:text-gray-600 transition-colors">drag_indicator</span>
            </div>
          ))}
        </div>
      </section>

      {/* Add Method Modal */}
      {showAddMethod && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-lg bg-black/70 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden scale-in-center">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-white text-xl font-black uppercase italic tracking-widest">Add Payment Source</h3>
                <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-widest mt-1">Configure new financial endpoint</p>
              </div>
              <button onClick={() => setShowAddMethod(false)} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddMethod} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Account Name</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    placeholder="e.g. Revolut Business, Chase Sapphire"
                    value={newMethod.name || ''}
                    onChange={(e) => setNewMethod({...newMethod, name: e.target.value})}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Source Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['bank', 'card', 'wallet', 'cash'].map(type => (
                      <button 
                        key={type}
                        type="button"
                        onClick={() => setNewMethod({...newMethod, type: type as any})}
                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${newMethod.type === type ? 'bg-primary text-background-dark border-primary shadow-lg shadow-primary/10' : 'bg-white/5 text-gray-500 border-white/5 hover:text-white'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddMethod(false)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 rounded-2xl bg-primary text-background-dark font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
                >
                  Integrate Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
