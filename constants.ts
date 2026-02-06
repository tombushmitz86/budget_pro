
import type { Transaction, BudgetGoal, Asset, PaymentMethod, SavingsGoal, Category } from './types';

/** All classifier categories (fixed enum). */
export const TRANSACTION_CATEGORIES: Category[] = [
  'INCOME_SALARY', 'INCOME_OTHER', 'HOUSING_RENT_MORTGAGE', 'UTILITIES', 'GROCERIES', 'DINING',
  'TRANSPORT_FUEL', 'TRANSPORT_PUBLIC', 'PARKING', 'SHOPPING', 'SUBSCRIPTIONS', 'HEALTH', 'EDUCATION',
  'CHILDCARE', 'ENTERTAINMENT', 'TRAVEL', 'INSURANCE', 'TAXES_FEES', 'CASH_WITHDRAWAL',
  'TRANSFERS_INTERNAL', 'TRANSFERS_EXTERNAL', 'GIFTS_DONATIONS', 'OTHER', 'UNCATEGORIZED',
];

/** Display labels for transaction categories. */
export const CATEGORY_DISPLAY_LABELS: Record<Category, string> = {
  INCOME_SALARY: 'Salary',
  INCOME_OTHER: 'Other income',
  HOUSING_RENT_MORTGAGE: 'Rent / Mortgage',
  UTILITIES: 'Utilities',
  GROCERIES: 'Groceries',
  DINING: 'Dining',
  TRANSPORT_FUEL: 'Fuel',
  TRANSPORT_PUBLIC: 'Public transport',
  PARKING: 'Parking',
  SHOPPING: 'Shopping',
  SUBSCRIPTIONS: 'Subscriptions',
  HEALTH: 'Health',
  EDUCATION: 'Education',
  CHILDCARE: 'Childcare',
  ENTERTAINMENT: 'Entertainment',
  TRAVEL: 'Travel',
  INSURANCE: 'Insurance',
  TAXES_FEES: 'Taxes & fees',
  CASH_WITHDRAWAL: 'Cash withdrawal',
  TRANSFERS_INTERNAL: 'Internal transfer',
  TRANSFERS_EXTERNAL: 'External transfer',
  GIFTS_DONATIONS: 'Gifts & donations',
  OTHER: 'Other',
  UNCATEGORIZED: 'Uncategorized',
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm1', name: 'N26', type: 'bank', icon: 'account_balance' },
  { id: 'pm2', name: 'Apple Pay', type: 'wallet', icon: 'apple' },
  { id: 'pm3', name: 'Credit Card', type: 'card', icon: 'credit_card' },
  { id: 'pm4', name: 'Bank Transfer', type: 'bank', icon: 'account_balance' },
  { id: 'pm5', name: 'Cash', type: 'cash', icon: 'payments' },
];

export const TRANSACTIONS: Transaction[] = [
  { id: '1', date: 'Oct 24, 2023', merchant: 'Whole Foods Market', category: 'GROCERIES', amount: -142.50, status: 'completed', icon: 'shopping_cart', paymentMethod: 'Apple Pay', type: 'one-time' },
  { id: '2', date: 'Oct 23, 2023', merchant: 'Monthly Salary', category: 'INCOME_SALARY', amount: 4200.00, status: 'completed', icon: 'payments', paymentMethod: 'Bank Transfer', type: 'recurring' },
  { id: '3', date: 'Oct 22, 2023', merchant: 'PGE Utilities', category: 'UTILITIES', amount: -85.20, status: 'flagged', icon: 'bolt', paymentMethod: 'N26', type: 'recurring' },
  { id: '4', date: 'Oct 21, 2023', merchant: 'Netflix Subscription', category: 'SUBSCRIPTIONS', amount: -18.99, status: 'completed', icon: 'movie', paymentMethod: 'Credit Card', type: 'recurring' },
  { id: '5', date: 'Oct 20, 2023', merchant: 'Chevron Gas Station', category: 'TRANSPORT_FUEL', amount: -54.00, status: 'completed', icon: 'directions_car', paymentMethod: 'Apple Pay', type: 'one-time' },
  { id: '6', date: 'Oct 19, 2023', merchant: 'Apple Store', category: 'SHOPPING', amount: -1299.00, status: 'completed', icon: 'home', paymentMethod: 'Credit Card', type: 'one-time' },
  { id: '7', date: 'Oct 18, 2023', merchant: 'Gym Membership', category: 'HEALTH', amount: -45.00, status: 'completed', icon: 'fitness_center', paymentMethod: 'N26', type: 'recurring' },
];

