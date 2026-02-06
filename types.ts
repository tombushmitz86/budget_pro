
export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  category: Category;
  amount: number;
  status: 'completed' | 'pending' | 'flagged';
  icon: string;
  paymentMethod: string; // Changed to string to support dynamic methods
  type: 'one-time' | 'recurring';
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'bank' | 'card' | 'wallet' | 'cash';
  icon: string;
}

export type Currency = 'USD' | 'EUR' | 'ILS';

export type Category = 
  | 'Housing' 
  | 'Food & Dining' 
  | 'Transport' 
  | 'Utilities' 
  | 'Electronics' 
  | 'Health' 
  | 'Entertainment' 
  | 'Income' 
  | 'Shopping';

export interface BudgetGoal {
  id: string;
  category: string;
  spent: number;
  limit: number;
  icon: string;
  color: string;
  description: string;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  change: number;
  type: 'physical' | 'market' | 'locked' | 'liquid';
  imageUrl: string;
  trend: string;
}

export interface ChartData {
  name: string;
  value: number;
}

/** Savings goal: target amount and current progress (amounts in USD) */
export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

export interface AppSnapshot {
  transactions: Transaction[];
  budgets: BudgetGoal[];
  assets: Asset[];
  paymentMethods: PaymentMethod[];
  version: string;
  timestamp: string;
}
