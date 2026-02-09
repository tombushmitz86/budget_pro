import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FIXED_MONTHLY_EXPENSES } from '../constants';
import type { Category, Currency } from '../types';
import { CATEGORY_DISPLAY_LABELS } from '../constants';
import { useCurrency } from '../context/CurrencyContext';
import { useDataSource } from '../context/DataSourceContext';
import { fetchTransactions } from '../services/transactionsApi';

const PLAN_PIE_COLORS = ['#13ec5b', '#3b82f6', '#fa5538', '#a855f7', '#f59e0b', '#10b981', '#ec4899', '#6366f1', '#14b8a6', '#84cc16'];
const EMPTY_PIE = [{ name: 'No spending', value: 100, color: '#28392e' }];

type PlanStatus = 'active' | 'eliminated' | 'reduced';

interface FixedItem {
  id: string;
  merchant: string;
  category: Category;
  amount: number;
  icon: string;
  currency?: Currency;
}

interface PlanItem extends FixedItem {
  status: PlanStatus;
  reducedAmount?: number;
}

function toPlanItems(expenses: { id: string; merchant: string; category: Category; amount: number; icon: string; currency?: Currency }[]): PlanItem[] {
  return expenses.map((item) => ({ ...item, currency: item.currency ?? 'EUR', status: 'active' as PlanStatus }));
}

/**
 * Plan page: saving projections from fixed expenses.
 * Mock: uses FIXED_MONTHLY_EXPENSES. Real: uses recurring expenses from API (type === 'recurring', amount < 0).
 * All eliminate/reduce/restore actions affect only this component's state (session).
 */
