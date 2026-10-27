import { useCallback, useMemo } from 'react';
import { Envelope } from '../../types';
import { Store } from '../useDataStore';
import { listChanged, newId } from '../../domain/helpers';
import { removeEnvelopeReferences } from '../../domain/envelopeRemoval';
import { deleteUnreferencedReceipts } from '../../services/receipts';
import { cancelDebtReminder, cancelTemplateReminder, scheduleDebtReminders } from '../../services/notifications';
import { anyFieldChanged } from '../../services/reminders';

// Fields that move a pending debt reminder's date or change what it says.
const REMINDER_FIELDS: (keyof Envelope)[] = [
  'dueDay', 'interestFrequency', 'dueAnchorMonth', 'isUnlimited', 'type', 'minimumPayment', 'limit', 'name', 'currency',
];

export function useEnvelopeActions({ data, runExclusive, commit }: Store) {
  const addEnvelope = useCallback((envelopeData: Omit<Envelope, 'id'>) => runExclusive(async () => {
    const d = data.current;
    const newEnvelope: Envelope = { ...envelopeData, id: newId() };
    const updated = [newEnvelope, ...d.envelopes];
    await commit({ envelopes: updated });
    const withReminders = await scheduleDebtReminders(updated, d.transactions, d.settings.billRemindersEnabled, d.settings.billReminderLeadDays);
    if (listChanged(withReminders, updated)) await commit({ envelopes: withReminders });
  }), [data, runExclusive, commit]);

  const updateEnvelope = useCallback((id: string, updates: Partial<Omit<Envelope, 'id'>>) => runExclusive(async () => {
    const d = data.current;
    const target = d.envelopes.find(e => e.id === id);
    if (!target) return;

    const merged = { ...target, ...updates };
    const base = anyFieldChanged(REMINDER_FIELDS, merged, target) ? await cancelDebtReminder(target) : target;

    const updated = d.envelopes.map(e => (e.id === id ? { ...base, ...updates } : e));
    const withReminders = await scheduleDebtReminders(updated, d.transactions, d.settings.billRemindersEnabled, d.settings.billReminderLeadDays);
    await commit({ envelopes: withReminders });
  }), [data, runExclusive, commit]);

  const deleteEnvelope = useCallback((id: string) => runExclusive(async () => {
    const d = data.current;
    const target = d.envelopes.find(e => e.id === id);
    if (target) await cancelDebtReminder(target);

    const { transactions: keptTransactions, templates, removedTemplates } =
      removeEnvelopeReferences(id, d.transactions, d.recurringTemplates);
    await Promise.all(removedTemplates.map(cancelTemplateReminder));

    await commit({
      envelopes: d.envelopes.filter(e => e.id !== id),
      transactions: keptTransactions,
      recurringTemplates: templates,
    });
    await deleteUnreferencedReceipts(
      d.transactions.filter(t => t.envelopeId === id).flatMap(t => t.receiptUris ?? []),
      keptTransactions
    );
  }), [data, runExclusive, commit]);

  return useMemo(() => ({ addEnvelope, updateEnvelope, deleteEnvelope }), [addEnvelope, updateEnvelope, deleteEnvelope]);
}
