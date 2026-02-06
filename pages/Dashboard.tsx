
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

  const monthlySpending = useMemo(() => {
    if (isReal && transactions.length === 0) return 0;
    const expenses = sourceTransactions.filter(t => t.amount < 0);
    return Math.abs(expenses.reduce((s, t) => s + t.amount, 0));
  }, [isReal, sourceTransactions, transactions.length]);

  const categoryBreakdown = isReal && transactions.length === 0 ? EMPTY_PIE : CATEGORY_BREAKDOWN;
  const spendingTrends = isReal && transactions.length === 0 ? EMPTY_TRENDS : SPENDING_TRENDS;
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
      {/* Top Stats */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6 glass-card p-8 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Total Balance</p>
              <h3 className="text-white text-5xl font-black leading-tight tracking-tighter">{formatMoney(totalBalance)}</h3>
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

        <div className="col-span-12 lg:col-span-6 glass-card p-8 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-secondary/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Monthly Spending</p>
              <h3 className="text-white text-5xl font-black leading-tight tracking-tighter">{formatMoney(monthlySpending)}</h3>
              <div className="flex items-center gap-2 mt-4 text-secondary font-bold text-sm">
                <span className="material-symbols-outlined text-sm">trending_down</span>
                <span>{isReal && transactions.length === 0 ? 'From database' : '-5.1%'} <span className="text-[#9db9a6] font-medium ml-1">vs average</span></span>
              </div>
            </div>
            <div className="bg-secondary/20 p-3 rounded-xl">
              <span className="material-symbols-outlined text-secondary text-3xl">shopping_cart</span>
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
              <p className="text-2xl font-black text-white">{formatMoney(monthlySpending)}</p>
              <p className="text-[10px] text-[#9db9a6] font-bold uppercase tracking-widest">Spent</p>
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
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-white text-sm font-black uppercase tracking-widest">Spending Trends</h4>
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
              <button className="px-3 py-1 text-[10px] font-black rounded-md bg-primary text-background-dark">30D</button>
              <button className="px-3 py-1 text-[10px] font-black rounded-md text-[#9db9a6] hover:text-white">90D</button>
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
                  contentStyle={{ backgroundColor: '#102216', border: '1px solid #28392e', borderRadius: '12px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {spendingTrends.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 3 ? '#13ec5b' : '#13ec5b44'} />
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
                    {t.amount > 0 ? `+${formatMoney(t.amount)}` : formatMoney(t.amount)}
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
    </div>
  );
};