export const Plan = () => {
  const { formatMoney } = useCurrency();
  const { isReal } = useDataSource();
  const [items, setItems] = useState<PlanItem[]>(() =>
    toPlanItems(FIXED_MONTHLY_EXPENSES)
  );
  const [loading, setLoading] = useState(isReal);
  const [fixedSortBy, setFixedSortBy] = useState<'name' | 'amount'>('amount');

  useEffect(() => {
    if (isReal) {
      setLoading(true);
      fetchTransactions()
        .then((txs) => {
          const recurringExpenses = txs.filter((t) => t.type === 'recurring' && t.amount < 0);
          const asFixed = recurringExpenses.map((t) => ({
            id: t.id,
            merchant: t.merchant,
            category: t.category,
            amount: t.amount,
            icon: t.icon,
            currency: t.currency ?? 'EUR',
          }));
          setItems(toPlanItems(asFixed));
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    } else {
      setItems(toPlanItems(FIXED_MONTHLY_EXPENSES));
    }
  }, [isReal]);

  const sortedItems = useMemo(() => {
    const list = [...items];
    if (fixedSortBy === 'name') {
      list.sort((a, b) => a.merchant.localeCompare(b.merchant, undefined, { sensitivity: 'base' }));
    } else {
      list.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    }
    return list;
  }, [items, fixedSortBy]);

  const { originalTotal, projectedMonthly, totalSaved, categoryBreakdown } = useMemo(() => {
    let projected = 0;
    let saved = 0;
    const byCategory: Record<string, number> = {};
    for (const item of items) {
      const absOriginal = Math.abs(item.amount);
      let projectedItem = 0;
      if (item.status === 'eliminated') {
        saved += absOriginal;
      } else if (item.status === 'reduced' && item.reducedAmount != null) {
        const absReduced = Math.abs(item.reducedAmount);
        projectedItem = absReduced;
        projected += absReduced;
        saved += absOriginal - absReduced;
      } else {
        projectedItem = absOriginal;
        projected += absOriginal;
      }
      const cat = item.category || 'UNCATEGORIZED';
      byCategory[cat] = (byCategory[cat] ?? 0) + projectedItem;
    }
    const original = items.reduce((s, i) => s + Math.abs(i.amount), 0);
    const breakdown = Object.entries(byCategory)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, value], i) => ({
        name: (CATEGORY_DISPLAY_LABELS as Record<string, string>)[cat] ?? cat,
        value: Math.round(value * 100) / 100,
        color: PLAN_PIE_COLORS[i % PLAN_PIE_COLORS.length],
      }));
    return {
      originalTotal: original,
      projectedMonthly: projected,
      totalSaved: saved,
      categoryBreakdown: breakdown.length > 0 ? breakdown : EMPTY_PIE,
    };
  }, [items]);

  const updateItem = (id: string, update: Partial<PlanItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...update } : i))
    );
  };

  const eliminate = (id: string) => updateItem(id, { status: 'eliminated', reducedAmount: undefined });
  const reduce = (id: string, reducedAmount: number) =>
    updateItem(id, { status: 'reduced', reducedAmount: -Math.abs(reducedAmount) });
  const restore = (id: string) => updateItem(id, { status: 'active', reducedAmount: undefined });

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-center py-24">
          <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-[#9db9a6] text-sm font-bold uppercase tracking-widest">Loading plan…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Top summary: original → monthly spendings → money saved */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-border-dark flex flex-col gap-2">
          <p className="text-[#9db9a6] text-[10px] font-black uppercase tracking-widest">Original fixed spend</p>
          <p className="text-white text-3xl font-black leading-tight tracking-tighter">{formatMoney(originalTotal, 'EUR')}</p>
          <p className="text-[#9db9a6] text-xs font-medium">Before any changes</p>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-border-dark flex flex-col gap-2">
          <p className="text-[#9db9a6] text-[10px] font-black uppercase tracking-widest">Total monthly spendings</p>
          <p className="text-white text-3xl font-black leading-tight tracking-tighter">{formatMoney(projectedMonthly, 'EUR')}</p>
          <p className="text-[#9db9a6] text-xs font-medium">After your plan (eliminations & reductions)</p>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-primary/20 flex flex-col gap-2">
          <p className="text-primary text-[10px] font-black uppercase tracking-widest">Total money saved</p>
          <p className="text-primary text-3xl font-black leading-tight tracking-tighter">{formatMoney(totalSaved, 'EUR')}</p>
          <p className="text-[#9db9a6] text-xs font-medium">From eliminated or reduced fixed expenses</p>
        </div>
      </div>

      {/* Category breakdown pie – updates with plan (eliminate/reduce) */}
      <div className="glass-card rounded-2xl border border-border-dark overflow-hidden p-6">
        <h3 className="text-white text-sm font-black uppercase tracking-widest mb-4">Category breakdown (after plan)</h3>
        <p className="text-[#9db9a6] text-xs font-medium mb-4">Projected spending by category. Eliminate or reduce items above to see the chart update.</p>
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 w-full min-h-[260px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={categoryBreakdown.length > 1 ? 4 : 0}
                  dataKey="value"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#f1f5f0', border: '1px solid #c5d0c9', borderRadius: '12px', fontSize: '12px', color: '#1a1a1a' }}
                  itemStyle={{ color: '#1a1a1a' }}
                  formatter={(value: number, _name, props) => [formatMoney(value, 'EUR'), (props?.payload as { name?: string })?.name ?? '']}
                  labelFormatter={(label) => label}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 min-w-[180px]">
            {categoryBreakdown.length > 0 && categoryBreakdown[0].name !== EMPTY_PIE[0].name ? (
              categoryBreakdown.map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-[#9db9a6] text-xs font-bold truncate">{cat.name}</span>
                  <span className="text-white text-xs font-black ml-auto">{formatMoney(cat.value, 'EUR')}</span>
                </div>
              ))
            ) : (
              <p className="text-[#9db9a6] text-xs">No projected spending</p>
            )}
          </div>
        </div>
      </div>

      {/* List of fixed transactions – eliminate or reduce */}
      <div className="glass-card rounded-2xl border border-border-dark overflow-hidden">
        <div className="p-6 border-b border-border-dark">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-white text-lg font-black uppercase tracking-tight">Fixed monthly expenses</h3>
              <p className="text-[#9db9a6] text-sm mt-1">Eliminate or reduce amounts to build your saving plan. Changes are for this session only; to edit or remove real transactions, use the Transactions page.</p>
            </div>
            {items.length > 0 && (
              <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setFixedSortBy('name')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${fixedSortBy === 'name' ? 'bg-primary text-background-dark' : 'text-gray-500 hover:text-white'}`}
                >
                  Name
                </button>
                <button
                  type="button"
                  onClick={() => setFixedSortBy('amount')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${fixedSortBy === 'amount' ? 'bg-primary text-background-dark' : 'text-gray-500 hover:text-white'}`}
                >
                  Amount
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="divide-y divide-border-dark">
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-[#9db9a6]/50">savings</span>
              <p className="text-[#9db9a6] font-bold uppercase tracking-widest mt-4">No fixed expenses</p>
              <p className="text-gray-500 text-sm mt-1">
                {isReal
                  ? 'Add recurring transactions on the Transactions page to see them here.'
                  : 'Switch to Real data (DB) to use recurring transactions from your database.'}
              </p>
            </div>
          ) : (
            sortedItems.map((item) => (
              <FixedRow
                key={item.id}
                item={item}
                formatMoney={formatMoney}
                onEliminate={() => eliminate(item.id)}
                onReduce={(value) => reduce(item.id, value)}
                onRestore={() => restore(item.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface FixedRowProps {
  item: PlanItem;
  formatMoney: (amount: number, amountCurrency?: Currency) => string;
  onEliminate: () => void;
  onReduce: (newAmount: number) => void;
  onRestore: () => void;
}

const FixedRow: React.FC<FixedRowProps> = ({ item, formatMoney, onEliminate, onReduce, onRestore }) => {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(
    item.status === 'reduced' && item.reducedAmount != null
      ? Math.abs(item.reducedAmount).toFixed(2)
      : Math.abs(item.amount).toFixed(2)
  );

  const originalAmount = Math.abs(item.amount);

  const handleApplyReduce = () => {
    const n = parseFloat(inputValue);
    if (!Number.isNaN(n) && n >= 0 && n < originalAmount) {
      onReduce(n);
      setEditing(false);
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 p-4 transition-colors ${
        item.status === 'eliminated' ? 'bg-white/5 opacity-75' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-xl bg-border-dark flex items-center justify-center text-[#9db9a6]">
          <span className="material-symbols-outlined">{item.icon}</span>
        </div>
        <div>
          <p className={`font-bold text-white ${item.status === 'eliminated' ? 'line-through text-gray-500' : ''}`}>
            {item.merchant}
          </p>
          <p className="text-[#9db9a6] text-xs font-medium uppercase tracking-wider">{CATEGORY_DISPLAY_LABELS[item.category] ?? item.category}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {item.status === 'eliminated' ? (
          <>
            <span className="text-gray-500 text-sm line-through">{formatMoney(item.amount, item.currency ?? 'EUR')}</span>
            <span className="text-primary text-xs font-bold uppercase">Eliminated</span>
            <button
              type="button"
              onClick={onRestore}
              className="px-3 py-1.5 rounded-lg border border-border-dark text-xs font-bold text-white hover:bg-white/10 transition-colors"
            >
              Restore
            </button>
          </>
        ) : editing ? (
          <>
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-24 rounded-lg bg-border-dark border border-white/10 px-3 py-2 text-sm text-white font-mono"
            />
            <button
              type="button"
              onClick={handleApplyReduce}
              className="px-3 py-1.5 rounded-lg bg-primary text-background-dark text-xs font-bold"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setInputValue(Math.abs(item.amount).toFixed(2)); }}
              className="px-3 py-1.5 rounded-lg border border-border-dark text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {item.status === 'reduced' && item.reducedAmount != null ? (
              <span className="text-white font-bold">{formatMoney(item.reducedAmount!, item.currency ?? 'EUR')}</span>
            ) : (
              <span className="text-white font-bold">{formatMoney(item.amount, item.currency ?? 'EUR')}</span>
            )}
            {item.status === 'reduced' && (
              <span className="text-[#9db9a6] text-xs line-through">{formatMoney(item.amount, item.currency ?? 'EUR')}</span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-bold hover:bg-primary/10"
            >
              Reduce
            </button>
            <button
              type="button"
              onClick={onEliminate}
              className="px-3 py-1.5 rounded-lg border border-red-500/50 text-red-400 text-xs font-bold hover:bg-red-500/10"
            >
              Eliminate
            </button>
          </>
        )}
      </div>
    </div>
  );
};
