import type { AppData } from '../services/appData';

type Backup = Pick<AppData, 'envelopes' | 'transactions' | 'paymentMethods' | 'categories' | 'settings'> &
  Partial<Pick<AppData, 'incomeCategories' | 'recurringTemplates'>>;

/**
 * Data to commit when restoring `backup` over `current`. Fields older backups
 * lack keep the device's values, and notification ids (which belong to
 * whichever device scheduled them) are cleared.
 */
export function buildRestoredData(backup: Backup, current: AppData): AppData {
  // Backups from before templates were exported keep the device's templates,
  // but only those whose envelope exists in the restored data.
  const envelopeIds = new Set(backup.envelopes.map(e => e.id));
  const recurringTemplates = (backup.recurringTemplates
    ?? current.recurringTemplates.filter(t => envelopeIds.has(t.envelopeId))
  ).map(t => ({ ...t, reminderNotificationId: null, lastReminderScheduledPeriod: null }));

  return {
    envelopes: backup.envelopes.map(e => ({ ...e, dueReminderNotificationId: null, lastDueReminderScheduledPeriod: null })),
    transactions: backup.transactions,
    paymentMethods: backup.paymentMethods,
    categories: backup.categories,
    // Applied only when the file carried the field, so importing a pre-change
    // backup does not wipe the device's current income catalog.
    incomeCategories: backup.incomeCategories ?? current.incomeCategories,
    recurringTemplates,
    settings: backup.settings,
  };
}
