import {
  getNextDueDate, getOccurrenceKey, clampDayOfMonth, formatCadence,
  getDebtCycleDate, getDebtCycleOccurrenceKey, getPreviousDebtCycleDate, formatDebtCycle, DebtCycleAnchor,
} from './recurrence';
import { RecurringTransactionTemplate } from '../types';

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

describe('clampDayOfMonth', () => {
  it('clamps day 31 to 28 for February in a non-leap year', () => {
    expect(clampDayOfMonth(2026, 1, 31)).toBe(28);
  });

  it('leaves an in-range day untouched', () => {
    expect(clampDayOfMonth(2026, 7, 15)).toBe(15);
  });
});

describe('getNextDueDate', () => {
  it('monthly: clamps day 31 to the last day of February in a non-leap year', () => {
    const template = makeTemplate({ frequency: 'monthly', dayOfMonth: 31 });
    const referenceDate = new Date(2026, 1, 1); // Feb 1, 2026 (non-leap)
    const due = getNextDueDate(template, referenceDate);
    expect(due).toEqual(new Date(2026, 1, 28, 0, 0, 0, 0));
  });

  it('monthly: returns the current month\'s day when it has not yet arrived', () => {
    const template = makeTemplate({ frequency: 'monthly', dayOfMonth: 20 });
    const referenceDate = new Date(2026, 2, 5); // March 5, 2026
    const due = getNextDueDate(template, referenceDate);
    expect(due).toEqual(new Date(2026, 2, 20, 0, 0, 0, 0));
  });

  it('weekly: finds the next occurrence of dayOfWeek crossing a month boundary', () => {
    // Jan 30, 2026 is a Friday (5). Next Monday (1) crosses into February.
    const template = makeTemplate({ frequency: 'weekly', dayOfWeek: 1 });
    const referenceDate = new Date(2026, 0, 30); // Fri Jan 30, 2026
    const due = getNextDueDate(template, referenceDate);
    expect(due).toEqual(new Date(2026, 1, 2, 0, 0, 0, 0)); // Mon Feb 2, 2026
  });

  it('weekly: returns the same day when referenceDate already matches dayOfWeek', () => {
    // Aug 6, 2026 is a Thursday (4).
    const template = makeTemplate({ frequency: 'weekly', dayOfWeek: 4 });
    const referenceDate = new Date(2026, 7, 6, 15, 30);
    const due = getNextDueDate(template, referenceDate);
    expect(due).toEqual(new Date(2026, 7, 6, 0, 0, 0, 0));
  });

  it('biweekly: returns the anchor date itself when reference is before it', () => {
    const template = makeTemplate({ frequency: 'biweekly', dayOfWeek: 5, anchorDate: new Date(2026, 7, 7).toISOString() }); // Fri Aug 7, 2026
    const referenceDate = new Date(2026, 7, 1); // Aug 1, 2026 (before anchor)
    const due = getNextDueDate(template, referenceDate);
    expect(due).toEqual(new Date(2026, 7, 7, 0, 0, 0, 0));
  });

  it('biweekly: advances by 14-day cycles from the anchor date to the next due date on/after reference', () => {
    const template = makeTemplate({ frequency: 'biweekly', dayOfWeek: 5, anchorDate: new Date(2026, 7, 7).toISOString() }); // Fri Aug 7, 2026
    // 10 days after the anchor: not yet a due date (next cycle is Aug 21).
    const referenceDate = new Date(2026, 7, 17); // Mon Aug 17, 2026
    const due = getNextDueDate(template, referenceDate);
    expect(due).toEqual(new Date(2026, 7, 21, 0, 0, 0, 0)); // Fri Aug 21, 2026
  });

  it('biweekly: returns reference date itself when it lands exactly on a 14-day cycle', () => {
    const template = makeTemplate({ frequency: 'biweekly', dayOfWeek: 5, anchorDate: new Date(2026, 7, 7).toISOString() });
    const referenceDate = new Date(2026, 7, 21); // exactly anchor + 14 days
    const due = getNextDueDate(template, referenceDate);
    expect(due).toEqual(new Date(2026, 7, 21, 0, 0, 0, 0));
  });

  it('biweekly: computes correctly from an anchor in a different month', () => {
    const template = makeTemplate({ frequency: 'biweekly', dayOfWeek: 2, anchorDate: new Date(2026, 0, 6).toISOString() }); // Tue Jan 6, 2026
    const referenceDate = new Date(2026, 1, 5); // Feb 5, 2026 -> cycles: Jan 6, 20, Feb 3, 17
    const due = getNextDueDate(template, referenceDate);
    expect(due).toEqual(new Date(2026, 1, 17, 0, 0, 0, 0));
  });

  it('annual: clamps Feb 29 to Feb 28 on a non-leap year', () => {
    const template = makeTemplate({ frequency: 'annual', month: 2, dayOfMonth: 29 });
    const referenceDate = new Date(2026, 0, 1); // 2026 is not a leap year
    const due = getNextDueDate(template, referenceDate);
    expect(due).toEqual(new Date(2026, 1, 28, 0, 0, 0, 0));
  });

  it('annual: does not clamp Feb 29 on a leap year', () => {
    const template = makeTemplate({ frequency: 'annual', month: 2, dayOfMonth: 29 });
    const referenceDate = new Date(2028, 0, 1); // 2028 is a leap year
    const due = getNextDueDate(template, referenceDate);
    expect(due).toEqual(new Date(2028, 1, 29, 0, 0, 0, 0));
  });
});

