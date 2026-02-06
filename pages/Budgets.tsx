
import React, { useState, useEffect, useMemo } from 'react';
import { BUDGETS } from '../constants';
import { useCurrency } from '../context/CurrencyContext';
import { useDataSource } from '../context/DataSourceContext';
import { fetchTransactions } from '../services/transactionsApi';
import type { BudgetGoal } from '../types';
import type { Transaction } from '../types';

/** Map classifier category to budget category for aggregating spent */
const TX_CATEGORY_TO_BUDGET: Record<string, string> = {
  GROCERIES: 'Groceries',
  DINING: 'Groceries',
  SHOPPING: 'Groceries',
  HOUSING_RENT_MORTGAGE: 'Rent & Utilities',
  UTILITIES: 'Rent & Utilities',
  ENTERTAINMENT: 'Entertainment',
  TRANSPORT_FUEL: 'Transport',
  TRANSPORT_PUBLIC: 'Transport',
  PARKING: 'Transport',
  HEALTH: 'Groceries',
  SUBSCRIPTIONS: 'Entertainment',
  INCOME_SALARY: 'Investment',
  INCOME_OTHER: 'Investment',
  TRANSFERS_INTERNAL: 'Investment',
  TRANSFERS_EXTERNAL: 'Investment',
};

export const Budgets = () => {
  const { formatMoney } = useCurrency();
  const { isReal } = useDataSource();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(isReal);

  useEffect(() => {
    if (isReal) {
      setLoading(true);
      fetchTransactions()
        .then(setTransactions)
        .catch(() => setTransactions([]))
        .finally(() => setLoading(false));
    } else {
      setTransactions([]);
    }
  }, [isReal]);

  const budgetsList: BudgetGoal[] = useMemo(() => {
    if (!isReal) return BUDGETS;
    const spentByBudget: Record<string, number> = {};
    transactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const budgetCat = TX_CATEGORY_TO_BUDGET[t.category] ?? t.category;
        spentByBudget[budgetCat] = (spentByBudget[budgetCat] ?? 0) + Math.abs(t.amount);
      });
    return BUDGETS.map((b) => ({
      ...b,
      spent: spentByBudget[b.category] ?? 0,
    }));
  }, [isReal, transactions]);

  const totalBudget = useMemo(() => (isReal ? 0 : budgetsList.reduce((s, b) => s + b.limit, 0)), [isReal, budgetsList]);
  const totalSpent = useMemo(() => budgetsList.reduce((s, b) => s + b.spent, 0), [budgetsList]);
  const remaining = isReal ? 0 : totalBudget - totalSpent;
  const percentUsed = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;
  const hasRealLimits = !isReal;

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-center py-24">
          <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-[#9db9a6] text-sm font-bold uppercase tracking-widest">Loading planner…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Heading Section */}
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[#9db9a6] mb-2">
            <span className="material-symbols-outlined cursor-pointer hover:text-primary">chevron_left</span>
            <span className="text-xs font-black uppercase tracking-widest">October 2023</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-primary">chevron_right</span>
          </div>
          <h1 className="text-white text-5xl font-black leading-tight tracking-tighter uppercase italic">Monthly Planner</h1>
          <p className="text-[#9db9a6] text-sm font-medium tracking-wide">Monitor and adjust your spending limits for this month. {isReal ? 'Spent from transactions.' : 'Mock data.'}</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center rounded-xl h-11 px-6 bg-border-dark text-white text-xs font-black hover:bg-[#3b5443] transition-colors uppercase tracking-widest">
            <span className="material-symbols-outlined mr-2 text-lg">settings</span>
            <span>Manage Limits</span>
          </button>
          <button className="flex items-center justify-center rounded-xl h-11 px-6 bg-primary text-background-dark text-xs font-black hover:scale-105 transition-all uppercase tracking-widest shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined mr-2 text-lg">add</span>
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2 rounded-2xl p-6 border border-border-dark glass-card">
          <div className="flex justify-between items-start">
            <p className="text-[#9db9a6] text-[10px] font-black uppercase tracking-widest">Total Budget</p>
            <span className="material-symbols-outlined text-gray-500">account_balance</span>
          </div>
          <p className="text-white text-3xl font-black leading-tight tracking-tighter">{hasRealLimits ? formatMoney(totalBudget) : '—'}</p>
          <div className="flex items-center gap-1 text-primary text-[10px] font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>{isReal ? 'Set limits to see budget' : '+2.5% from last month'}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl p-6 border border-border-dark glass-card">
          <div className="flex justify-between items-start">
            <p className="text-[#9db9a6] text-[10px] font-black uppercase tracking-widest">Total Spent</p>
            <span className="material-symbols-outlined text-gray-500">shopping_cart</span>
          </div>
          <p className="text-white text-3xl font-black leading-tight tracking-tighter">{formatMoney(totalSpent)}</p>
          <div className="flex items-center gap-1 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">warning</span>
            <span>{hasRealLimits ? `${Math.round(percentUsed)}% of budget used` : 'From your transactions'}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl p-6 border-2 border-primary/40 glass-card shadow-lg shadow-primary/5">
          <div className="flex justify-between items-start">
            <p className="text-primary text-[10px] font-black uppercase tracking-widest">Remaining to Spend</p>
            <span className="material-symbols-outlined text-primary">savings</span>
          </div>
          <p className="text-white text-3xl font-black leading-tight tracking-tighter">{hasRealLimits ? formatMoney(remaining) : '—'}</p>
          <div className="flex items-center gap-1 text-[#9db9a6] text-[10px] font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">event</span>
            <span>{isReal ? 'Set limits to track remaining' : '12 days remaining in Oct'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-dark gap-8">
        <button className="flex items-center gap-2 border-b-2 border-primary text-primary pb-4 font-black text-[10px] uppercase tracking-[0.2em]">
          <span className="material-symbols-outlined text-lg">apps</span>
          All Categories
        </button>
        <button className="flex items-center gap-2 border-b-2 border-transparent text-[#9db9a6] pb-4 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors">
          <span className="material-symbols-outlined text-lg">error</span>
          Over Budget
        </button>
        <button className="flex items-center gap-2 border-b-2 border-transparent text-[#9db9a6] pb-4 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors">
          <span className="material-symbols-outlined text-lg">notifications_active</span>
          Near Limit
        </button>
      </div>

      {/* Budget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgetsList.map((budget) => {
          const percent = hasRealLimits && budget.limit > 0 ? Math.min(100, (budget.spent / budget.limit) * 100) : 0;
          const isOver = hasRealLimits && budget.spent > budget.limit;

          return (
            <div 
              key={budget.id} 
              className={`group flex flex-col rounded-2xl p-6 border transition-all hover:scale-[1.02] ${isOver ? 'border-secondary bg-secondary/5' : 'border-border-dark glass-card hover:border-primary/50'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={`size-12 rounded-xl flex items-center justify-center ${isOver ? 'bg-secondary/20 text-secondary' : 'bg-primary/10 text-primary'}`}>
                    <span className="material-symbols-outlined text-2xl">{budget.icon}</span>
                  </div>
                  <div>
                    <h3 className={`font-black uppercase tracking-tight ${isOver ? 'text-secondary' : 'text-white'}`}>{budget.category}</h3>
                    <p className="text-[10px] font-bold text-[#9db9a6] uppercase tracking-widest">{budget.description}</p>
                  </div>
                </div>
                <button className="text-gray-500 hover:text-white transition-colors">
                  <span className="material-symbols-outlined">edit</span>
                </button>
              </div>
              
              <div className="flex justify-between items-end mb-3">
                <span className="text-2xl font-black text-white leading-none">
                  {formatMoney(budget.spent)}
                  {hasRealLimits && <span className="text-xs font-bold text-gray-500 ml-1 italic">/ {formatMoney(budget.limit)}</span>}
                </span>
                {hasRealLimits && <span className={`text-xs font-black ${isOver ? 'text-secondary' : 'text-primary'}`}>{Math.round(percent)}%</span>}
              </div>
              
              {hasRealLimits && (
                <div className="w-full bg-background-dark/50 rounded-full h-3 mb-4 overflow-hidden p-[2px]">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-secondary' : 'bg-primary shadow-[0_0_10px_rgba(19,236,91,0.5)]'}`} 
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              )}
              
              <div className={`flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${isOver ? 'text-secondary' : 'text-[#9db9a6]'}`}>
                <span>Spent: {formatMoney(budget.spent)}</span>
                {hasRealLimits ? (
                  <span>{isOver ? `Over by ${formatMoney(budget.spent - budget.limit)}` : budget.spent === budget.limit ? 'Fully Paid' : `Left: ${formatMoney(budget.limit - budget.spent)}`}</span>
                ) : (
                  <span>From transactions</span>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex flex-col items-center justify-center rounded-2xl p-6 border-2 border-dashed border-border-dark bg-transparent hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group min-h-[220px]">
          <div className="size-14 rounded-full bg-border-dark flex items-center justify-center text-[#9db9a6] group-hover:bg-primary group-hover:text-background-dark transition-all duration-300">
            <span className="material-symbols-outlined text-3xl">add</span>
          </div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#9db9a6] group-hover:text-primary transition-colors">New Category</p>
        </div>
      </div>
    </div>
  );
};
