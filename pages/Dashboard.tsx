
import React, { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, Tooltip, XAxis } from 'recharts';
import { CATEGORY_BREAKDOWN, SPENDING_TRENDS, TRANSACTIONS, CATEGORY_DISPLAY_LABELS } from '../constants';
import { intelligence } from '../services/intelligenceService';
import { useCurrency } from '../context/CurrencyContext';
import { useGoals } from '../context/GoalsContext';
import { useDataSource } from '../context/DataSourceContext';
import { fetchTransactions } from '../services/transactionsApi';
import { Link } from 'react-router-dom';
import type { Transaction } from '../types';

const EMPTY_PIE = [{ name: '—', value: 100, color: '#28392e' }];
const EMPTY_TRENDS = [{ name: '—', value: 0 }];

/** Variable categories: baseline = median of last 6–9 normal months (exclude vacations/anomalies). */
const VARIABLE_CATEGORIES = ['GROCERIES', 'SHOPPING', 'DINING', 'CHILDCARE', 'TRANSPORT_FUEL', 'TRANSPORT_PUBLIC', 'PARKING', 'ENTERTAINMENT'] as const;
const TRAVEL_CATEGORY = 'TRAVEL';
const MAX_MONTHS_NORMAL = 9;
const MIN_MONTHS_NORMAL = 6;

function toYearMonth(dateStr: string): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function computeNormalMonth(transactions: { date: string; amount: number; category?: string; type?: string }[]): {
  normalMonthTotal: number;
  fixedTotal: number;
  variableTotal: number;
  byCategory: Record<string, number>;
  monthsUsed: number;
} {
  const expenses = transactions.filter(t => t.amount < 0);

  // Fixed = sum of all recurring (same as Plan "Original fixed spend") – each recurring tx counted once
  const fixedTotal = Math.round(
    expenses.filter(t => t.type === 'recurring').reduce((s, t) => s + Math.abs(t.amount), 0) * 100
  ) / 100;

  // Recurring (fixed) amount per category – so "Childcare" etc. show their recurring amount in the baseline
  const fixedByCategory: Record<string, number> = {};
  expenses.filter(t => t.type === 'recurring').forEach(t => {
    const cat = t.category || 'UNCATEGORIZED';
    fixedByCategory[cat] = (fixedByCategory[cat] ?? 0) + Math.abs(t.amount);
  });

  const byMonth = new Map<string, { variable: Record<string, number>; variableSum: number; travel: number }>();

  for (const t of expenses) {
    const ym = toYearMonth(t.date);
    if (!ym) continue;
    if (!byMonth.has(ym)) {
      byMonth.set(ym, { variable: {}, variableSum: 0, travel: 0 });
    }
    const row = byMonth.get(ym)!;
    const abs = Math.abs(t.amount);
    if (VARIABLE_CATEGORIES.includes(t.category as typeof VARIABLE_CATEGORIES[number])) {
      row.variable[t.category!] = (row.variable[t.category!] ?? 0) + abs;
      row.variableSum += abs;
    } else if (t.category === TRAVEL_CATEGORY) {
      row.travel += abs;
    }
  }

  const months = [...byMonth.keys()].sort().slice(-MAX_MONTHS_NORMAL);
  if (months.length < 2) {
    const single = months[0] ? byMonth.get(months[0])! : { variable: {} as Record<string, number>, variableSum: 0, travel: 0 };
    const byCategory: Record<string, number> = {};
    let varTotal = 0;
    for (const cat of VARIABLE_CATEGORIES) {
      const variablePart = Math.round((single.variable[cat] ?? 0) * 100) / 100;
      const fixedPart = Math.round((fixedByCategory[cat] ?? 0) * 100) / 100;
      byCategory[cat] = variablePart + fixedPart;
      varTotal += variablePart;
    }
    return { normalMonthTotal: fixedTotal + varTotal, fixedTotal, variableTotal: varTotal, byCategory, monthsUsed: months.length || 0 };
  }

  const travelValues = months.map(m => byMonth.get(m)!.travel);
  const travelMed = median(travelValues);
  const variableSums = months.map(m => byMonth.get(m)!.variableSum);
  const variableMed = median(variableSums);

  let normalMonths = months.filter(m => {
    const row = byMonth.get(m)!;
    const vacation = travelMed > 0 && row.travel > 2 * travelMed;
    const spike = variableMed > 0 && row.variableSum > 2 * variableMed;
    return !vacation && !spike;
  });
  if (normalMonths.length < 2) normalMonths = months.slice(-Math.max(MIN_MONTHS_NORMAL, months.length));

  const byCategory: Record<string, number> = {};
  let variableTotal = 0;
  for (const cat of VARIABLE_CATEGORIES) {
    const values = normalMonths.map(m => (byMonth.get(m)!.variable[cat] ?? 0));
    const variableMedian = values.length > 0 ? Math.round(median(values) * 100) / 100 : 0;
    const fixedPart = Math.round((fixedByCategory[cat] ?? 0) * 100) / 100;
    byCategory[cat] = variableMedian + fixedPart;
    variableTotal += variableMedian;
  }

  return {
    normalMonthTotal: Math.round((fixedTotal + variableTotal) * 100) / 100,
    fixedTotal: Math.round(fixedTotal * 100) / 100,
    variableTotal: Math.round(variableTotal * 100) / 100,
    byCategory,
    monthsUsed: normalMonths.length,
  };
}


