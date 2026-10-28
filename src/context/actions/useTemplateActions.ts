import { useCallback, useMemo } from 'react';
import { RecurringTransactionTemplate } from '../../types';
import { Store } from '../useDataStore';
import { listChanged, newId } from '../../domain/shared/helpers';
import { roundMoney } from '../../domain/budget/balance';
import { cancelTemplateReminder, scheduleBillReminders } from '../../services/notifications/notifications';
import { anyFieldChanged } from '../../services/notifications/reminders';

// Anything that moves the reminder's date or changes what it says invalidates the pending one.
const REMINDER_FIELDS: (keyof RecurringTransactionTemplate)[] = [
  'dayOfMonth', 'dayOfWeek', 'anchorDate', 'month', 'frequency', 'isActive', 'amount', 'description', 'envelopeId',
];

type NewTemplate = Omit<RecurringTransactionTemplate, 'id' | 'lastGeneratedPeriod' | 'reminderNotificationId' | 'lastReminderScheduledPeriod'>;

export function useTemplateActions({ data, runExclusive, commit }: Store) {
  const addRecurringTemplate = useCallback((templateData: NewTemplate) => runExclusive(async () => {
    const d = data.current;
    const newTemplate: RecurringTransactionTemplate = {
      ...templateData,
      amount: roundMoney(templateData.amount),
      id: newId(),
      activeSince: new Date().toISOString(),
      lastGeneratedPeriod: null,
      reminderNotificationId: null,
      lastReminderScheduledPeriod: null,
    };
    const updated = [newTemplate, ...d.recurringTemplates];
    await commit({ recurringTemplates: updated });
    const withReminders = await scheduleBillReminders(updated, d.envelopes, d.settings.billRemindersEnabled, d.settings.billReminderLeadDays);
    if (listChanged(withReminders, updated)) await commit({ recurringTemplates: withReminders });
  }), [data, runExclusive, commit]);

  const updateRecurringTemplate = useCallback((id: string, updates: Partial<Omit<RecurringTransactionTemplate, 'id'>>) => runExclusive(async () => {
    const d = data.current;
    const target = d.recurringTemplates.find(t => t.id === id);
    if (!target) return;

    const normalized = updates.amount !== undefined ? { ...updates, amount: roundMoney(updates.amount) } : updates;
    const merged: RecurringTransactionTemplate = { ...target, ...normalized };
    const base = anyFieldChanged(REMINDER_FIELDS, merged, target) ? await cancelTemplateReminder(target) : target;

    // Reactivating, or switching to a frequency whose period keys differ, starts
    // generation over from today instead of backfilling the paused/old schedule.
    const restartsSchedule = (merged.isActive && !target.isActive) || merged.frequency !== target.frequency;
    const next: RecurringTransactionTemplate = {
      ...base,
      ...normalized,
      ...(restartsSchedule ? { lastGeneratedPeriod: null, activeSince: new Date().toISOString() } : {}),
    };

    const updated = d.recurringTemplates.map(t => (t.id === id ? next : t));
    const withReminders = await scheduleBillReminders(updated, d.envelopes, d.settings.billRemindersEnabled, d.settings.billReminderLeadDays);
    await commit({ recurringTemplates: withReminders });
  }), [data, runExclusive, commit]);

  const deleteRecurringTemplate = useCallback((id: string) => runExclusive(async () => {
    const d = data.current;
    const target = d.recurringTemplates.find(t => t.id === id);
    if (target) await cancelTemplateReminder(target);
    await commit({ recurringTemplates: d.recurringTemplates.filter(t => t.id !== id) });
  }), [data, runExclusive, commit]);

  return useMemo(() => ({ addRecurringTemplate, updateRecurringTemplate, deleteRecurringTemplate }), [addRecurringTemplate, updateRecurringTemplate, deleteRecurringTemplate]);
}