describe('getOccurrenceKey', () => {
  it('monthly returns YYYY-MM', () => {
    const template = makeTemplate({ frequency: 'monthly' });
    expect(getOccurrenceKey(template, new Date(2026, 7, 15))).toBe('2026-08');
  });

  it('annual returns YYYY', () => {
    const template = makeTemplate({ frequency: 'annual', month: 3 });
    expect(getOccurrenceKey(template, new Date(2026, 2, 12))).toBe('2026');
  });

  it('weekly returns the ISO week', () => {
    const template = makeTemplate({ frequency: 'weekly', dayOfWeek: 1 });
    // Feb 2, 2026 is a Monday in ISO week 6.
    expect(getOccurrenceKey(template, new Date(2026, 1, 2))).toBe('2026-W06');
  });

  it('biweekly returns the ISO due date itself', () => {
    const template = makeTemplate({ frequency: 'biweekly', dayOfWeek: 5, anchorDate: new Date(2026, 7, 7).toISOString() });
    expect(getOccurrenceKey(template, new Date(2026, 7, 21))).toBe('2026-08-21');
  });
});

describe('formatCadence', () => {
  it('describes a monthly template', () => {
    expect(formatCadence(makeTemplate({ frequency: 'monthly', dayOfMonth: 15 }))).toBe('Día 15 de cada mes');
  });

  it('describes a weekly template', () => {
    expect(formatCadence(makeTemplate({ frequency: 'weekly', dayOfWeek: 1 }))).toBe('Cada lunes');
  });

  it('describes an annual template', () => {
    expect(formatCadence(makeTemplate({ frequency: 'annual', month: 3, dayOfMonth: 12 }))).toBe('Cada 12 de marzo');
  });
});

describe('getDebtCycleDate', () => {
  it('mensual: clamps day 31 to the last day of February in a non-leap year', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'mensual', dueDay: 31 };
    expect(getDebtCycleDate(envelope, new Date(2026, 1, 1))).toEqual(new Date(2026, 1, 28, 0, 0, 0, 0));
  });

  it('mensual: returns the current month\'s day whether or not it has passed', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'mensual', dueDay: 10 };
    expect(getDebtCycleDate(envelope, new Date(2026, 2, 20))).toEqual(new Date(2026, 2, 10, 0, 0, 0, 0));
  });

  it('quincenal: returns the first-half date before it arrives', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'quincenal', dueDay: 5 };
    expect(getDebtCycleDate(envelope, new Date(2026, 2, 3))).toEqual(new Date(2026, 2, 5, 0, 0, 0, 0));
  });

  it('quincenal: returns the second-half date once the first half has passed', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'quincenal', dueDay: 5 };
    expect(getDebtCycleDate(envelope, new Date(2026, 2, 10))).toEqual(new Date(2026, 2, 20, 0, 0, 0, 0));
  });

  it('quincenal: clamps the second occurrence at month end (dueDay 20 -> 35 clamped)', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'quincenal', dueDay: 20 };
    // April has 30 days, so day 35 clamps to 30.
    expect(getDebtCycleDate(envelope, new Date(2026, 3, 25))).toEqual(new Date(2026, 3, 30, 0, 0, 0, 0));
  });

  it('anual: uses dueAnchorMonth when set, regardless of the reference month', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'anual', dueDay: 15, dueAnchorMonth: 6 };
    expect(getDebtCycleDate(envelope, new Date(2026, 2, 1))).toEqual(new Date(2026, 5, 15, 0, 0, 0, 0));
  });

  it('anual: falls back to the reference month when dueAnchorMonth is unset', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'anual', dueDay: 15 };
    expect(getDebtCycleDate(envelope, new Date(2026, 8, 1))).toEqual(new Date(2026, 8, 15, 0, 0, 0, 0));
  });
});

