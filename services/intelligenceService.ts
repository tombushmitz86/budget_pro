
import { Transaction } from "../types";

/**
 * IntelligenceService provides smart logic for financial analysis,
 * data simulation, and projections without external dependencies.
 * This architecture is designed to be easily swappable with any LLM or 
 * backend API in the future.
 */
export class IntelligenceService {
  /**
   * Generates a context-aware financial insight based on transaction patterns.
   */
  async getFinancialInsight(transactions: Transaction[]): Promise<string> {
    // Local deterministic logic to simulate AI analysis
    const expenses = transactions.filter(t => t.amount < 0);
    const totalSpent = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));
    const foodSpent = Math.abs(expenses.filter(t => t.category === 'GROCERIES' || t.category === 'DINING').reduce((sum, t) => sum + t.amount, 0));
    
    if (foodSpent > totalSpent * 0.4) {
      return "Dining and groceries account for over 40% of your outgoings. Consolidating meal prep could save you ~$300/mo.";
    }
    
    if (transactions.length > 10) {
      return "Your spending velocity has decreased by 8% compared to last week. Excellent discipline.";
    }

    return "Portfolio diversification is healthy. Current liquidity is optimal for upcoming tax cycles.";
  }

  /**
   * Generates realistic mock transactions for testing/demo purposes.
   */
  async generateSyncTransactions(source: 'Apple' | 'N26'): Promise<Transaction[]> {
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const mocks: Record<string, any[]> = {
      'N26': [
        { merchant: 'Lidl Berlin', amount: -42.50, category: 'GROCERIES', icon: 'shopping_basket', type: 'one-time' },
        { merchant: 'Wolt Delivery', amount: -28.90, category: 'DINING', icon: 'delivery_dining', type: 'one-time' },
        { merchant: 'Bolt Ride', amount: -15.20, category: 'TRANSPORT_PUBLIC', icon: 'electric_scooter', type: 'one-time' },
        { merchant: 'FitX Membership', amount: -25.00, category: 'HEALTH', icon: 'fitness_center', type: 'recurring' },
        { merchant: 'Internet Fiber', amount: -39.99, category: 'UTILITIES', icon: 'router', type: 'recurring' }
      ],
      'Apple': [
        { merchant: 'Starbucks Coffee', amount: -6.50, category: 'DINING', icon: 'coffee', type: 'one-time' },
        { merchant: 'App Store', amount: -9.99, category: 'SUBSCRIPTIONS', icon: 'shop', type: 'recurring' },
        { merchant: 'NYC Transit', amount: -2.90, category: 'TRANSPORT_PUBLIC', icon: 'subway', type: 'one-time' },
        { merchant: 'CVS Pharmacy', amount: -22.40, category: 'HEALTH', icon: 'medication', type: 'one-time' },
        { merchant: 'iCloud Storage', amount: -0.99, category: 'UTILITIES', icon: 'cloud', type: 'recurring' }
      ]
    };

    // Add slight randomization to amounts for realism
    return mocks[source].map((m, i) => ({
      ...m,
      id: `sync-${source.toLowerCase()}-${Date.now()}-${i}`,
      date: timestamp,
      amount: +(m.amount + (Math.random() * 2 - 1)).toFixed(2),
      paymentMethod: source === 'Apple' ? 'Apple Pay' : 'N26',
      status: 'completed' as const
    })) as Transaction[];
  }

  /**
   * Calculates wealth projections using standard compound interest formulas.
   */
  async projectWealth(years: number, interest: number, monthly: number, current: number): Promise<string> {
    let total = current;
    const monthlyRate = (interest / 100) / 12;
    const months = years * 12;
    
    // Future value of a series (standard formula)
    if (monthlyRate === 0) {
      total = current + (monthly * months);
    } else {
      const fvPrincipal = current * Math.pow(1 + monthlyRate, months);
      const fvAnnuity = monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      total = fvPrincipal + fvAnnuity;
    }
    
    return Math.round(total).toString();
  }
}

export const intelligence = new IntelligenceService();
