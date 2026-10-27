import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as ExpoNotifications from 'expo-notifications';
import { Envelope, RecurringTransactionTemplate, Transaction } from '../types';
import { translateActive } from '../i18n';
import { formatCurrency } from './formatCurrency';
import { calculateEnvelopeBalance } from './balance';
import {
  getNextDueDate, getOccurrenceKey,
  getDebtCycleDate, getDebtCycleOccurrenceKey, getPreviousDebtCycleDate, DebtCycleAnchor,
} from './recurrence';

// Expo Go has no local notification support; every helper is a no-op there.
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
// Loaded lazily so Expo Go never evaluates the module (it warns on import there).
const loadNotifications = async (): Promise<typeof ExpoNotifications | null> =>
  isExpoGo ? null : require('expo-notifications');
const dateTriggerType = 'date' as ExpoNotifications.SchedulableTriggerInputTypes.DATE;

const scheduleNotification = async (
  request: Parameters<typeof ExpoNotifications.scheduleNotificationAsync>[0]
): Promise<string | null> => {
  const notifications = await loadNotifications();
  return notifications ? notifications.scheduleNotificationAsync(request) : null;
};

const cancelScheduledNotification = async (identifier: string) => {
  const notifications = await loadNotifications();
  if (notifications) await notifications.cancelScheduledNotificationAsync(identifier);
};

export const requestNotificationPermissions = async () => {
  if (isExpoGo) return;
  try {
    const notifications = await loadNotifications();
    if (notifications) await notifications.requestPermissionsAsync();
  } catch (e) {
    console.error('Error requesting notification permissions', e);
  }
};

/** Strips the time component, keeping year/month/day in local time. */
function dateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function debtAnchor(envelope: Envelope): DebtCycleAnchor | null {
  if (envelope.type !== 'deuda' || envelope.isUnlimited || !envelope.interestFrequency || !envelope.dueDay) return null;
  return { interestFrequency: envelope.interestFrequency, dueDay: envelope.dueDay, dueAnchorMonth: envelope.dueAnchorMonth };
}

// ─── Budget alerts ─────────────────────────────────────────────────────────

/**
 * Fires a local notification only on the transition of a 'gasto' envelope's
 * spent fraction into the 80% or 100% band.
 */
export async function notifyBudgetThreshold(envelope: Envelope, before: number, after: number): Promise<void> {
  if (isExpoGo) return;
  try {
    if (before < 0.8 && after >= 0.8) {
      await scheduleNotification({
        content: {
          title: translateActive('notif.budget80Title'),
          body: translateActive('notif.budget80Body', { name: envelope.name, percent: Math.round(after * 100) }),
        },
        trigger: null,
      });
    }

    if (before < 1.0 && after >= 1.0) {
      await scheduleNotification({
        content: {
          title: translateActive('notif.budgetExceededTitle'),
          body: translateActive('notif.budgetExceededBody', { name: envelope.name, percent: Math.round(after * 100) }),
        },
        trigger: null,
      });
    }
  } catch (e) {
    console.error('Error scheduling budget alert notification', e);
  }
}

// ─── Bill reminders (scheduled ahead of a recurring template's due date) ───

/**
 * Cancels a template's pending scheduled reminder, if any, and clears the
 * bookkeeping fields so the next scheduling pass treats it as unscheduled.
 * Safe to call on a template with no pending reminder (no-op).
 */
export async function cancelTemplateReminder(template: RecurringTransactionTemplate): Promise<RecurringTransactionTemplate> {
  if (!template.reminderNotificationId && !template.lastReminderScheduledPeriod) return template;
  if (!isExpoGo && template.reminderNotificationId) {
    try {
      await cancelScheduledNotification(template.reminderNotificationId);
    } catch (e) {
      console.error('Error cancelling bill reminder notification', e);
    }
  }
  return { ...template, reminderNotificationId: null, lastReminderScheduledPeriod: null };
}

/**
 * Schedules a local notification `leadDays` days before each active template's
 * next due date, skipping templates that already have a reminder scheduled for
 * that occurrence or whose reminder date has already passed.
 */
export async function scheduleBillReminders(
  templates: RecurringTransactionTemplate[],
  envelopesList: Envelope[],
  billRemindersEnabled: boolean,
  leadDays: number
): Promise<RecurringTransactionTemplate[]> {
  if (!billRemindersEnabled || isExpoGo) return templates;

  const now = new Date();

  return Promise.all(templates.map(async (template) => {
    if (!template.isActive) return template;

    const dueDate = getNextDueDate(template, now);
    const occurrenceKey = getOccurrenceKey(template, dueDate);
    if (template.lastReminderScheduledPeriod === occurrenceKey) return template;

    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - leadDays);

    if (reminderDate.getTime() <= now.getTime()) return template;

    const envelope = envelopesList.find(e => e.id === template.envelopeId);
    const amountLabel = envelope ? formatCurrency(template.amount, envelope.currency) : String(template.amount);

    try {
      const notificationId = await scheduleNotification({
        content: {
          title: translateActive('notif.billTitle'),
          body: translateActive('notif.billBody', { name: template.description, amount: amountLabel, days: leadDays }),
        },
        trigger: { type: dateTriggerType, date: reminderDate },
      });
      if (!notificationId) return template;
      return { ...template, reminderNotificationId: notificationId, lastReminderScheduledPeriod: occurrenceKey };
    } catch (e) {
      console.error('Error scheduling bill reminder notification', e);
      return template;
    }
  }));
}

