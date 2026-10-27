import { RecurringTransactionTemplate, DebtInterestFrequency } from '../types';
import { TranslateFn, TranslationKey, translateDefault } from '../i18n';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Clamps `day` to the last valid day of the given year/month (0-indexed month),
 * so values like 31 don't roll over into the next month on shorter months.
 */
export function clampDayOfMonth(year: number, month: number, day: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(day, daysInMonth);
}

/** Strips the time component, keeping year/month/day in local time. */
function dateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/** Zero-padded 2-digit ISO date component. */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** `YYYY-MM-DD` for a local Date, used as the biweekly occurrence key. */
function toISODateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * ISO 8601 week key (`YYYY-Www`) for the week containing `date`, following the
 * standard "week containing the year's first Thursday is week 1" rule.
 */
function getISOWeekKey(date: Date): string {
  // Work in UTC so DST shifts near midnight can't push the date across a day boundary.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0 .. Sunday = 6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // Move to the Thursday of this ISO week

  const isoYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY));
  return `${isoYear}-W${pad2(week)}`;
}

/**
 * Computes a template's next due date on or after `referenceDate`, per its frequency:
 * - monthly/annual: `dayOfMonth` (and `month` for annual), clamped to the target month's length.
 * - weekly: the next (or same-day) occurrence of `dayOfWeek` on/after `referenceDate`.
 * - biweekly: the next occurrence that is a multiple of 14 days after `anchorDate`, on/after `referenceDate`.
 *
 * Shared by both automatic generation (ExpenseContext) and bill-reminder scheduling so the
 * due-date math lives in exactly one place.
 */
