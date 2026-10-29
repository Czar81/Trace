import { AppData } from '../storage/appData';
import { AppSettings } from '../../types';
import {
  cancelDebtReminder, cancelTemplateReminder, requestNotificationPermissions,
  scheduleBillReminders, scheduleDebtReminders,
} from './notifications';

/** True when `merged` differs from `target` in any of `fields`. */
export const anyFieldChanged = <T,>(fields: (keyof T)[], merged: T, target: T) =>
  fields.some(k => merged[k] !== target[k]);

/**
 * Reminders to cancel/reschedule after a settings change: turning reminders
 * off, or moving their lead time, cancels what's pending; turning them on, or
 * moving the lead time, schedules anew. Null when nothing needs to change.
 */
export async function syncReminderSettings(
  previous: AppSettings, updated: AppSettings, d: AppData
): Promise<Pick<AppData, 'recurringTemplates' | 'envelopes'> | null> {
  const turnedOn = updated.billRemindersEnabled && !previous.billRemindersEnabled;
  const turnedOff = !updated.billRemindersEnabled && previous.billRemindersEnabled;
  const leadDaysChanged = updated.billRemindersEnabled && previous.billRemindersEnabled
    && updated.billReminderLeadDays !== previous.billReminderLeadDays;
  if (!turnedOn && !turnedOff && !leadDaysChanged) return null;

  let recurringTemplates = d.recurringTemplates;
  let envelopes = d.envelopes;
  if (turnedOff || leadDaysChanged) {
    recurringTemplates = await Promise.all(recurringTemplates.map(cancelTemplateReminder));
    envelopes = await Promise.all(envelopes.map(cancelDebtReminder));
  }
  if (turnedOn || leadDaysChanged) {
    recurringTemplates = await scheduleBillReminders(recurringTemplates, envelopes, true, updated.billReminderLeadDays);
    envelopes = await scheduleDebtReminders(envelopes, d.transactions, true, updated.billReminderLeadDays);
  }
  return { recurringTemplates, envelopes };
}

/** Asks for notification permission the first time a notifying feature is switched on. */
export async function requestPermissionsIfEnabled(previous: AppSettings, updated: AppSettings): Promise<void> {
  if (updated.billRemindersEnabled && !previous.billRemindersEnabled) {
    await requestNotificationPermissions();
  }
}
