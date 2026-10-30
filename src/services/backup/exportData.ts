import { documentDirectory, writeAsStringAsync, readDirectoryAsync, deleteAsync, EncodingType } from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Envelope, Transaction, PaymentMethod, TransactionCategory, AppSettings, RecurringTransactionTemplate } from '../../types';

/** Everything a full backup carries, shared by manual export and automatic backups. */
export interface BackupData {
  envelopes: Envelope[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  categories: TransactionCategory[];
  incomeCategories: TransactionCategory[];
  recurringTemplates: RecurringTransactionTemplate[];
  settings: AppSettings;
}

export const MANUAL_EXPORT_PREFIX = 'trace_backup_';

/**
 * Template fields that only make sense on the device that scheduled them:
 * notification ids don't exist on another phone (or after reinstalling).
 */
const portableTemplate = (template: RecurringTransactionTemplate): RecurringTransactionTemplate => ({
  ...template,
  reminderNotificationId: null,
  lastReminderScheduledPeriod: null,
});

const portableEnvelope = (envelope: Envelope): Envelope =>
  envelope.dueReminderNotificationId || envelope.lastDueReminderScheduledPeriod
    ? { ...envelope, dueReminderNotificationId: null, lastDueReminderScheduledPeriod: null }
    : envelope;

/**
 * Builds the full-backup JSON string shared by manual export and automatic
 * backups, so both always produce the same shape.
 */
export const buildFullBackupJson = (data: BackupData, now: Date = new Date()): string => {
  const fullData = {
    envelopes: data.envelopes.map(portableEnvelope),
    transactions: data.transactions,
    paymentMethods: data.paymentMethods,
    categories: data.categories,
    incomeCategories: data.incomeCategories,
    recurringTemplates: data.recurringTemplates.map(portableTemplate),
    settings: data.settings,
    exportedAt: now.toISOString(),
    version: '1.0',
  };
  return JSON.stringify(fullData, null, 2);
};

/** Deletes earlier manual export files; each one is only needed until it has been shared. */
const pruneManualExports = async (keepName: string) => {
  try {
    const names = await readDirectoryAsync(documentDirectory as string);
    for (const name of names) {
      if (name.startsWith(MANUAL_EXPORT_PREFIX) && name.endsWith('.json') && name !== keepName) {
        await deleteAsync((documentDirectory as string) + name, { idempotent: true });
      }
    }
  } catch (e) {
    console.error('Error pruning old exports', e);
  }
};

/**
 * Writes a full JSON backup and opens the share sheet for it. Rejects when the
 * file can't be written or shared, so the caller can report the failure.
 */
export const exportBackupJson = async (data: BackupData): Promise<void> => {
  const jsonString = buildFullBackupJson(data);
  const filename = `${MANUAL_EXPORT_PREFIX}${Date.now()}.json`;
  const uri = documentDirectory + filename;

  await writeAsStringAsync(uri, jsonString, { encoding: EncodingType.UTF8 });
  await pruneManualExports(filename);

  if (!(await isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }
  await shareAsync(uri, { UTI: 'public.json', mimeType: 'application/json' });
};

export const TRANSACTIONS_EXPORT_PREFIX = 'trace_transactions_';

/** Writes a transactions CSV and opens the share sheet for it. Rejects if it can't be written or shared. */
export const exportTransactionsCsv = async (csv: string): Promise<void> => {
  const filename = `${TRANSACTIONS_EXPORT_PREFIX}${Date.now()}.csv`;
  const uri = documentDirectory + filename;

  await writeAsStringAsync(uri, csv, { encoding: EncodingType.UTF8 });
  try {
    const names = await readDirectoryAsync(documentDirectory as string);
    for (const name of names) {
      if (name.startsWith(TRANSACTIONS_EXPORT_PREFIX) && name !== filename) {
        await deleteAsync((documentDirectory as string) + name, { idempotent: true });
      }
    }
  } catch (e) {
    console.error('Error pruning old CSV exports', e);
  }

  if (!(await isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }
  await shareAsync(uri, { UTI: 'public.comma-separated-values-text', mimeType: 'text/csv' });
};