export function getNextDueDate(template: RecurringTransactionTemplate, referenceDate: Date): Date {
  const refStart = dateOnly(referenceDate);
  const year = refStart.getFullYear();
  const month = refStart.getMonth();

  switch (template.frequency) {
    case 'monthly': {
      const day = clampDayOfMonth(year, month, template.dayOfMonth);
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    case 'annual': {
      const targetMonth = (template.month ?? 1) - 1;
      const day = clampDayOfMonth(year, targetMonth, template.dayOfMonth);
      return new Date(year, targetMonth, day, 0, 0, 0, 0);
    }
    case 'weekly': {
      const targetDow = template.dayOfWeek ?? 0;
      const diff = (targetDow - refStart.getDay() + 7) % 7;
      const due = new Date(refStart);
      due.setDate(due.getDate() + diff);
      return due;
    }
    case 'biweekly': {
      const anchorStart = template.anchorDate ? dateOnly(new Date(template.anchorDate)) : refStart;
      const diffDays = Math.round((refStart.getTime() - anchorStart.getTime()) / MS_PER_DAY);
      // If reference is before (or on) the anchor, the next due date is the anchor itself.
      // Otherwise, advance to the next multiple of 14 days after the anchor that is >= reference.
      const daysToAdd = diffDays <= 0 ? -diffDays : (14 - (diffDays % 14)) % 14;
      const due = new Date(refStart);
      due.setDate(due.getDate() + daysToAdd);
      return due;
    }
    default:
      // Exhaustiveness guard; RecurrenceFrequency covers all cases above.
      return refStart;
  }
}

/**
 * Computes the occurrence key identifying "this specific due date" for tracking
 * (`lastGeneratedPeriod` / `lastReminderScheduledPeriod`):
 * - monthly: `YYYY-MM`
 * - annual: `YYYY`
 * - weekly: ISO week `YYYY-Www`
 * - biweekly: the ISO due date itself (`YYYY-MM-DD`), since biweekly cycles don't align to a
 *   fixed calendar unit and the due date is the unambiguous key.
 */
export function getOccurrenceKey(template: RecurringTransactionTemplate, dueDate: Date): string {
  switch (template.frequency) {
    case 'monthly':
      return `${dueDate.getFullYear()}-${pad2(dueDate.getMonth() + 1)}`;
    case 'annual':
      return `${dueDate.getFullYear()}`;
    case 'weekly':
      return getISOWeekKey(dueDate);
    case 'biweekly':
      return toISODateOnly(dueDate);
    default:
      return toISODateOnly(dueDate);
  }
}

const weekdayName = (t: TranslateFn, index: number) => t(`weekday.${index}` as TranslationKey);
const monthName = (t: TranslateFn, index: number) => t(`month.${index + 1}` as TranslationKey);

/**
 * Minimal shape a debt envelope needs to expose to compute its interest/
 * minimum-payment/reminder cycle. `quincenal` is deliberately NOT
 * `RecurrenceFrequency`'s `biweekly` — it means two fixed dates per month
 * (`dueDay` and `dueDay + 15`, both clamped), not "every 14 days from an
 * anchor". `anual` needs a fixed month, which `dueDay` alone can't express,
 * hence `dueAnchorMonth`.
 */
export interface DebtCycleAnchor {
  interestFrequency: DebtInterestFrequency;
  dueDay: number;
  dueAnchorMonth?: number | null; // 1-12, only meaningful for 'anual'
}

/**
 * Computes a debt envelope's *current* cycle occurrence date — the same
 * "this period's date, regardless of whether it's already passed" convention
 * `getNextDueDate` uses for `monthly`/`annual` templates, so callers apply the
 * same "is it due yet" / occurrence-key dedup pattern already used for
 * recurring transactions and bill reminders.
 */
export function getDebtCycleDate(envelope: DebtCycleAnchor, referenceDate: Date): Date {
  const refStart = dateOnly(referenceDate);
  const year = refStart.getFullYear();
  const month = refStart.getMonth();

  switch (envelope.interestFrequency) {
    case 'mensual': {
      const day = clampDayOfMonth(year, month, envelope.dueDay);
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    case 'quincenal': {
      const day1 = clampDayOfMonth(year, month, envelope.dueDay);
      const day2 = clampDayOfMonth(year, month, envelope.dueDay + 15);
      // Before day1: still targeting the first-half occurrence. From day1 onward
      // (including after day2 has passed): targeting the second-half occurrence,
      // mirroring 'mensual'/'annual' not rolling over to the next period on their own.
      const targetDay = refStart.getDate() < day1 ? day1 : day2;
      return new Date(year, month, targetDay, 0, 0, 0, 0);
    }
    case 'anual': {
      const anchorMonth = (envelope.dueAnchorMonth ?? (month + 1)) - 1;
      const day = clampDayOfMonth(year, anchorMonth, envelope.dueDay);
      return new Date(year, anchorMonth, day, 0, 0, 0, 0);
    }
    default:
      return refStart;
  }
}

/**
 * Occurrence key identifying "this specific debt cycle", for the
 * `lastInterestAccrualPeriod` / `lastMinPaymentCheckPeriod` /
 * `lastDueReminderScheduledPeriod` bookkeeping fields:
 * - mensual: `YYYY-MM`
 * - anual: `YYYY`
 * - quincenal: `YYYY-MM-a` (first half) or `YYYY-MM-b` (second half)
 */
export function getDebtCycleOccurrenceKey(envelope: DebtCycleAnchor, cycleDate: Date): string {
  switch (envelope.interestFrequency) {
    case 'mensual':
      return `${cycleDate.getFullYear()}-${pad2(cycleDate.getMonth() + 1)}`;
    case 'anual':
      return `${cycleDate.getFullYear()}`;
    case 'quincenal': {
      const day1 = clampDayOfMonth(cycleDate.getFullYear(), cycleDate.getMonth(), envelope.dueDay);
      const half = cycleDate.getDate() <= day1 ? 'a' : 'b';
      return `${cycleDate.getFullYear()}-${pad2(cycleDate.getMonth() + 1)}-${half}`;
    }
    default:
      return toISODateOnly(cycleDate);
  }
}

/**
 * Computes the debt cycle occurrence immediately before `cycleDate` — the start
 * of the window whose payments are checked against `minimumPayment`.
 */
export function getPreviousDebtCycleDate(envelope: DebtCycleAnchor, cycleDate: Date): Date {
  const year = cycleDate.getFullYear();
  const month = cycleDate.getMonth();

  switch (envelope.interestFrequency) {
    case 'mensual': {
      const day = clampDayOfMonth(year, month - 1, envelope.dueDay);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }
    case 'quincenal': {
      const day1 = clampDayOfMonth(year, month, envelope.dueDay);
      if (cycleDate.getDate() === day1) {
        // cycleDate is the first-half occurrence; previous was last month's second half.
        const prevDay2 = clampDayOfMonth(year, month - 1, envelope.dueDay + 15);
        return new Date(year, month - 1, prevDay2, 0, 0, 0, 0);
      }
      // cycleDate is the second-half occurrence; previous was this month's first half.
      return new Date(year, month, day1, 0, 0, 0, 0);
    }
    case 'anual': {
      const day = clampDayOfMonth(year - 1, month, envelope.dueDay);
      return new Date(year - 1, month, day, 0, 0, 0, 0);
    }
    default:
      return cycleDate;
  }
}

/** Human-readable cadence description for a debt envelope's cycle (Spanish unless `t` is given). */
export function formatDebtCycle(envelope: DebtCycleAnchor, t: TranslateFn = translateDefault): string {
  switch (envelope.interestFrequency) {
    case 'mensual':
      return t('cadence.monthly', { day: envelope.dueDay });
    case 'quincenal':
      return t('cadence.twiceMonthly', { day: envelope.dueDay, day2: envelope.dueDay + 15 > 31 ? 31 : envelope.dueDay + 15 });
    case 'anual': {
      const monthIdx = (envelope.dueAnchorMonth ?? 1) - 1;
      return t('cadence.yearly', { day: envelope.dueDay, month: monthName(t, monthIdx) });
    }
    default:
      return '';
  }
}

/**
 * Human-readable cadence description for a template (Spanish unless `t` is given),
 * matching its actual frequency — used by the recurring templates list instead of
 * always showing "Día N".
 */
export function formatCadence(template: RecurringTransactionTemplate, t: TranslateFn = translateDefault): string {
  switch (template.frequency) {
    case 'monthly':
      return t('cadence.monthly', { day: template.dayOfMonth });
    case 'weekly': {
      const dow = template.dayOfWeek ?? 0;
      return t('cadence.weekly', { weekday: weekdayName(t, dow) });
    }
    case 'biweekly': {
      if (!template.anchorDate) return t('cadence.biweekly');
      const anchor = new Date(template.anchorDate);
      return t('cadence.biweeklyFrom', { day: anchor.getDate(), month: monthName(t, anchor.getMonth()).slice(0, 3) });
    }
    case 'annual': {
      const month = template.month ?? 1;
      return t('cadence.yearly', { day: template.dayOfMonth, month: monthName(t, month - 1) });
    }
    default:
      return '';
  }
}

/**
 * Upper bound on occurrences generated in one pass, so a template untouched for
 * years (or a malformed key) can't flood the transaction list.
 */
export const MAX_CATCH_UP_OCCURRENCES = 400;

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, 0, 0, 0);
}

