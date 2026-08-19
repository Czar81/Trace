import { RecurringTransactionTemplate } from '../types';

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

const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Human-readable (Spanish) cadence description for a template, matching its actual
 * frequency — used by the recurring templates list instead of always showing "Día N".
 */
export function formatCadence(template: RecurringTransactionTemplate): string {
  switch (template.frequency) {
    case 'monthly':
      return `Día ${template.dayOfMonth} de cada mes`;
    case 'weekly': {
      const dow = template.dayOfWeek ?? 0;
      return `Cada ${WEEKDAY_NAMES[dow]}`;
    }
    case 'biweekly': {
      if (!template.anchorDate) return 'Cada 2 semanas';
      const anchor = new Date(template.anchorDate);
      return `Cada 2 semanas desde el ${anchor.getDate()} ${MONTH_NAMES[anchor.getMonth()].slice(0, 3)}`;
    }
    case 'annual': {
      const month = template.month ?? 1;
      return `Cada ${template.dayOfMonth} de ${MONTH_NAMES[month - 1]}`;
    }
    default:
      return '';
  }
}
