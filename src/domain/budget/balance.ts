import { Envelope, Transaction } from '../../types';

/** Start of the current cutoff period: the first day of the current month. */
export function getCutoffPeriodStart(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
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
  now: Date = new Date()
): Map<string, number> {
  const map = new Map<string, number>();
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  const cutoffPeriodStart = getCutoffPeriodStart(now);

  for (const t of transactions) {
    if (t.isArchived) continue;

    if (t.envelopeId) {
      // Explicit 'gasto' check — 'ahorro' and 'deuda' envelopes are never cutoff-filtered.
      const hasCutoff = envelopeById.get(t.envelopeId)?.type === 'gasto';
      const skip = hasCutoff && t.type === 'expense' && new Date(t.date) < cutoffPeriodStart;
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
  envelopes: Envelope[]
): number {
  return computeEnvelopeBalances(transactions, envelopes).get(envelopeId) ?? 0;
}

/** Rounds to cents, so sums of decimal amounts don't show float noise (0.1 + 0.2). */
export function roundMoney(amount: number): number {
  // `+ 0` turns -0 into 0 so a settled balance never renders as "-0".
  return Math.round((amount + Number.EPSILON) * 100) / 100 + 0;
}
