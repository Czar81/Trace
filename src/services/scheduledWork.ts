import { AppData } from './appData';
import { listChanged } from '../domain/helpers';
import { accrueDebtInterest, generateRecurringTransactions } from '../domain/recurringGeneration';
import { checkMinimumPayments, scheduleBillReminders, scheduleDebtReminders } from './notifications';

/**
 * Generates due recurring transactions (catching up missed periods), accrues
 * debt interest, checks minimum payments and schedules upcoming reminders.
 * Returns only the collections that changed.
 */
export async function computeScheduledWork(d: AppData, now: Date): Promise<Partial<AppData>> {
  const { updatedTemplates, newTransactions } = generateRecurringTransactions(d.recurringTemplates, now);
  const transactionsBeforeDebt = newTransactions.length > 0 ? [...newTransactions, ...d.transactions] : d.transactions;
  const { updatedEnvelopes, newTransactions: interestTransactions } =
    accrueDebtInterest(d.envelopes, transactionsBeforeDebt, now);
  const allTransactions = interestTransactions.length > 0
    ? [...interestTransactions, ...transactionsBeforeDebt]
    : transactionsBeforeDebt;

  const { billRemindersEnabled, billReminderLeadDays } = d.settings;
  const envelopesAfterMinCheck = await checkMinimumPayments(updatedEnvelopes, allTransactions, billRemindersEnabled, now);
  const envelopesWithReminders = await scheduleDebtReminders(envelopesAfterMinCheck, allTransactions, billRemindersEnabled, billReminderLeadDays);
  const templatesWithReminders = await scheduleBillReminders(updatedTemplates, envelopesWithReminders, billRemindersEnabled, billReminderLeadDays);

  const changes: Partial<AppData> = {};
  if (allTransactions !== d.transactions) changes.transactions = allTransactions;
  if (listChanged(envelopesWithReminders, d.envelopes)) changes.envelopes = envelopesWithReminders;
  if (listChanged(templatesWithReminders, d.recurringTemplates)) changes.recurringTemplates = templatesWithReminders;
  return changes;
}