// ─── Debt envelope minimum-payment shortfall alert ─────────────────────────

/**
 * For each debt envelope with a set `minimumPayment` whose current cycle has
 * been reached and not yet checked, sums that cycle's income (payment)
 * transactions and sends a local notification once per cycle if they fall
 * short. Skipped entirely (tracking field left untouched) while reminders
 * are disabled, so a shortfall is still reported once they're turned back on.
 */
export async function checkMinimumPayments(
  envelopesList: Envelope[],
  transactionsList: Transaction[],
  billRemindersEnabled: boolean,
  now: Date
): Promise<Envelope[]> {
  if (isExpoGo || !billRemindersEnabled) return envelopesList;
  const today = dateOnly(now);

  return Promise.all(envelopesList.map(async (envelope) => {
    const anchor = debtAnchor(envelope);
    if (!anchor || !envelope.minimumPayment || envelope.minimumPayment <= 0) return envelope;

    const cycleDate = getDebtCycleDate(anchor, now);
    if (cycleDate.getTime() > today.getTime()) return envelope;

    const occurrenceKey = getDebtCycleOccurrenceKey(anchor, cycleDate);
    if (envelope.lastMinPaymentCheckPeriod === occurrenceKey) return envelope;

    const windowStart = getPreviousDebtCycleDate(anchor, cycleDate);
    const totalPayments = transactionsList.reduce((sum, t) => {
      if (t.isArchived || t.envelopeId !== envelope.id || t.type !== 'income') return sum;
      const d = new Date(t.date);
      return d.getTime() >= windowStart.getTime() && d.getTime() < cycleDate.getTime() ? sum + t.amount : sum;
    }, 0);

    if (totalPayments < envelope.minimumPayment) {
      try {
        await scheduleNotification({
          content: {
            title: translateActive('notif.minPaymentTitle'),
            body: translateActive('notif.minPaymentBody', { name: envelope.name }),
          },
          trigger: null,
        });
      } catch (e) {
        console.error('Error scheduling minimum payment notification', e);
      }
    }

    return { ...envelope, lastMinPaymentCheckPeriod: occurrenceKey };
  }));
}

// ─── Debt envelope due-date reminders (extends bill-reminders) ─────────────

/**
 * Cancels a debt envelope's pending scheduled due-date reminder, if any, and
 * clears the bookkeeping fields. Mirrors cancelTemplateReminder.
 */
export async function cancelDebtReminder(envelope: Envelope): Promise<Envelope> {
  if (!envelope.dueReminderNotificationId && !envelope.lastDueReminderScheduledPeriod) return envelope;
  if (!isExpoGo && envelope.dueReminderNotificationId) {
    try {
      await cancelScheduledNotification(envelope.dueReminderNotificationId);
    } catch (e) {
      console.error('Error cancelling debt due-date reminder notification', e);
    }
  }
  return { ...envelope, dueReminderNotificationId: null, lastDueReminderScheduledPeriod: null };
}

/**
 * Schedules a local notification `leadDays` days before each debt envelope's
 * next cycle occurrence, naming the envelope and the amount due (its
 * `minimumPayment` if set, otherwise the amount still owed). Mirrors
 * scheduleBillReminders' shape/dedup logic.
 */
export async function scheduleDebtReminders(
  envelopesList: Envelope[],
  transactionsList: Transaction[],
  billRemindersEnabled: boolean,
  leadDays: number
): Promise<Envelope[]> {
  if (!billRemindersEnabled || isExpoGo) return envelopesList;

  const now = new Date();

  return Promise.all(envelopesList.map(async (envelope) => {
    const anchor = debtAnchor(envelope);
    if (!anchor) return envelope;

    const cycleDate = getDebtCycleDate(anchor, now);
    const occurrenceKey = getDebtCycleOccurrenceKey(anchor, cycleDate);
    if (envelope.lastDueReminderScheduledPeriod === occurrenceKey) return envelope;

    const reminderDate = new Date(cycleDate);
    reminderDate.setDate(reminderDate.getDate() - leadDays);
    if (reminderDate.getTime() <= now.getTime()) return envelope;

    const amountDue = envelope.minimumPayment && envelope.minimumPayment > 0
      ? envelope.minimumPayment
      : Math.max(0, envelope.limit - calculateEnvelopeBalance(envelope.id, transactionsList, envelopesList, false, null));
    const amountLabel = formatCurrency(amountDue, envelope.currency);

    try {
      const notificationId = await scheduleNotification({
        content: {
          title: translateActive('notif.debtDueTitle'),
          body: translateActive('notif.debtDueBody', { name: envelope.name, days: leadDays, amount: amountLabel }),
        },
        trigger: { type: dateTriggerType, date: reminderDate },
      });
      if (!notificationId) return envelope;
      return { ...envelope, dueReminderNotificationId: notificationId, lastDueReminderScheduledPeriod: occurrenceKey };
    } catch (e) {
      console.error('Error scheduling debt due-date reminder notification', e);
      return envelope;
    }
  }));
}