describe('getDebtCycleOccurrenceKey', () => {
  it('mensual: YYYY-MM', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'mensual', dueDay: 10 };
    expect(getDebtCycleOccurrenceKey(envelope, new Date(2026, 2, 10))).toBe('2026-03');
  });

  it('anual: YYYY', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'anual', dueDay: 15, dueAnchorMonth: 6 };
    expect(getDebtCycleOccurrenceKey(envelope, new Date(2026, 5, 15))).toBe('2026');
  });

  it('quincenal: distinguishes first and second half occurrences', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'quincenal', dueDay: 5 };
    expect(getDebtCycleOccurrenceKey(envelope, new Date(2026, 2, 5))).toBe('2026-03-a');
    expect(getDebtCycleOccurrenceKey(envelope, new Date(2026, 2, 20))).toBe('2026-03-b');
  });

  it('quincenal occurrence keys stay stable across repeated calls within the same cycle', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'quincenal', dueDay: 5 };
    const cycleDate = getDebtCycleDate(envelope, new Date(2026, 2, 10));
    const key1 = getDebtCycleOccurrenceKey(envelope, cycleDate);
    const key2 = getDebtCycleOccurrenceKey(envelope, getDebtCycleDate(envelope, new Date(2026, 2, 18)));
    expect(key1).toBe(key2);
  });
});

describe('getPreviousDebtCycleDate', () => {
  it('mensual: one month before, clamped', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'mensual', dueDay: 31 };
    // March 31 -> previous is Feb clamped to 28 (2026 non-leap).
    expect(getPreviousDebtCycleDate(envelope, new Date(2026, 2, 31))).toEqual(new Date(2026, 1, 28, 0, 0, 0, 0));
  });

  it('quincenal: from second half, previous is this month\'s first half', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'quincenal', dueDay: 5 };
    expect(getPreviousDebtCycleDate(envelope, new Date(2026, 2, 20))).toEqual(new Date(2026, 2, 5, 0, 0, 0, 0));
  });

  it('quincenal: from first half, previous is last month\'s second half', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'quincenal', dueDay: 5 };
    expect(getPreviousDebtCycleDate(envelope, new Date(2026, 2, 5))).toEqual(new Date(2026, 1, 20, 0, 0, 0, 0));
  });

  it('anual: one year before', () => {
    const envelope: DebtCycleAnchor = { interestFrequency: 'anual', dueDay: 15, dueAnchorMonth: 6 };
    expect(getPreviousDebtCycleDate(envelope, new Date(2026, 5, 15))).toEqual(new Date(2025, 5, 15, 0, 0, 0, 0));
  });
});

describe('formatDebtCycle', () => {
  it('describes a mensual cycle', () => {
    expect(formatDebtCycle({ interestFrequency: 'mensual', dueDay: 15 })).toBe('Día 15 de cada mes');
  });

  it('describes a quincenal cycle', () => {
    expect(formatDebtCycle({ interestFrequency: 'quincenal', dueDay: 5 })).toBe('Días 5 y 20 de cada mes');
  });

  it('describes an anual cycle', () => {
    expect(formatDebtCycle({ interestFrequency: 'anual', dueDay: 12, dueAnchorMonth: 3 })).toBe('Cada 12 de marzo');
  });
});