export const Dashboard = () => {
  const { formatMoney } = useCurrency();
  const { primaryGoal } = useGoals();
  const { isReal } = useDataSource();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(isReal);
  const [insight, setInsight] = useState("Analyzing patterns...");

  useEffect(() => {
    if (isReal) {
      setLoading(true);
      fetchTransactions()
        .then(setTransactions)
        .catch(() => setTransactions([]))
        .finally(() => setLoading(false));
    } else {
      setTransactions(TRANSACTIONS);
    }
  }, [isReal]);

  const sourceTransactions = isReal ? transactions : TRANSACTIONS;

  useEffect(() => {
    const fetchInsight = async () => {
      const result = await intelligence.getFinancialInsight(sourceTransactions);
      setInsight(result);
    };
    fetchInsight();
  }, [sourceTransactions]);

  const totalBalance = useMemo(() => {
    if (isReal && transactions.length === 0) return 0;
    const sum = sourceTransactions.reduce((s, t) => s + t.amount, 0);
    return sum;
  }, [isReal, sourceTransactions, transactions.length]);

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthSpending = useMemo(() => {
    if (isReal && transactions.length === 0) return 0;
    const oneTimeInMonth = sourceTransactions.filter(t => t.amount < 0 && t.type !== 'recurring' && (t.date || '').startsWith(currentYearMonth));
    const recurringTotal = sourceTransactions.filter(t => t.type === 'recurring' && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const oneTimeSum = Math.abs(oneTimeInMonth.reduce((s, t) => s + t.amount, 0));
    return Math.round((oneTimeSum + recurringTotal) * 100) / 100;
  }, [isReal, sourceTransactions, transactions.length, currentYearMonth]);

  const averageMonthlySpending = useMemo(() => {
    if (isReal && transactions.length === 0) return 0;
    const expenses = sourceTransactions.filter(t => t.amount < 0);
    const total = Math.abs(expenses.reduce((s, t) => s + t.amount, 0));
    const dates = sourceTransactions.map(t => t.date).filter(Boolean);
    if (dates.length === 0) return total;
    const min = dates.reduce((a, b) => (a < b ? a : b), dates[0]);
    const max = dates.reduce((a, b) => (a > b ? a : b), dates[0]);
    const [y1, m1] = min.split('-').map(Number);
    const [y2, m2] = max.split('-').map(Number);
    const months = Math.max(1, (y2 - y1) * 12 + (m2 - m1) + 1);
    return Math.round((total / months) * 100) / 100;
  }, [isReal, sourceTransactions, transactions.length]);

  const normalMonth = useMemo(() => {
    if (isReal && transactions.length === 0) return null;
    return computeNormalMonth(sourceTransactions);
  }, [isReal, sourceTransactions, transactions.length]);

  const currentMonthByCategory = useMemo(() => {
    const out: Record<string, number> = {};
    sourceTransactions
      .filter(t => t.amount < 0 && (t.type !== 'recurring' ? (t.date || '').startsWith(currentYearMonth) : true))
      .forEach(t => {
        const cat = t.category || 'UNCATEGORIZED';
        out[cat] = (out[cat] ?? 0) + Math.abs(t.amount);
      });
    return out;
  }, [sourceTransactions, currentYearMonth]);

  const trendByCategory = useMemo(() => {
    const expenses = sourceTransactions.filter(t => t.amount < 0 && t.type !== 'recurring');
    const byMonth = new Map<string, Record<string, number>>();
    expenses.forEach(t => {
      const ym = toYearMonth(t.date);
      if (!ym) return;
      if (!byMonth.has(ym)) byMonth.set(ym, {});
      const row = byMonth.get(ym)!;
      const cat = t.category || 'UNCATEGORIZED';
      row[cat] = (row[cat] ?? 0) + Math.abs(t.amount);
    });
    const months = [...byMonth.keys()].sort().slice(-6);
    const out: Record<string, { pctChange: number; recentAvg: number }> = {};
    for (const cat of VARIABLE_CATEGORIES) {
      const values = months.map(m => byMonth.get(m)?.[cat] ?? 0);
      if (values.length < 4) continue;
      const half = Math.floor(values.length / 2);
      const firstAvg = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const lastAvg = values.slice(-half).reduce((a, b) => a + b, 0) / half;
      const pctChange = firstAvg > 0 ? Math.round(((lastAvg - firstAvg) / firstAvg) * 1000) / 10 : 0;
      out[cat] = { pctChange, recentAvg: lastAvg };
    }
    return out;
  }, [sourceTransactions]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTrendCategory, setSelectedTrendCategory] = useState<string>('All');
  const [trendViewMode, setTrendViewMode] = useState<'monthly' | 'trend'>('monthly');

  const spendingTrendsChartData = useMemo(() => {
    const expenses = sourceTransactions.filter(t => t.amount < 0 && t.type !== 'recurring');
    const byMonth = new Map<string, { total: number; byCat: Record<string, number> }>();
    expenses.forEach(t => {
      const ym = toYearMonth(t.date);
      if (!ym) return;
      if (!byMonth.has(ym)) byMonth.set(ym, { total: 0, byCat: {} });
      const row = byMonth.get(ym)!;
      const cat = t.category || 'UNCATEGORIZED';
      const abs = Math.abs(t.amount);
      row.total += abs;
      row.byCat[cat] = (row.byCat[cat] ?? 0) + abs;
    });
    const months = [...byMonth.keys()].sort().slice(-12);
    return months.map(ym => {
      const row = byMonth.get(ym)!;
      const [y, m] = ym.split('-').map(Number);
      const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const value = selectedTrendCategory === 'All'
        ? Math.round(row.total * 100) / 100
        : Math.round((row.byCat[selectedTrendCategory] ?? 0) * 100) / 100;
      return { name: monthLabel, value };
    });
  }, [sourceTransactions, selectedTrendCategory]);

  const spendingTrendOriginalData = useMemo(() => {
    const expenses = sourceTransactions.filter(t => t.amount < 0 && t.type !== 'recurring');
    const byDay = new Map<string, number>();
    const today = new Date();
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const key = date.toISOString().slice(0, 10);
      byDay.set(key, 0);
    }
    expenses.forEach(t => {
      const key = (t.date || '').slice(0, 10);
      if (!key || !byDay.has(key)) return;
      byDay.set(key, (byDay.get(key) ?? 0) + Math.abs(t.amount));
    });
    return [...byDay.keys()].sort().map(dateStr => {
      const d = new Date(dateStr);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      return { name: label, value: Math.round((byDay.get(dateStr) ?? 0) * 100) / 100 };
    });
  }, [sourceTransactions]);

  const hasRealTrends = isReal && transactions.length > 0 && spendingTrendsChartData.length > 0;
  const hasRealOriginalTrend = isReal && transactions.length > 0 && spendingTrendOriginalData.length > 0;
  const categoryBreakdown = isReal && transactions.length === 0 ? EMPTY_PIE : CATEGORY_BREAKDOWN;
  const spendingTrends =
    trendViewMode === 'monthly'
      ? (hasRealTrends ? spendingTrendsChartData : (isReal && transactions.length === 0 ? EMPTY_TRENDS : SPENDING_TRENDS))
      : (hasRealOriginalTrend ? spendingTrendOriginalData : SPENDING_TRENDS);
  const recentTransactions = sourceTransactions.slice(0, 5);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-center py-24">
          <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-[#9db9a6] text-sm font-bold uppercase tracking-widest">Loading overview…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* This Month vs Normal Month – reference baseline (top of dashboard) */}
      <div className="glass-card rounded-2xl p-6 md:p-8 border border-white/10">
        <h3 className="text-white text-sm font-black uppercase tracking-widest mb-4">This month vs normal month</h3>
        <p className="text-[#9db9a6] text-xs font-medium mb-6">Normal month = expected burn (fixed recurring + median variable spend over last 6–9 months, excluding vacations & anomalies). Reference only, not a goal.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-widest mb-1">This month</p>
            <p className="text-white text-2xl md:text-3xl font-black tracking-tight">{formatMoney(currentMonthSpending, 'EUR')}</p>
            <p className="text-[#9db9a6] text-xs mt-1">Spending in {currentYearMonth}</p>
          </div>
          <div>
            <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-widest mb-1">Normal month (expected)</p>
            <p className="text-white text-2xl md:text-3xl font-black tracking-tight">
              {normalMonth ? formatMoney(normalMonth.normalMonthTotal, 'EUR') : '—'}
            </p>
            <p className="text-[#9db9a6] text-xs mt-1">
              {normalMonth ? `Fixed ${formatMoney(normalMonth.fixedTotal, 'EUR')} + variable ${formatMoney(normalMonth.variableTotal, 'EUR')} · ${normalMonth.monthsUsed} months` : 'Need more data'}
            </p>
          </div>
          <div>
            <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-widest mb-1">Difference</p>
            {normalMonth && normalMonth.normalMonthTotal > 0 ? (
              <>
                <p className={`text-2xl md:text-3xl font-black tracking-tight ${currentMonthSpending <= normalMonth.normalMonthTotal ? 'text-primary' : 'text-amber-400'}`}>
                  {currentMonthSpending <= normalMonth.normalMonthTotal
                    ? formatMoney(normalMonth.normalMonthTotal - currentMonthSpending, 'EUR') + ' under'
                    : formatMoney(currentMonthSpending - normalMonth.normalMonthTotal, 'EUR') + ' over'}
                </p>
                <p className="text-[#9db9a6] text-xs mt-1">vs expected burn</p>
              </>
            ) : (
              <>
                <p className="text-white text-2xl font-black">—</p>
                <p className="text-[#9db9a6] text-xs mt-1">Add 6+ months of data</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Spending by category – tap a category for the 3 answers (normal / this month / trend) */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-white text-sm font-black uppercase tracking-widest">Spending by category</h3>
          <p className="text-[#9db9a6] text-xs font-medium mt-1">Tap a category for normal baseline, this month, and trend.</p>
        </div>
        <div className="divide-y divide-white/5">
          {VARIABLE_CATEGORIES.map((cat) => {
            const baseline = normalMonth?.byCategory[cat] ?? 0;
            const thisMonth = currentMonthByCategory[cat] ?? 0;
            const deltaPct = baseline > 0 ? Math.round(((thisMonth - baseline) / baseline) * 1000) / 10 : 0;
            const label = (CATEGORY_DISPLAY_LABELS as Record<string, string>)[cat] ?? cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-white font-bold">{label}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[#9db9a6] text-sm">Normally {formatMoney(baseline, 'EUR')}/mo</span>
                  <span className="text-white text-sm font-bold">{formatMoney(thisMonth, 'EUR')} this month</span>
                  {baseline > 0 && (
                    <span className={`text-xs font-black px-2 py-0.5 rounded ${deltaPct <= 0 ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-400'}`}>
                      {deltaPct > 0 ? '+' : ''}{deltaPct}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 glass-card p-8 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Total Balance</p>
              <h3 className="text-white text-5xl font-black leading-tight tracking-tighter">{formatMoney(totalBalance, 'EUR')}</h3>
              <div className="flex items-center gap-2 mt-4 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>{isReal && transactions.length === 0 ? 'Add transactions to see trends' : '+12.5%'} <span className="text-[#9db9a6] font-medium ml-1">vs last month</span></span>
              </div>
            </div>
            <div className="bg-primary/20 p-3 rounded-xl">
              <span className="material-symbols-outlined text-primary text-3xl">account_balance</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 glass-card p-8 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-secondary/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Current month spending</p>
              <h3 className="text-white text-4xl font-black leading-tight tracking-tighter">{formatMoney(currentMonthSpending, 'EUR')}</h3>
              <p className="text-[#9db9a6] text-xs font-medium mt-2">Expenses in {currentYearMonth}</p>
            </div>
            <div className="bg-secondary/20 p-3 rounded-xl">
              <span className="material-symbols-outlined text-secondary text-3xl">calendar_month</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 glass-card p-8 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-amber-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Average monthly spending</p>
              <h3 className="text-white text-4xl font-black leading-tight tracking-tighter">{formatMoney(averageMonthlySpending, 'EUR')}</h3>
              <p className="text-[#9db9a6] text-xs font-medium mt-2">Total expenses ÷ months in data</p>
            </div>
            <div className="bg-amber-500/20 p-3 rounded-xl">
              <span className="material-symbols-outlined text-amber-400 text-3xl">show_chart</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Charts */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 glass-card p-8 rounded-2xl flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-white text-sm font-black uppercase tracking-widest">Category Breakdown</h4>
            <span className="material-symbols-outlined text-gray-500 cursor-pointer hover:text-white">more_horiz</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry as { color?: string }).color ?? '#28392e'} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#102216', border: '1px solid #28392e', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-black text-white">{formatMoney(averageMonthlySpending, 'EUR')}</p>
              <p className="text-[10px] text-[#9db9a6] font-bold uppercase tracking-widest">Avg monthly</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="size-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                <p className="text-xs text-[#9db9a6] font-bold">{cat.name} ({cat.value}%)</p>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 glass-card p-8 rounded-2xl flex flex-col min-h-[450px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h4 className="text-white text-sm font-black uppercase tracking-widest">Spending Trends</h4>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTrendViewMode('monthly')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${trendViewMode === 'monthly' ? 'bg-primary text-background-dark' : 'text-[#9db9a6] hover:text-white'}`}
                >
                  By month
                </button>
                <button
                  type="button"
                  onClick={() => setTrendViewMode('trend')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${trendViewMode === 'trend' ? 'bg-primary text-background-dark' : 'text-[#9db9a6] hover:text-white'}`}
                >
                  Last 7 days
                </button>
              </div>
              {trendViewMode === 'monthly' && hasRealTrends && (
                <select
                  value={selectedTrendCategory}
                  onChange={(e) => setSelectedTrendCategory(e.target.value)}
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="All" className="bg-background-dark">All categories</option>
                  {VARIABLE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-background-dark">
                      {(CATEGORY_DISPLAY_LABELS as Record<string, string>)[cat] ?? cat}
                    </option>
                  ))}
                  <option value="UNCATEGORIZED" className="bg-background-dark">Uncategorized</option>
                </select>
              )}
            </div>
          </div>
          <div className="flex-1 mt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={spendingTrends}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#5a7a63', fontSize: 10, fontWeight: 'bold' }} 
                  interval="preserveStartEnd"
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#f1f5f0', border: '1px solid #c5d0c9', borderRadius: '12px', color: '#1a1a1a' }}
                  formatter={(value: number) => [formatMoney(value, 'EUR'), '']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {spendingTrends.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(hasRealTrends && trendViewMode === 'monthly') || (hasRealOriginalTrend && trendViewMode === 'trend') ? '#13ec5b' : (index === 3 ? '#13ec5b' : '#13ec5b44')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4 group hover:border-primary/50 transition-all cursor-pointer">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-xl">bolt</span>
            </div>
            <div>
              <p className="text-xs text-white font-black uppercase tracking-tight">System Insight</p>
              <p className="text-[11px] text-[#9db9a6] leading-tight mt-1">{insight}</p>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 glass-card p-8 rounded-2xl flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-white text-sm font-black uppercase tracking-widest">Recent Transactions</h4>
            <button className="text-primary text-[10px] font-black hover:underline tracking-widest uppercase">View All</button>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 h-full">
            {recentTransactions.length === 0 ? (
              <p className="text-[#9db9a6] text-xs font-medium py-4 text-center">No transactions yet. Add some on Transactions or switch to Mock data.</p>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-border-dark flex items-center justify-center text-[#9db9a6] group-hover:text-primary group-hover:bg-primary/10 transition-all">
                      <span className="material-symbols-outlined">{t.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white group-hover:text-primary transition-colors">{t.merchant}</p>
                      <p className="text-[10px] text-[#9db9a6] font-bold uppercase tracking-tight">{CATEGORY_DISPLAY_LABELS[t.category] ?? t.category} • {t.date}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-black ${t.amount > 0 ? 'text-primary' : 'text-white'}`}>
                    {t.amount > 0 ? `+${formatMoney(t.amount, t.currency ?? 'EUR')}` : formatMoney(t.amount, t.currency ?? 'EUR')}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="mt-auto pt-6">
            <Link to="/goals" className="block p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center relative overflow-hidden group hover:border-primary/40 transition-colors">
              <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <div className="relative">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Savings Goal</p>
                {primaryGoal ? (
                  <>
                    <p className="text-sm text-white font-bold mb-3">
                      {primaryGoal.name}: {primaryGoal.targetAmount > 0 ? Math.round(Math.min(100, (primaryGoal.currentAmount / primaryGoal.targetAmount) * 100)) : 0}% reached
                    </p>
                    <div className="w-full h-1.5 bg-background-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${primaryGoal.targetAmount > 0 ? Math.min(100, (primaryGoal.currentAmount / primaryGoal.targetAmount) * 100) : 0}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[#9db9a6] font-bold mb-3">No goal yet — add one on Goals</p>
                    <div className="w-full h-1.5 bg-background-dark rounded-full overflow-hidden">
                      <div className="h-full bg-primary/30" style={{ width: '0%' }} />
                    </div>
                  </>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>

      {selectedCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCategory(null)}>
          <div className="glass-card rounded-2xl border border-white/10 w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-white text-lg font-black uppercase tracking-widest">
                {(CATEGORY_DISPLAY_LABELS as Record<string, string>)[selectedCategory] ?? selectedCategory}
              </h3>
              <button type="button" onClick={() => setSelectedCategory(null)} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9db9a6] mb-1">Normally we spend…</p>
                <p className="text-2xl font-black text-white">
                  {formatMoney(normalMonth?.byCategory[selectedCategory] ?? 0, 'EUR')}/month
                </p>
                <p className="text-xs text-[#9db9a6] mt-1">Planning, sanity checks. Median of last 6–9 non-anomalous months.</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9db9a6] mb-1">This month we are at…</p>
                <p className="text-xl font-black text-white">
                  {formatMoney(currentMonthByCategory[selectedCategory] ?? 0, 'EUR')} this month
                </p>
                {(normalMonth?.byCategory[selectedCategory] ?? 0) > 0 && (
                  <p className={`mt-1 text-sm font-bold ${(currentMonthByCategory[selectedCategory] ?? 0) <= (normalMonth?.byCategory[selectedCategory] ?? 0) ? 'text-primary' : 'text-amber-400'}`}>
                    {(() => {
                      const base = normalMonth!.byCategory[selectedCategory]!;
                      const curr = currentMonthByCategory[selectedCategory] ?? 0;
                      const pct = base > 0 ? Math.round(((curr - base) / base) * 1000) / 10 : 0;
                      return pct > 0 ? `+${pct}% vs normal` : pct < 0 ? `${pct}% vs normal` : 'Same as normal';
                    })()}
                  </p>
                )}
                <p className="text-xs text-[#9db9a6] mt-1">Mid-month decisions, behavior correction.</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9db9a6] mb-1">Over time…</p>
                {trendByCategory[selectedCategory] != null ? (
                  <>
                    <p className={`text-xl font-black ${trendByCategory[selectedCategory].pctChange >= 0 ? 'text-amber-400' : 'text-primary'}`}>
                      {trendByCategory[selectedCategory].pctChange > 0 ? '+' : ''}{trendByCategory[selectedCategory].pctChange}% over last 6 months
                    </p>
                    <p className="text-xs text-[#9db9a6] mt-1">Lifestyle creep, inflation. First half vs second half of period.</p>
                  </>
                ) : (
                  <p className="text-white/80 text-sm">Need more months of data for trend.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
