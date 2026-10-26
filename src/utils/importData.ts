import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Envelope, Transaction, PaymentMethod, TransactionCategory, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from './storage';
import { translateActive } from '../i18n';

export interface FullBackup {
  envelopes: Envelope[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  categories: TransactionCategory[];
  /**
   * Optional so backups exported before income categories existed still
   * type-check and import. When absent, the device's current income
   * categories are left untouched (see `parseBackup` / `importFromBackup`).
   */
  incomeCategories?: TransactionCategory[];
  settings: AppSettings;
  exportedAt: string;
  version: string;
}

export interface ImportResult {
  backup: FullBackup;
  errors: string[];
}

export const pickAndImportBackup = async (): Promise<ImportResult | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
    });

    if (result.canceled) return null;

    const uri = result.assets[0].uri;
    const content = await readAsStringAsync(uri);
    
    return parseBackup(content);
  } catch (error) {
    console.error('Error picking file:', error);
    return null;
  }
};

export const parseBackup = (jsonContent: string): ImportResult => {
  const result: ImportResult = {
    backup: {
      envelopes: [],
      transactions: [],
      paymentMethods: [],
      categories: [],
      settings: DEFAULT_SETTINGS,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    },
    errors: [],
  };

  try {
    const parsed = JSON.parse(jsonContent);

    // Validate backup structure
    if (!parsed.envelopes || !parsed.transactions || !parsed.paymentMethods || !parsed.categories) {
      result.errors.push(translateActive('import.error.missingFields'));
      return result;
    }

    if (
      !Array.isArray(parsed.envelopes) ||
      !Array.isArray(parsed.transactions) ||
      !Array.isArray(parsed.paymentMethods) ||
      !Array.isArray(parsed.categories)
    ) {
      result.errors.push(translateActive('import.error.notArrays'));
      return result;
    }

    // incomeCategories is optional (backups from before it existed omit it),
    // but when present it must be an array.
    if (parsed.incomeCategories !== undefined && !Array.isArray(parsed.incomeCategories)) {
      result.errors.push(translateActive('import.error.incomeNotArray'));
      return result;
    }

    if (
      parsed.transactions.some(
        (tx: any) => typeof tx?.amount !== 'number' || !Number.isFinite(tx.amount)
      )
    ) {
      result.errors.push(translateActive('import.error.badAmount'));
      return result;
    }

    const parsedSettings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
    if (parsed.settings?.expenseCutoffDate && parsedSettings.expenseCutoffDay == null) {
      parsedSettings.expenseCutoffDay = new Date(parsed.settings.expenseCutoffDate).getDate();
    }

    result.backup = {
      envelopes: parsed.envelopes || [],
      transactions: parsed.transactions || [],
      paymentMethods: parsed.paymentMethods || [],
      categories: parsed.categories || [],
      settings: parsedSettings,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      version: parsed.version || '1.0',
    };

    // Only carry the field through when the backup actually had it; leaving it
    // undefined tells the importer to keep the device's current income catalog.
    if (Array.isArray(parsed.incomeCategories)) {
      result.backup.incomeCategories = parsed.incomeCategories;
    }

  } catch {
    result.errors.push(translateActive('import.error.corrupt'));
  }

  return result;
};
