import { Envelope, Transaction } from '../../types';
import { clampDayOfMonth } from '../recurring/recurrence';

/**
 * Start of the current cutoff period: this month's cutoffDay if we've reached it,
 * otherwise last month's. Clamped to the target month's last day so cutoffDay values
 * like 31 don't roll over into the next month on shorter months.
 */
export function getCutoffPeriodStart(now: Date, cutoffDay: number): Date {
  const targetMonth = now.getDate() >= cutoffDay ? now.getMonth() : now.getMonth() - 1;
  const day = clampDayOfMonth(now.getFullYear(), targetMonth, cutoffDay);
  return new Date(now.getFullYear(), targetMonth, day, 0, 0, 0, 0);
}

/**
 * Envelope id -> balance in a single pass over `transactions`. The one balance
 * formula in the app: a transaction moves its own envelope (income adds, expense
 * and transfer-out subtract), an expense funded from savings also subtracts from
 * `sourceSavingsEnvelopeId`, and a transfer adds to `toEnvelopeId`. For 'gasto'
 * envelopes with an active cutoff, their own expenses dated before the current
 * cutoff period start are left out.
 */
export function computeEnvelopeBalances(
  transactions: Transaction[],
  envelopes: Envelope[],
  expenseCutoffEnabled: boolean,
  expenseCutoffDay: number | null,
  now: Date = new Date()
): Map<string, number> {
  const map = new Map<string, number>();
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  const cutoffPeriodStart = expenseCutoffEnabled && expenseCutoffDay
    ? getCutoffPeriodStart(now, expenseCutoffDay)
    : null;

  for (const t of transactions) {
    if (t.isArchived) continue;

    if (t.envelopeId) {
      // Explicit 'gasto' check — 'ahorro' and 'deuda' envelopes are never cutoff-filtered.
      const hasCutoff = envelopeById.get(t.envelopeId)?.type === 'gasto' && cutoffPeriodStart != null;
      const skip = hasCutoff && t.type === 'expense' && new Date(t.date) < (cutoffPeriodStart as Date);
      if (!skip) {
        const delta = t.type === 'income' ? t.amount : -t.amount;
        map.set(t.envelopeId, (map.get(t.envelopeId) ?? 0) + delta);
      }
    }
    if (t.type === 'expense' && t.sourceSavingsEnvelopeId) {
      const sourceId = t.sourceSavingsEnvelopeId;
      map.set(sourceId, (map.get(sourceId) ?? 0) - t.amount);
    }
    if (t.type === 'transfer' && t.toEnvelopeId) {
      const destId = t.toEnvelopeId;
      map.set(destId, (map.get(destId) ?? 0) + t.amount);
    }
  }

  for (const [id, balance] of map) map.set(id, roundMoney(balance));
  return map;
}

/** Balance of a single envelope; same formula as computeEnvelopeBalances. */
export function calculateEnvelopeBalance(
  envelopeId: string,
  transactions: Transaction[],
  envelopes: Envelope[],
  expenseCutoffEnabled: boolean,
  expenseCutoffDay: number | null
): number {
  return computeEnvelopeBalances(transactions, envelopes, expenseCutoffEnabled, expenseCutoffDay).get(envelopeId) ?? 0;
}

/** Rounds to cents, so sums of decimal amounts don't show float noise (0.1 + 0.2). */
export function roundMoney(amount: number): number {
  // `+ 0` turns -0 into 0 so a settled balance never renders as "-0".
  return Math.round((amount + Number.EPSILON) * 100) / 100 + 0;
}