/** Monday of the ISO week containing `date`. */
function startOfISOWeek(date: Date): Date {
  return addDays(dateOnly(date), -((date.getDay() + 6) % 7));
}

/** Monday of the ISO week named by a `YYYY-Www` key, or null when it doesn't parse. */
function parseISOWeekKey(key: string): Date | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) return null;
  // Jan 4th always falls in ISO week 1.
  return addDays(startOfISOWeek(new Date(Number(match[1]), 0, 4)), (Number(match[2]) - 1) * 7);
}

function parseISODateOnly(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

/**
 * First day that has not been covered by `lastGeneratedPeriod` yet: the day after
 * the period the key names. Null when the key doesn't match the frequency's scheme.
 */
function startAfterOccurrenceKey(template: RecurringTransactionTemplate, key: string): Date | null {
  switch (template.frequency) {
    case 'monthly': {
      const match = /^(\d{4})-(\d{2})$/.exec(key);
      return match ? new Date(Number(match[1]), Number(match[2]), 1) : null;
    }
    case 'annual': {
      const match = /^(\d{4})$/.exec(key);
      return match ? new Date(Number(match[1]) + 1, 0, 1) : null;
    }
    case 'weekly': {
      const monday = parseISOWeekKey(key);
      return monday ? addDays(monday, 7) : null;
    }
    case 'biweekly': {
      const date = parseISODateOnly(key);
      return date ? addDays(date, 1) : null;
    }
    default:
      return null;
  }
}

/** Start of the period containing `today`, for templates with no usable bookkeeping. */
function startOfCurrentPeriod(template: RecurringTransactionTemplate, today: Date): Date {
  switch (template.frequency) {
    case 'monthly':
      return new Date(today.getFullYear(), today.getMonth(), 1);
    case 'annual':
      return new Date(today.getFullYear(), 0, 1);
    case 'weekly':
      return startOfISOWeek(today);
    case 'biweekly':
      return addDays(today, -13);
    default:
      return today;
  }
}

/** Every due date of `template` within [from, to] (both date-only, inclusive), oldest first. */
function occurrencesBetween(template: RecurringTransactionTemplate, from: Date, to: Date): Date[] {
  const result: Date[] = [];
  const push = (date: Date) => {
    if (date >= from && date <= to && result.length < MAX_CATCH_UP_OCCURRENCES) result.push(date);
  };

  switch (template.frequency) {
    case 'monthly':
    case 'annual': {
      const step = template.frequency === 'monthly' ? 1 : 12;
      const targetMonth = template.frequency === 'annual' ? (template.month ?? 1) - 1 : null;
      let index = from.getFullYear() * 12 + (targetMonth ?? from.getMonth());
      if (targetMonth !== null && targetMonth < from.getMonth()) index += 12;
      const lastIndex = to.getFullYear() * 12 + to.getMonth();
      for (; index <= lastIndex && result.length < MAX_CATCH_UP_OCCURRENCES; index += step) {
        const year = Math.floor(index / 12);
        const month = index % 12;
        push(new Date(year, month, clampDayOfMonth(year, month, template.dayOfMonth)));
      }
      return result;
    }
    case 'weekly': {
      const offset = ((template.dayOfWeek ?? 0) + 6) % 7; // days after Monday
      for (let monday = startOfISOWeek(from); monday <= to && result.length < MAX_CATCH_UP_OCCURRENCES; monday = addDays(monday, 7)) {
        push(addDays(monday, offset));
      }
      return result;
    }
    case 'biweekly': {
      // Without an anchor there is no fixed cycle to follow.
      if (!template.anchorDate) return result;
      const anchor = dateOnly(new Date(template.anchorDate));
      const daysFromAnchor = Math.round((from.getTime() - anchor.getTime()) / MS_PER_DAY);
      let cycle = daysFromAnchor <= 0 ? 0 : Math.ceil(daysFromAnchor / 14);
      for (let due = addDays(anchor, cycle * 14); due <= to && result.length < MAX_CATCH_UP_OCCURRENCES; due = addDays(anchor, ++cycle * 14)) {
        push(due);
      }
      return result;
    }
    default:
      return result;
  }
}

/**
 * Due dates of `template` that should be generated now, oldest first: every
 * occurrence after the period recorded in `lastGeneratedPeriod` up to and
 * including today, so periods missed while the app was closed are caught up.
 * A template that has never generated starts from `activeSince` (set on create
 * and reactivation), or from the start of the current period for templates
 * saved before that field existed.
 */
export function getPendingOccurrences(template: RecurringTransactionTemplate, now: Date): Date[] {
  if (!template.isActive) return [];
  const today = dateOnly(now);

  let from: Date | null = template.lastGeneratedPeriod
    ? startAfterOccurrenceKey(template, template.lastGeneratedPeriod)
    : null;
  if (!from && !template.lastGeneratedPeriod && template.activeSince) {
    from = dateOnly(new Date(template.activeSince));
  }
  if (!from || Number.isNaN(from.getTime())) from = startOfCurrentPeriod(template, today);

  return occurrencesBetween(template, from, today);
}

/**
 * The debt cycle immediately after `cycleDate` — the inverse of
 * getPreviousDebtCycleDate. A `quincenal` debt whose two halves clamp to the same
 * day (dueDay 31) has a single cycle per month.
 */
export function getNextDebtCycleDate(envelope: DebtCycleAnchor, cycleDate: Date): Date {
  const year = cycleDate.getFullYear();
  const month = cycleDate.getMonth();

  switch (envelope.interestFrequency) {
    case 'mensual': {
      return new Date(year, month + 1, clampDayOfMonth(year, month + 1, envelope.dueDay));
    }
    case 'quincenal': {
      const day1 = clampDayOfMonth(year, month, envelope.dueDay);
      const day2 = clampDayOfMonth(year, month, envelope.dueDay + 15);
      if (cycleDate.getDate() < day2 && day2 > day1) return new Date(year, month, day2);
      return new Date(year, month + 1, clampDayOfMonth(year, month + 1, envelope.dueDay));
    }
    case 'anual': {
      return new Date(year + 1, month, clampDayOfMonth(year + 1, month, envelope.dueDay));
    }
    default:
      return cycleDate;
  }
}

/** The cycle date named by a getDebtCycleOccurrenceKey key, or null when it doesn't parse. */
export function parseDebtCycleOccurrenceKey(envelope: DebtCycleAnchor, key: string): Date | null {
  switch (envelope.interestFrequency) {
    case 'mensual': {
      const match = /^(\d{4})-(\d{2})$/.exec(key);
      if (!match) return null;
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      return new Date(year, month, clampDayOfMonth(year, month, envelope.dueDay));
    }
    case 'quincenal': {
      const match = /^(\d{4})-(\d{2})-([ab])$/.exec(key);
      if (!match) return null;
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = match[3] === 'a' ? envelope.dueDay : envelope.dueDay + 15;
      return new Date(year, month, clampDayOfMonth(year, month, day));
    }
    case 'anual': {
      const match = /^(\d{4})$/.exec(key);
      if (!match) return null;
      const year = Number(match[1]);
      const month = (envelope.dueAnchorMonth ?? 1) - 1;
      return new Date(year, month, clampDayOfMonth(year, month, envelope.dueDay));
    }
    default:
      return null;
  }
}

/**
 * Debt cycles reached and not yet processed, oldest first: every cycle after the
 * one named by `lastKey` up to today, or just the current cycle (when reached)
 * if nothing was processed yet or the key doesn't parse.
 */
export function getPendingDebtCycles(envelope: DebtCycleAnchor, lastKey: string | null | undefined, now: Date): Date[] {
  const today = dateOnly(now);
  const last = lastKey ? parseDebtCycleOccurrenceKey(envelope, lastKey) : null;
  if (!last) {
    const current = getDebtCycleDate(envelope, now);
    return current <= today && getDebtCycleOccurrenceKey(envelope, current) !== lastKey ? [current] : [];
  }
  const result: Date[] = [];
  for (let cycle = getNextDebtCycleDate(envelope, last); cycle <= today && result.length < MAX_CATCH_UP_OCCURRENCES; cycle = getNextDebtCycleDate(envelope, cycle)) {
    result.push(cycle);
  }
  return result;
}
