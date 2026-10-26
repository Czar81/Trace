import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Envelope, Transaction, PaymentMethod, TransactionCategory, AppSettings } from '../types';

/**
 * Builds the full-backup JSON string shared by manual export and automatic
 * backups, so both always produce the same shape.
 */
export const buildFullBackupJson = (
  envelopes: Envelope[],
  transactions: Transaction[],
  paymentMethods: PaymentMethod[],
  categories: TransactionCategory[],
  incomeCategories: TransactionCategory[],
  settings: AppSettings,
  now: Date = new Date()
): string => {
  const fullData = {
    envelopes,
    transactions,
    paymentMethods,
    categories,
    incomeCategories,
    settings,
    exportedAt: now.toISOString(),
    version: '1.0',
  };
  return JSON.stringify(fullData, null, 2);
};

export const exportDataToCSV = async (
  envelopes: Envelope[],
  transactions: Transaction[],
  paymentMethods: PaymentMethod[],
  categories: TransactionCategory[],
  incomeCategories: TransactionCategory[],
  settings: AppSettings
) => {
  try {
    // Create full data export as JSON for complete data migration
    const jsonString = buildFullBackupJson(envelopes, transactions, paymentMethods, categories, incomeCategories, settings);
    const filename = `trace_backup_${Date.now()}.json`;
    const uri = documentDirectory + filename;

    await writeAsStringAsync(uri, jsonString, { encoding: EncodingType.UTF8 });

    if (await isAvailableAsync()) {
      await shareAsync(uri, { UTI: 'public.json', mimeType: 'application/json' });
    }
  } catch (error) {
    console.error('Error exporting data:', error);
  }
};
