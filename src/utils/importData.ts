import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Envelope, Transaction, PaymentMethod, TransactionCategory, AppSettings } from '../types';

export interface FullBackup {
  envelopes: Envelope[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  categories: TransactionCategory[];
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
      settings: {
        defaultCurrency: 'CRC',
        exchangeRates: { USD_TO_CRC: 510, EUR_TO_CRC: 550 },
      },
      exportedAt: new Date().toISOString(),
      version: '1.0',
    },
    errors: [],
  };

  try {
    const parsed = JSON.parse(jsonContent);

    // Validate backup structure
    if (!parsed.envelopes || !parsed.transactions || !parsed.paymentMethods || !parsed.categories) {
      result.errors.push('Formato de backup inválido. Se requieren: envelopes, transactions, paymentMethods, categories');
      return result;
    }

    result.backup = {
      envelopes: parsed.envelopes || [],
      transactions: parsed.transactions || [],
      paymentMethods: parsed.paymentMethods || [],
      categories: parsed.categories || [],
      settings: parsed.settings || result.backup.settings,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      version: parsed.version || '1.0',
    };

  } catch (error) {
    result.errors.push(`Error al parsear JSON: ${error}`);
  }

  return result;
};