export const BUDGETS: BudgetGoal[] = [
  { id: 'b1', category: 'Groceries', spent: 620, limit: 800, icon: 'restaurant', color: '#13ec5b', description: 'Household essentials' },
  { id: 'b2', category: 'Rent & Utilities', spent: 1850, limit: 1850, icon: 'home', color: '#3b82f6', description: 'Monthly fixed costs' },
  { id: 'b3', category: 'Entertainment', spent: 450, limit: 400, icon: 'movie', color: '#fa5538', description: 'Movies, Games, Outings' },
  { id: 'b4', category: 'Transport', spent: 120.50, limit: 300, icon: 'directions_car', color: '#f59e0b', description: 'Fuel and Commute' },
  { id: 'b5', category: 'Investment', spent: 300, limit: 500, icon: 'payments', color: '#10b981', description: 'Stock market & IRA' },
];

export const ASSETS: Asset[] = [
  { id: 'a1', name: 'Real Estate', value: 650000, change: 5.2, type: 'physical', trend: '+5.2% YOY', imageUrl: 'https://picsum.photos/seed/house/600/400' },
  { id: 'a2', name: 'Stock Portfolio', value: 320000, change: 12.4, type: 'market', trend: '+12.4% YTD', imageUrl: 'https://picsum.photos/seed/stock/600/400' },
  { id: 'a3', name: 'Retirement 401k', value: 180000, change: 8.1, type: 'locked', trend: '+8.1% YTD', imageUrl: 'https://picsum.photos/seed/retirement/600/400' },
  { id: 'a4', name: 'Cash & Savings', value: 100000, change: 0.5, type: 'liquid', trend: '+0.5% APY', imageUrl: 'https://picsum.photos/seed/cash/600/400' },
];

export const CATEGORY_BREAKDOWN = [
  { name: 'Housing', value: 60, color: '#13ec5b' },
  { name: 'Food', value: 15, color: '#fa5538' },
  { name: 'Travel', value: 10, color: '#3b82f6' },
  { name: 'Bills', value: 15, color: '#a855f7' },
];

export const SPENDING_TRENDS = [
  { name: 'May 1', value: 120 },
  { name: 'May 5', value: 90 },
  { name: 'May 10', value: 180 },
  { name: 'May 15', value: 270 },
  { name: 'May 20', value: 135 },
  { name: 'May 25', value: 210 },
  { name: 'Today', value: 165 },
];

/** Default savings goals (used when none stored); amounts in USD */
export const DEFAULT_SAVINGS_GOALS: SavingsGoal[] = [
  { id: 'g1', name: 'Trip to Japan', targetAmount: 5000, currentAmount: 4100 },
];

/** Fixed monthly expenses for the Plan page (recurring, negative = expense) */
export const FIXED_MONTHLY_EXPENSES = [
  { id: 'fx1', merchant: 'Rent', category: 'HOUSING_RENT_MORTGAGE' as const, amount: -1200, icon: 'home' },
  { id: 'fx2', merchant: 'PGE Utilities', category: 'UTILITIES' as const, amount: -85.20, icon: 'bolt' },
  { id: 'fx3', merchant: 'Netflix', category: 'SUBSCRIPTIONS' as const, amount: -18.99, icon: 'movie' },
  { id: 'fx4', merchant: 'Gym Membership', category: 'HEALTH' as const, amount: -45, icon: 'fitness_center' },
  { id: 'fx5', merchant: 'Internet', category: 'UTILITIES' as const, amount: -39.99, icon: 'router' },
  { id: 'fx6', merchant: 'Spotify', category: 'SUBSCRIPTIONS' as const, amount: -12.99, icon: 'music_note' },
  { id: 'fx7', merchant: 'Phone Plan', category: 'UTILITIES' as const, amount: -35, icon: 'smartphone' },
];
