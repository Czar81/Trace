import { DebtInterestFrequency } from '../../types';

export type PayoffStrategy = 'snowball' | 'avalanche';

export interface PayoffDebt {
  id: string;
  owed: number;
  interestRate: number; // percent per cycle
  interestFrequency: DebtInterestFrequency;
  minimumPayment: number;
}

export interface PayoffResult {
  strategy: PayoffStrategy;
  /** False when the budget cannot clear the debts within MAX_MONTHS. */
  feasible: boolean;
  months: number;
  totalInterest: number;
  /** Month number (1-based) in which each debt reaches zero. */
  payoffMonthById: Record<string, number>;
  /** Debts in the order extra money is directed to them. */
  order: string[];
}

export const MAX_MONTHS = 600;

const CYCLES_PER_MONTH: Record<DebtInterestFrequency, number> = {
  mensual: 1,
  quincenal: 2,
  anual: 1 / 12,
};

export const monthlyRate = (d: Pick<PayoffDebt, 'interestRate' | 'interestFrequency'>): number =>
  (d.interestRate / 100) * CYCLES_PER_MONTH[d.interestFrequency];

const round2 = (n: number) => Math.round(n * 100) / 100;

const priority = (a: PayoffDebt, b: PayoffDebt, strategy: PayoffStrategy) =>
  strategy === 'snowball'
    ? a.owed - b.owed || monthlyRate(b) - monthlyRate(a)
    : monthlyRate(b) - monthlyRate(a) || a.owed - b.owed;

/**
 * Simulates paying `monthlyBudget` per month towards `debts`: every debt gets its
 * minimum (capped at what is owed), and everything left goes to the highest-priority
 * debt still open. Freed-up minimums roll over automatically because the whole budget
 * is spent each month.
 */
export function simulatePayoff(debts: PayoffDebt[], monthlyBudget: number, strategy: PayoffStrategy): PayoffResult {
  const open = debts.filter(d => d.owed > 0).sort((a, b) => priority(a, b, strategy));
  const order = open.map(d => d.id);
  const balances = new Map(open.map(d => [d.id, d.owed]));
  const payoffMonthById: Record<string, number> = {};
  let totalInterest = 0;
  let month = 0;

  while (balances.size > 0 && month < MAX_MONTHS) {
    month++;
    for (const d of open) {
      const b = balances.get(d.id);
      if (b === undefined) continue;
      const interest = round2(b * monthlyRate(d));
      totalInterest += interest;
      balances.set(d.id, b + interest);
    }

    let budget = monthlyBudget;
    for (const d of open) {
      const b = balances.get(d.id);
      if (b === undefined) continue;
      const pay = Math.min(b, d.minimumPayment, budget);
      budget -= pay;
      balances.set(d.id, round2(b - pay));
    }
    for (const d of open) {
      const b = balances.get(d.id);
      if (b === undefined || budget <= 0) continue;
      const pay = Math.min(b, budget);
      budget -= pay;
      balances.set(d.id, round2(b - pay));
    }
    for (const d of open) {
      if ((balances.get(d.id) ?? 1) <= 0) {
        balances.delete(d.id);
        payoffMonthById[d.id] = month;
      }
    }
  }

  return {
    strategy,
    feasible: balances.size === 0,
    months: month,
    totalInterest: round2(totalInterest),
    payoffMonthById,
    order,
  };
}
