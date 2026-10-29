import { Envelope } from '../../types';
import { computeSummaryProgress, computeTotalSpent, daysUntilNextCutoff } from './summaryProgress';

const env = (over: Partial<Envelope>): Envelope => ({
  id: 'e', name: 'E', type: 'gasto', currency: 'CRC', limit: 1000, isUnlimited: false, icon: 'box', color: '#fff', ...over,
});

const balances: Record<string, number> = {};
const bal = (id: string) => balances[id] ?? 0;

describe('computeSummaryProgress', () => {
  it('gasto: spent over the sum of limits', () => {
    const envs = [env({ id: 'a', limit: 1000 }), env({ id: 'b', limit: 500 })];
    Object.assign(balances, { a: -300, b: -150 });
    expect(computeSummaryProgress('gasto', 'CRC', envs, bal)).toEqual({ done: 450, total: 1500, percent: 30, remaining: 1050 });
  });

  it('gasto: over budget caps percent at 100 and remaining at 0', () => {
    Object.assign(balances, { a: -1200 });
    expect(computeSummaryProgress('gasto', 'CRC', [env({ id: 'a' })], bal)).toEqual({ done: 1200, total: 1000, percent: 100, remaining: 0 });
  });

  it('gasto: income added to an envelope reduces spent, never below 0', () => {
    Object.assign(balances, { a: 200 });
    expect(computeSummaryProgress('gasto', 'CRC', [env({ id: 'a' })], bal)?.done).toBe(0);
  });

  it('ignores unlimited envelopes, other currencies and other types', () => {
    Object.assign(balances, { a: -100, u: -999, d: -50, s: 10 });
    const envs = [
      env({ id: 'a' }),
      env({ id: 'u', isUnlimited: true, limit: 0 }),
      env({ id: 'd', currency: 'USD' }),
      env({ id: 's', type: 'ahorro' }),
    ];
    expect(computeSummaryProgress('gasto', 'CRC', envs, bal)).toEqual({ done: 100, total: 1000, percent: 10, remaining: 900 });
    expect(computeSummaryProgress('gasto', 'USD', envs, bal)?.done).toBe(50);
  });

  it('ahorro: saved over the sum of goals', () => {
    Object.assign(balances, { s1: 250, s2: 750 });
    const envs = [env({ id: 's1', type: 'ahorro', limit: 1000 }), env({ id: 's2', type: 'ahorro', limit: 3000 })];
    expect(computeSummaryProgress('ahorro', 'CRC', envs, bal)).toEqual({ done: 1000, total: 4000, percent: 25, remaining: 3000 });
  });

  it('deuda: paid over the sum of debt limits', () => {
    Object.assign(balances, { d1: 600 });
    expect(computeSummaryProgress('deuda', 'CRC', [env({ id: 'd1', type: 'deuda', limit: 2000 })], bal))
      .toEqual({ done: 600, total: 2000, percent: 30, remaining: 1400 });
  });

  it('returns null when nothing has a limit', () => {
    expect(computeSummaryProgress('ahorro', 'CRC', [env({ id: 'x', type: 'ahorro', isUnlimited: true, limit: 0 })], bal)).toBeNull();
    expect(computeSummaryProgress('gasto', 'CRC', [], bal)).toBeNull();
  });
});

describe('daysUntilNextCutoff', () => {
  it('counts to the 1st of next month, including today', () => {
    expect(daysUntilNextCutoff(new Date(2026, 9, 29, 10))).toBe(3); // Oct 29 -> Nov 1
    expect(daysUntilNextCutoff(new Date(2026, 9, 31))).toBe(1);
  });

  it('is a full month on the 1st', () => {
    expect(daysUntilNextCutoff(new Date(2026, 9, 1))).toBe(31);
    expect(daysUntilNextCutoff(new Date(2026, 1, 1))).toBe(28);
  });

  it('rolls over the year', () => {
    expect(daysUntilNextCutoff(new Date(2026, 11, 30))).toBe(2);
  });
});

describe('computeTotalSpent', () => {
  it('sums spending of every gasto envelope in the currency, limit or not', () => {
    Object.assign(balances, { a: -100, u: -50, o: -999 });
    const envs = [env({ id: 'a', limit: 0 }), env({ id: 'u', isUnlimited: true, limit: 0 }), env({ id: 'o', currency: 'USD' })];
    expect(computeTotalSpent('CRC', envs, bal)).toBe(150);
  });

  it('never goes below zero', () => {
    Object.assign(balances, { a: 300 });
    expect(computeTotalSpent('CRC', [env({ id: 'a' })], bal)).toBe(0);
  });
});
