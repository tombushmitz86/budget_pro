
import React, { useState, useMemo } from 'react';
import { TRANSACTIONS, PAYMENT_METHODS } from '../constants';
import { Transaction, Category, PaymentMethod } from '../types';
import { intelligence } from '../services/intelligenceService';

export const Transactions = () => {
  const [list, setList] = useState<Transaction[]>(TRANSACTIONS);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing-apple' | 'syncing-n26'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Filters
  const [activeAccount, setActiveAccount] = useState('All');
  const [activeType, setActiveType] = useState<'all' | 'one-time' | 'recurring'>('all');

  // In a real app we'd get these from a global state/context synced with Settings
  const methods = PAYMENT_METHODS;

  const filteredList = useMemo(() => {
    return list.filter(t => {
      const matchesSearch = t.merchant.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAccount = activeAccount === 'All' || t.paymentMethod === activeAccount;
      const matchesType = activeType === 'all' || t.type === activeType;
      return matchesSearch && matchesAccount && matchesType;
    });
  }, [list, searchQuery, activeAccount, activeType]);

  const handleSync = async (source: 'Apple' | 'N26') => {
    setSyncStatus(source === 'Apple' ? 'syncing-apple' : 'syncing-n26');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newItems = await intelligence.generateSyncTransactions(source);
    if (newItems.length > 0) {
      setList(prev => [...newItems, ...prev]);
    }
    setSyncStatus('idle');
  };

  const handleUpdateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    setList(prev => prev.map(t => t.id === editingTransaction.id ? editingTransaction : t));
    setEditingTransaction(null);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Sync Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-5xl font-black leading-tight tracking-tighter uppercase italic">Unified Ledger</h1>
          <p className="text-[#9db9a6] text-sm font-medium tracking-wide">Command center for your global financial footprint across all endpoints.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => handleSync('N26')}
            disabled={syncStatus !== 'idle'}
            className="group relative flex items-center gap-3 px-6 py-3 bg-[#36a18b] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg shadow-[#36a18b]/20"
          >
            {syncStatus === 'syncing-n26' ? (
              <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined text-lg">account_balance</span>
            )}
            <span>{syncStatus === 'syncing-n26' ? 'Connecting...' : 'Sync N26'}</span>
          </button>

          <button 
            onClick={() => handleSync('Apple')}
            disabled={syncStatus !== 'idle'}
            className="group relative flex items-center gap-3 px-6 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {syncStatus === 'syncing-apple' ? (
              <div className="size-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined text-lg">apple</span>
            )}
            <span>{syncStatus === 'syncing-apple' ? 'Authorizing...' : 'Sync Apple Pay'}</span>
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-4 rounded-3xl border border-white/5">
        <div className="flex items-center gap-3 bg-black/30 px-5 py-2.5 rounded-2xl border border-white/5 w-full md:w-auto">
          <span className="material-symbols-outlined text-[#9db9a6]">search</span>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchant or ledger entity..."
            className="bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-gray-600 w-full md:w-64"
          />
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <div className="flex bg-black/20 p-1 rounded-xl">
            {['All', 'N26', 'Apple Pay', 'Credit Card'].map(acc => (
              <button 
                key={acc}
                onClick={() => setActiveAccount(acc)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeAccount === acc ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
              >
                {acc}
              </button>
            ))}
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-2"></div>

          <div className="flex bg-black/20 p-1 rounded-xl">
            {(['all', 'one-time', 'recurring'] as const).map(type => (
              <button 
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeType === type ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'text-gray-500 hover:text-white'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-card rounded-3xl border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Entity & Date</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Method</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Category</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Cadence</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Amount</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredList.map((t) => (
              <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setEditingTransaction(t)}>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-[#9db9a6] group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">{t.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white group-hover:text-primary transition-colors">{t.merchant}</p>
                      <p className="text-[10px] text-[#9db9a6] font-bold uppercase tracking-widest mt-0.5">{t.date}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.1em] border ${t.paymentMethod === 'N26' ? 'bg-[#36a18b]/10 text-[#36a18b] border-[#36a18b]/20' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                    {t.paymentMethod}
                  </span>
                </td>
                <td className="px-8 py-6">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.category}</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-sm ${t.type === 'recurring' ? 'text-primary' : 'text-gray-600'}`}>
                      {t.type === 'recurring' ? 'sync' : 'push_pin'}
                    </span>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${t.type === 'recurring' ? 'text-primary' : 'text-gray-600'}`}>
                      {t.type}
                    </p>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <p className={`text-lg font-black tracking-tight ${t.amount > 0 ? 'text-primary' : 'text-white'}`}>
                    {t.amount > 0 ? `+$${t.amount.toLocaleString()}` : `-$${Math.abs(t.amount).toLocaleString()}`}
                  </p>
                </td>
                <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-gray-500">edit_note</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredList.length === 0 && (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-700 mb-4">search_off</span>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No matching ledger entries found.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden scale-in-center">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-white text-xl font-black uppercase italic tracking-widest">Edit Entry</h3>
                <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-widest mt-1">Transaction ID: {editingTransaction.id}</p>
              </div>
              <button onClick={() => setEditingTransaction(null)} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleUpdateTransaction} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Merchant Entity</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    value={editingTransaction.merchant}
                    onChange={(e) => setEditingTransaction({...editingTransaction, merchant: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Amount ($)</label>
                  <input 
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    value={editingTransaction.amount}
                    onChange={(e) => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Payment Source</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    value={editingTransaction.paymentMethod}
                    onChange={(e) => setEditingTransaction({...editingTransaction, paymentMethod: e.target.value as any})}
                  >
                    {methods.map(m => (
                      <option key={m.id} value={m.name} className="bg-background-dark">{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Category</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    value={editingTransaction.category}
                    onChange={(e) => setEditingTransaction({...editingTransaction, category: e.target.value as any})}
                  >
                    {['Housing', 'Food & Dining', 'Transport', 'Utilities', 'Electronics', 'Health', 'Entertainment', 'Income', 'Shopping'].map(c => (
                      <option key={c} value={c} className="bg-background-dark">{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Transaction Cadence</label>
                  <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                    <button 
                      type="button"
                      onClick={() => setEditingTransaction({...editingTransaction, type: 'one-time'})}
                      className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${editingTransaction.type === 'one-time' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                      One-Time
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditingTransaction({...editingTransaction, type: 'recurring'})}
                      className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${editingTransaction.type === 'recurring' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                    >
                      Recurring
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Discard Changes
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 rounded-2xl bg-primary text-background-dark font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
                >
                  Commit Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
