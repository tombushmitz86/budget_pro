
/** When type is 'recurring', interval of the recurrence. Amount is always stored as monthly value for aggregations. */
export type RecurringInterval = 'monthly' | 'yearly' | string;
/** For "every X months", recurringInterval is the string '2'..'12'. Use isEveryNMonths() and getEveryNMonths() to handle. */

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  category: Category;
  /** Always stored as monthly value (yearly/12 when 'yearly'; amountEveryXMonths/X when 'every X months'). Stored in transaction currency (default EUR). */
  amount: number;
  status: 'completed' | 'pending' | 'flagged';
  icon: string;
  paymentMethod: string;
  type: 'one-time' | 'recurring';
  /** Set when type === 'recurring'; default 'monthly'. */
  recurringInterval?: RecurringInterval;
  /** Currency of amount (default EUR). */
  currency?: Currency;
  /** Classification metadata (optional, for debugging/UI). */
  categorySource?: 'OVERRIDE' | 'RULE' | 'FALLBACK';
  categoryConfidence?: number;
  categoryFingerprint?: string;
  matchedRuleId?: string | null;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'bank' | 'card' | 'wallet' | 'cash';
  icon: string;
}

export type Currency = 'USD' | 'EUR' | 'ILS';

/** Legacy display categories (used by Budgets/Plan for grouping). */
export type LegacyCategory =
  | 'Housing' | 'Food & Dining' | 'Transport' | 'Utilities' | 'Electronics' | 'Health' | 'Entertainment' | 'Income' | 'Shopping';

/** Fixed category enum for transaction classification (storage and outputs). */
export type Category =
  | 'INCOME_SALARY'
  | 'INCOME_OTHER'
  | 'HOUSING_RENT_MORTGAGE'
  | 'UTILITIES'
  | 'GROCERIES'
  | 'DINING'
  | 'TRANSPORT_FUEL'
  | 'TRANSPORT_PUBLIC'
  | 'PARKING'
  | 'SHOPPING'
  | 'SUBSCRIPTIONS'
  | 'HEALTH'
  | 'EDUCATION'
  | 'CHILDCARE'
  | 'ENTERTAINMENT'
  | 'TRAVEL'
  | 'INSURANCE'
  | 'TAXES_FEES'
  | 'CASH_WITHDRAWAL'
  | 'TRANSFERS_INTERNAL'
  | 'TRANSFERS_EXTERNAL'
  | 'GIFTS_DONATIONS'
  | 'OTHER'
  | 'UNCATEGORIZED';

/** Classification result from internal classifier. */
export interface ClassificationResult {
  category: Category;
  confidence: number;
  source: 'OVERRIDE' | 'RULE' | 'FALLBACK';
  fingerprint: string;
  matchedRuleId?: string;
  matchedSignals?: string[];
}

/** Optional classification metadata on transaction (persisted when available). */
export interface ClassificationMetadata {
  categorySource?: 'OVERRIDE' | 'RULE' | 'FALLBACK';
  categoryConfidence?: number;
  categoryFingerprint?: string;
  matchedRuleId?: string | null;
}

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
