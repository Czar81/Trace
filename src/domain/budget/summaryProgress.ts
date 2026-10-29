import { Currency, Envelope, EnvelopeType } from '../../types';
import { clampDayOfMonth } from '../recurring/recurrence';
import { roundMoney } from './balance';

export interface SummaryProgress {
  /** Spent (gasto), saved (ahorro) or paid (deuda), in the card's currency. */
  done: number;
  /** Sum of the limits of the envelopes that have one. */
  total: number;
  /** done / total as 0-100, clamped. */
  percent: number;
  /** total - done, never negative. */
  remaining: number;
}

/**
 * Progress of one tab for one currency, from the envelopes' limits and balances.
 * Unlimited envelopes and ones without a limit are left out (they have no goal to
 * measure against). Returns null when nothing in that tab/currency has a limit.
 * - gasto: spent of the sum of limits (net of income added to the envelope)
 * - ahorro: saved of the sum of goals
 * - deuda: paid of the sum of debt limits
 */
export function computeSummaryProgress(
  type: EnvelopeType,
  currency: Currency,
  envelopes: Envelope[],
  getBalance: (envelopeId: string) => number,
): SummaryProgress | null {
  let done = 0;
  let total = 0;
  for (const env of envelopes) {
    if (env.type !== type || env.currency !== currency || env.isUnlimited || !(env.limit > 0)) continue;
    const balance = getBalance(env.id);
    total += env.limit;
    done += type === 'gasto' ? -balance : balance;
  }
  if (total <= 0) return null;
  done = Math.max(0, roundMoney(done));
  total = roundMoney(total);
  const percent = Math.min(100, Math.max(0, (done / total) * 100));
  return { done, total, percent, remaining: roundMoney(Math.max(0, total - done)) };
}

/**
 * Days from `now` until the next cutoff (the start of the next period), counting
 * today. The period starts on `cutoffDay` each month (day 1 when there is none),
 * clamped to short months.
 */
export function daysUntilNextCutoff(now: Date, cutoffDay: number | null): number {
  const day = cutoffDay && cutoffDay > 0 ? cutoffDay : 1;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), clampDayOfMonth(now.getFullYear(), now.getMonth(), day));
  let next = thisMonth;
  if (thisMonth <= today) {
    const m = now.getMonth() + 1;
    const y = now.getFullYear() + Math.floor(m / 12);
    const mm = m % 12;
    next = new Date(y, mm, clampDayOfMonth(y, mm, day));
  }
  // Round to absorb the DST hour when the two dates sit on different offsets.
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}
