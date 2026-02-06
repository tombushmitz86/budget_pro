
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { TRANSACTIONS, PAYMENT_METHODS, TRANSACTION_CATEGORIES, CATEGORY_DISPLAY_LABELS } from '../constants';
import { Transaction, PaymentMethod, Category, RecurringInterval } from '../types';
import { intelligence } from '../services/intelligenceService';
import { useCurrency } from '../context/CurrencyContext';
import { useN26Connection } from '../context/N26ConnectionContext';
import { useDataSource } from '../context/DataSourceContext';
import { fetchTransactions, createTransaction, updateTransaction, deleteTransaction } from '../services/transactionsApi';
import { Link } from 'react-router-dom';

export const Transactions = () => {
  const { formatMoney, currency } = useCurrency();
  const { connected: n26Connected } = useN26Connection();
  const { isReal } = useDataSource();
  const [list, setList] = useState<Transaction[]>(() => (isReal ? [] : TRANSACTIONS));
  const [listLoading, setListLoading] = useState(isReal);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing-apple' | 'syncing-n26'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  
  // Filters
  const [activeAccount, setActiveAccount] = useState('All');
  const [activeType, setActiveType] = useState<'all' | 'one-time' | 'recurring'>('all');

  const methods = PAYMENT_METHODS;

  const loadList = useCallback(async () => {
    if (!isReal) return;
    setListLoading(true);
    try {
      const data = await fetchTransactions();
      setList(data);
    } catch (_) {
      setList([]);
    } finally {
      setListLoading(false);
    }
  }, [isReal]);

  useEffect(() => {
    if (isReal) loadList();
    else setList(TRANSACTIONS);
  }, [isReal, loadList]);

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

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const payload = {
      ...editingTransaction,
      recurringInterval: editingTransaction.type === 'recurring' ? (editingTransaction.recurringInterval ?? 'monthly') : undefined,
    };

    if (isReal) {
      try {
        const updated = await updateTransaction(editingTransaction.id, payload);
        setList(prev => prev.map(t => t.id === updated.id ? updated : t));
      } catch (_) {
        // keep local update on error
        setList(prev => prev.map(t => t.id === editingTransaction.id ? payload : t));
      }
    } else {
      setList(prev => prev.map(t => t.id === editingTransaction.id ? payload : t));
    }
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    if (editingTransaction?.id === id) setEditingTransaction(null);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    if (isReal) {
      try {
        await deleteTransaction(id);
        setList(prev => prev.filter(t => t.id !== id));
      } catch (_) {
        // keep list as-is on error
      }
    } else {
      setList(prev => prev.filter(t => t.id !== id));
    }
  };

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const ids = filteredList.map(t => t.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id));
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(ids));
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} transaction${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    if (editingTransaction && ids.includes(editingTransaction.id)) setEditingTransaction(null);
    if (isReal) {
      try {
        await Promise.all(ids.map(id => deleteTransaction(id)));
        setList(prev => prev.filter(t => !selectedIds.has(t.id)));
      } catch (_) {
        loadList();
      }
    } else {
      setList(prev => prev.filter(t => !selectedIds.has(t.id)));
    }
    setSelectedIds(new Set());
  };

  const CATEGORIES = TRANSACTION_CATEGORIES;
  const defaultIconForCategory: Record<string, string> = {
    INCOME_SALARY: 'payments', INCOME_OTHER: 'payments', HOUSING_RENT_MORTGAGE: 'home', UTILITIES: 'bolt',
    GROCERIES: 'shopping_cart', DINING: 'restaurant', TRANSPORT_FUEL: 'directions_car', TRANSPORT_PUBLIC: 'directions_bus',
    PARKING: 'local_parking', SHOPPING: 'shopping_cart', SUBSCRIPTIONS: 'subscriptions', HEALTH: 'fitness_center',
    EDUCATION: 'school', CHILDCARE: 'child_care', ENTERTAINMENT: 'movie', TRAVEL: 'flight', INSURANCE: 'shield',
    TAXES_FEES: 'receipt', CASH_WITHDRAWAL: 'atm', TRANSFERS_INTERNAL: 'swap_horiz', TRANSFERS_EXTERNAL: 'swap_horiz',
    GIFTS_DONATIONS: 'card_giftcard', OTHER: 'receipt_long', UNCATEGORIZED: 'help_outline',
  };
  const categoryLabel = (c: string) => CATEGORY_DISPLAY_LABELS[c as Category] ?? c;

  const [newTransaction, setNewTransaction] = useState<Partial<Transaction> & { date: string; type: 'one-time' | 'recurring'; recurringInterval: RecurringInterval; transactionKind: 'expense' | 'income' }>({
    merchant: '',
    amount: 0,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    category: 'UNCATEGORIZED',
    paymentMethod: methods[0]?.name ?? 'N26',
    type: 'one-time',
    recurringInterval: 'monthly',
    transactionKind: 'expense',
    status: 'completed',
    icon: 'receipt_long',
  });

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.merchant?.trim()) return;
    const category = newTransaction.category ?? 'UNCATEGORIZED';
    const icon = defaultIconForCategory[category] ?? 'receipt_long';
    const isRecurring = newTransaction.type === 'recurring';
    const interval = newTransaction.recurringInterval ?? 'monthly';
    let amount = Math.abs(Number(newTransaction.amount) ?? 0);
    if (isRecurring && interval === 'yearly' && amount !== 0) {
      amount = amount / 12;
    }
    const kind = newTransaction.transactionKind ?? 'expense';
    amount = kind === 'expense' ? -amount : amount;
    const tx: Transaction = {
      id: `manual-${Date.now()}`,
      merchant: newTransaction.merchant.trim(),
      amount,
      date: newTransaction.date ?? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      category,
      paymentMethod: newTransaction.paymentMethod ?? methods[0]?.name ?? 'N26',
      type: newTransaction.type ?? 'one-time',
      recurringInterval: isRecurring ? interval : undefined,
      status: 'completed',
      icon,
    };
    setAddError(null);
    if (isReal) {
      try {
        const created = await createTransaction(tx);
        setList(prev => [created, ...prev]);
        setShowAddModal(false);
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Could not save to database. Is the server running (npm run server)?');
        return;
      }
    } else {
      setList(prev => [tx, ...prev]);
      setShowAddModal(false);
    }
    setNewTransaction({
      merchant: '',
      amount: 0,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      category: 'UNCATEGORIZED',
      paymentMethod: methods[0]?.name ?? 'N26',
      type: 'one-time',
      recurringInterval: 'monthly',
      transactionKind: 'expense',
      status: 'completed',
      icon: 'receipt_long',
    });
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
          {n26Connected ? (
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
              <span>{syncStatus === 'syncing-n26' ? 'Syncing…' : 'Sync N26'}</span>
            </button>
          ) : (
            <Link
              to="/settings"
              className="flex items-center gap-3 px-6 py-3 bg-white/5 text-[#9db9a6] rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] border border-white/10 hover:bg-white/10 hover:text-white transition-all"
            >
              <span className="material-symbols-outlined text-lg">link_off</span>
              Connect N26 in Settings
            </Link>
          )}

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

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 px-6 py-3 bg-primary text-background-dark rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add missing transaction
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

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/30 transition-all"
            >
              Delete {selectedIds.size}
            </button>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="glass-card rounded-3xl border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="w-12 px-4 py-5">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="flex items-center justify-center size-8 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 hover:border-primary/50 hover:text-primary transition-all"
                  title={filteredList.length > 0 && filteredList.every(t => selectedIds.has(t.id)) ? 'Deselect all' : 'Select all'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {filteredList.length > 0 && filteredList.every(t => selectedIds.has(t.id)) ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                </button>
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Entity & Date</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Method</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Category</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Cadence</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Amount</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {listLoading ? (
              <tr>
                <td colSpan={7} className="px-8 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#9db9a6] text-sm font-bold uppercase tracking-widest">Loading transactions…</p>
                  </div>
                </td>
              </tr>
            ) : (
            filteredList.map((t) => (
              <tr key={t.id} className={`group hover:bg-white/[0.02] transition-colors cursor-pointer ${selectedIds.has(t.id) ? 'bg-primary/5' : ''}`} onClick={() => setEditingTransaction({ ...t, recurringInterval: t.type === 'recurring' ? (t.recurringInterval ?? 'monthly') : undefined })}>
                <td className="w-12 px-4 py-6" onClick={e => toggleSelect(t.id, e)}>
                  <button
                    type="button"
                    className="flex items-center justify-center size-8 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 hover:border-primary/50 hover:text-primary transition-all"
                    aria-label={selectedIds.has(t.id) ? 'Deselect' : 'Select'}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {selectedIds.has(t.id) ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                  </button>
                </td>
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
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{categoryLabel(t.category)}</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-sm ${t.type === 'recurring' ? 'text-primary' : 'text-gray-600'}`}>
                      {t.type === 'recurring' ? 'sync' : 'push_pin'}
                    </span>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${t.type === 'recurring' ? 'text-primary' : 'text-gray-600'}`}>
                      {t.type === 'recurring' && t.recurringInterval === 'yearly' ? 'recurring (yr)' : t.type}
                    </p>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <p className={`text-lg font-black tracking-tight ${t.amount > 0 ? 'text-primary' : 'text-white'}`}>
                    {t.type === 'recurring' && t.recurringInterval === 'yearly'
                      ? `${t.amount > 0 ? '+' : ''}${formatMoney(t.amount)}/mo (${formatMoney(t.amount * 12)}/yr)`
                      : t.amount > 0 ? `+${formatMoney(t.amount)}` : formatMoney(t.amount)}
                  </p>
                </td>
                <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-gray-500">edit_note</span>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
        {!listLoading && filteredList.length === 0 && (
          <div className="p-20 text-center">
            {list.length === 0 && isReal ? (
              <>
                <span className="material-symbols-outlined text-4xl text-primary/40 mb-4">inbox</span>
                <p className="text-[#9db9a6] font-bold uppercase tracking-widest text-xs">Database is empty</p>
                <p className="text-gray-500 text-xs mt-1">Add a transaction above or load data in the next steps.</p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-4xl text-gray-700 mb-4">search_off</span>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No matching ledger entries found.</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add missing transaction modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden scale-in-center">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-white text-xl font-black uppercase italic tracking-widest">Add missing transaction</h3>
                <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-widest mt-1">From another source – mark as fixed (recurring) or one-time</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setAddError(null); }} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {!isReal && (
              <div className="mx-8 mb-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10px] font-bold uppercase tracking-widest">
                Mock data: transactions are not saved to the database. Switch to <strong>Real data (DB)</strong> in the bar above to persist.
              </div>
            )}
            {addError && (
              <div className="mx-8 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-[10px] font-bold uppercase tracking-widest">
                {addError}
              </div>
            )}
            <form onSubmit={handleAddTransaction} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Merchant / description</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-gray-600"
                    placeholder="e.g. Landlord rent, Cash withdrawal"
                    value={newTransaction.merchant ?? ''}
                    onChange={(e) => setNewTransaction({ ...newTransaction, merchant: e.target.value })}
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Income or expense</label>
                  <div className="flex bg-black/30 p-1 rounded-xl border border-white/5 mb-4">
                    <button 
                      type="button"
                      onClick={() => setNewTransaction({ ...newTransaction, transactionKind: 'expense' })}
                      className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newTransaction.transactionKind === 'expense' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                      Expense
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewTransaction({ ...newTransaction, transactionKind: 'income' })}
                      className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newTransaction.transactionKind === 'income' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                    >
                      Income
                    </button>
                  </div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">
                    {newTransaction.type === 'recurring' && newTransaction.recurringInterval === 'yearly'
                      ? `Yearly amount (${currency})`
                      : `Amount (${currency})`}
                    {newTransaction.type === 'recurring' && newTransaction.recurringInterval === 'monthly' && ' per month'}
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    placeholder={newTransaction.type === 'recurring' && newTransaction.recurringInterval === 'yearly' ? '1200' : '50.00'}
                    value={newTransaction.amount === 0 ? '' : Math.abs(newTransaction.amount)}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: Math.abs(parseFloat(e.target.value) || 0) })}
                  />
                  <p className="text-[9px] text-gray-500 mt-1">Enter amount as positive. Yearly is stored as monthly for overviews.</p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Date</label>
                  <input 
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-gray-600"
                    placeholder="Oct 24, 2023"
                    value={newTransaction.date ?? ''}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Payment source</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    value={newTransaction.paymentMethod ?? ''}
                    onChange={(e) => setNewTransaction({ ...newTransaction, paymentMethod: e.target.value })}
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
                    value={newTransaction.category ?? ''}
                    onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value as Category })}
                  >
{CATEGORIES.map(c => (
                    <option key={c} value={c} className="bg-background-dark">{categoryLabel(c)}</option>
                  ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Fixed (recurring) or one-time</label>
                  <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                    <button 
                      type="button"
                      onClick={() => setNewTransaction({ ...newTransaction, type: 'one-time' })}
                      className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newTransaction.type === 'one-time' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                      One-time
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewTransaction({ ...newTransaction, type: 'recurring' })}
                      className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newTransaction.type === 'recurring' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                    >
                      Recurring (fixed)
                    </button>
                  </div>
                  {newTransaction.type === 'recurring' && (
                    <div className="mt-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Recurring interval</label>
                      <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                        <button 
                          type="button"
                          onClick={() => setNewTransaction({ ...newTransaction, recurringInterval: 'monthly' })}
                          className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newTransaction.recurringInterval === 'monthly' ? 'bg-primary/80 text-background-dark' : 'text-gray-500 hover:text-white'}`}
                        >
                          Monthly
                        </button>
                        <button 
                          type="button"
                          onClick={() => setNewTransaction({ ...newTransaction, recurringInterval: 'yearly' })}
                          className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newTransaction.recurringInterval === 'yearly' ? 'bg-primary/80 text-background-dark' : 'text-gray-500 hover:text-white'}`}
                        >
                          Yearly
                        </button>
                      </div>
                      <p className="text-[9px] text-gray-500 mt-1">Stored as monthly value for overviews and Plan.</p>
                    </div>
                  )}
                  <p className="text-[9px] text-gray-500 mt-1">Recurring = fixed expense (rent, subscriptions, insurance, etc.)</p>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newTransaction.merchant?.trim()}
                  className="flex-1 py-4 rounded-2xl bg-primary text-background-dark font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  Add transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">
                    {editingTransaction.type === 'recurring' && (editingTransaction.recurringInterval ?? 'monthly') === 'yearly' ? `Yearly amount (${currency})` : `Amount (${currency})`}
                    {editingTransaction.type === 'recurring' && (editingTransaction.recurringInterval ?? 'monthly') === 'monthly' && ' per month'}
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    value={editingTransaction.type === 'recurring' && (editingTransaction.recurringInterval ?? 'monthly') === 'yearly' ? editingTransaction.amount * 12 : editingTransaction.amount}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      const monthly = (editingTransaction.type === 'recurring' && (editingTransaction.recurringInterval ?? 'monthly') === 'yearly') ? v / 12 : v;
                      setEditingTransaction({ ...editingTransaction, amount: monthly });
                    }}
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
                    {CATEGORIES.map(c => (
                      <option key={c} value={c} className="bg-background-dark">{categoryLabel(c)}</option>
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
                      onClick={() => setEditingTransaction({...editingTransaction, type: 'recurring', recurringInterval: editingTransaction.recurringInterval ?? 'monthly'})}
                      className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${editingTransaction.type === 'recurring' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                    >
                      Recurring
                    </button>
                  </div>
                </div>

                {editingTransaction.type === 'recurring' && (
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Recurring interval</label>
                    <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                      <button 
                        type="button"
                        onClick={() => setEditingTransaction({...editingTransaction, recurringInterval: 'monthly'})}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${(editingTransaction.recurringInterval ?? 'monthly') === 'monthly' ? 'bg-primary/80 text-background-dark' : 'text-gray-500 hover:text-white'}`}
                      >
                        Monthly
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingTransaction({...editingTransaction, recurringInterval: 'yearly'})}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${(editingTransaction.recurringInterval ?? 'monthly') === 'yearly' ? 'bg-primary/80 text-background-dark' : 'text-gray-500 hover:text-white'}`}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Discard
                </button>
                <button 
                  type="button"
                  onClick={() => editingTransaction && handleDeleteTransaction(editingTransaction.id)}
                  className="py-4 px-6 rounded-2xl bg-red-500/20 text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-500/30 transition-all border border-red-500/30"
                >
                  Delete
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 rounded-2xl bg-primary text-background-dark font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
