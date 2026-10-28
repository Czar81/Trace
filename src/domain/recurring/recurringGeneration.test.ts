import { accrueDebtInterest, generateRecurringTransactions } from './recurringGeneration';
import { getPendingOccurrences, getPendingDebtCycles, getNextDebtCycleDate, DebtCycleAnchor } from './recurrence';
import { Envelope, RecurringTransactionTemplate, Transaction } from '../../types';

const makeTemplate = (overrides: Partial<RecurringTransactionTemplate>): RecurringTransactionTemplate => ({
  id: 't-1',
  envelopeId: 'env-1',
  type: 'expense',
  amount: 100,
  description: 'Test',
  frequency: 'monthly',
  dayOfMonth: 15,
  isActive: true,
  lastGeneratedPeriod: null,
  reminderNotificationId: null,
  lastReminderScheduledPeriod: null,
  ...overrides,
});

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const dates = (list: Date[]) => list.map(d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);

// Monday Oct 5 2026 ... Tuesday Oct 27 2026.
describe('getPendingOccurrences', () => {
  it('weekly: generates a due date that passed while the app was closed', () => {
    const template = makeTemplate({ frequency: 'weekly', dayOfWeek: 1, lastGeneratedPeriod: '2026-W42' }); // week of Oct 12
    // Opened on Tuesday Oct 27: Monday Oct 19 and Monday Oct 26 were both missed.
    expect(dates(getPendingOccurrences(template, day(2026, 10, 27)))).toEqual(['2026-10-19', '2026-10-26']);
  });

  it('weekly: nothing pending once this week was generated', () => {
    const template = makeTemplate({ frequency: 'weekly', dayOfWeek: 1, lastGeneratedPeriod: '2026-W44' });
    expect(getPendingOccurrences(template, day(2026, 10, 28))).toEqual([]);
  });

  it('biweekly: catches up every 14-day cycle after the last generated one', () => {
    const template = makeTemplate({
      frequency: 'biweekly', anchorDate: day(2026, 9, 7).toISOString(), lastGeneratedPeriod: '2026-09-21',
    });
    expect(dates(getPendingOccurrences(template, day(2026, 10, 27)))).toEqual(['2026-10-5', '2026-10-19']);
  });

  it('biweekly: a template created before its anchor waits for the anchor', () => {
    const template = makeTemplate({
      frequency: 'biweekly', anchorDate: day(2026, 11, 2).toISOString(), activeSince: day(2026, 10, 27).toISOString(),
    });
    expect(getPendingOccurrences(template, day(2026, 10, 30))).toEqual([]);
    expect(dates(getPendingOccurrences(template, day(2026, 11, 3)))).toEqual(['2026-11-2']);
  });

  it('monthly: catches up missed months, clamping short months', () => {
    const template = makeTemplate({ dayOfMonth: 31, lastGeneratedPeriod: '2026-01' });
    expect(dates(getPendingOccurrences(template, day(2026, 4, 2)))).toEqual(['2026-2-28', '2026-3-31']);
  });

  it('annual: catches up a skipped year', () => {
    const template = makeTemplate({ frequency: 'annual', month: 3, dayOfMonth: 10, lastGeneratedPeriod: '2024' });
    expect(dates(getPendingOccurrences(template, day(2026, 5, 1)))).toEqual(['2025-3-10', '2026-3-10']);
  });

  it('a new template never backfills dates before it was created', () => {
    const template = makeTemplate({ dayOfMonth: 5, activeSince: day(2026, 10, 20).toISOString() });
    expect(getPendingOccurrences(template, day(2026, 10, 27))).toEqual([]);
    expect(dates(getPendingOccurrences(template, day(2026, 11, 5)))).toEqual(['2026-11-5']);
  });

  it('legacy templates without activeSince keep generating the current period only', () => {
    expect(dates(getPendingOccurrences(makeTemplate({ dayOfMonth: 5 }), day(2026, 10, 27)))).toEqual(['2026-10-5']);
    // Weekly on Monday, opened Tuesday: this week's Monday.
    expect(dates(getPendingOccurrences(makeTemplate({ frequency: 'weekly', dayOfWeek: 1 }), day(2026, 10, 27)))).toEqual(['2026-10-26']);
  });

  it('inactive templates generate nothing', () => {
    expect(getPendingOccurrences(makeTemplate({ isActive: false, lastGeneratedPeriod: '2026-01' }), day(2026, 10, 27))).toEqual([]);
  });
});

describe('generateRecurringTransactions', () => {
  it('creates one transaction per pending occurrence and records the newest period', () => {
    const template = makeTemplate({ frequency: 'weekly', dayOfWeek: 1, lastGeneratedPeriod: '2026-W42' });
    const { updatedTemplates, newTransactions } = generateRecurringTransactions([template], day(2026, 10, 27));
    expect(newTransactions.map(t => t.date)).toEqual([day(2026, 10, 26).toISOString(), day(2026, 10, 19).toISOString()]);
    expect(new Set(newTransactions.map(t => t.id)).size).toBe(2);
    expect(updatedTemplates[0].lastGeneratedPeriod).toBe('2026-W44');

    // Running again the same day is a no-op.
    const second = generateRecurringTransactions(updatedTemplates, day(2026, 10, 27));
    expect(second.newTransactions).toEqual([]);
  });
});

describe('debt cycles', () => {
  const quincenal: DebtCycleAnchor = { interestFrequency: 'quincenal', dueDay: 10 };

  it('quincenal: alternates between dueDay and dueDay + 15', () => {
    expect(getNextDebtCycleDate(quincenal, day(2026, 1, 10))).toEqual(day(2026, 1, 25));
    expect(getNextDebtCycleDate(quincenal, day(2026, 1, 25))).toEqual(day(2026, 2, 10));
  });

  it('lists every missed cycle after the last processed one', () => {
    expect(dates(getPendingDebtCycles(quincenal, '2026-01-a', day(2026, 2, 26)))).toEqual(['2026-1-25', '2026-2-10', '2026-2-25']);
  });
});

describe('accrueDebtInterest catch-up', () => {
  const debt: Envelope = {
    id: 'debt-1', name: 'Tarjeta', type: 'deuda', currency: 'CRC', limit: 1000, isUnlimited: false,
    icon: 'credit-card', color: '#F2A65A', interestRate: 10, interestFrequency: 'mensual', dueDay: 15,
    lastInterestAccrualPeriod: '2026-01',
  };

  it('charges each missed cycle, compounding on the previous charge', () => {
    const { updatedEnvelopes, newTransactions } = accrueDebtInterest([debt], [], day(2026, 3, 20));
    // Feb: 10% of 1000 = 100. Mar: 10% of 1100 = 110.
    expect(newTransactions.map(t => t.amount).sort()).toEqual([100, 110]);
    expect(updatedEnvelopes[0].lastInterestAccrualPeriod).toBe('2026-03');
  });

  it('uses the amount owed as of each cycle date', () => {
    const payment: Transaction = {
      id: 'p', envelopeId: 'debt-1', type: 'income', amount: 500, description: 'Pago',
      date: day(2026, 3, 1).toISOString(), isArchived: false,
    };
    const { newTransactions } = accrueDebtInterest([debt], [payment], day(2026, 3, 20));
    // Feb 15: owes 1000 -> 100. Mar 15: owes 1100 - 500 = 600 -> 60.
    expect(newTransactions.map(t => t.amount).sort((a, b) => a - b)).toEqual([60, 100]);
  });
});
