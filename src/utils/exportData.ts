import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Envelope, Transaction, PaymentMethod, TransactionCategory, AppSettings } from '../types';

export const exportDataToCSV = async (
  envelopes: Envelope[],
  transactions: Transaction[],
  paymentMethods: PaymentMethod[],
  categories: TransactionCategory[],
  settings: AppSettings
) => {
  try {
    // Create full data export as JSON for complete data migration
    const fullData = {
      envelopes,
      transactions,
      paymentMethods,
      categories,
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const jsonString = JSON.stringify(fullData, null, 2);
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
