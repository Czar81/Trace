import AsyncStorage from '@react-native-async-storage/async-storage';
import { Envelope, Transaction, PaymentMethod, TransactionCategory, AppSettings, RecurringTransactionTemplate } from '../types';
import { DEFAULT_THEME_ID } from '../theme/colors';

const KEYS = {
  ENVELOPES: '@trace_envelopes',
  TRANSACTIONS: '@trace_transactions',
  PAYMENT_METHODS: '@trace_payment_methods',
  CATEGORIES: '@trace_categories',
  SETTINGS: '@trace_settings',
  RECURRING_TEMPLATES: '@trace_recurring_templates',
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: 'CRC',
  exchangeRates: { USD_TO_CRC: 510, EUR_TO_CRC: 550 },
  expenseCutoffEnabled: false,
  expenseCutoffDay: null,
  budgetAlertsEnabled: false,
  billRemindersEnabled: false,
  billReminderLeadDays: 2,
  themeId: DEFAULT_THEME_ID,
};

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: '1', name: 'Efectivo' },
  { id: '2', name: 'Tarjeta Débito' },
  { id: '3', name: 'Tarjeta Crédito' },
];

const DEFAULT_CATEGORIES: TransactionCategory[] = [
  { id: '1', name: 'Comida' },
  { id: '2', name: 'Transporte' },
  { id: '3', name: 'Servicios' },
  { id: '4', name: 'Entretenimiento' },
  { id: '5', name: 'Salud' },
  { id: '6', name: 'Otros' },
];

async function saveData(key: string, data: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key}`, e);
  }
}

async function loadData<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : defaultValue;
  } catch (e) {
    console.error(`Error loading ${key}`, e);
    return defaultValue;
  }
}

export const saveEnvelopes = (data: Envelope[]) => saveData(KEYS.ENVELOPES, data);
export const loadEnvelopes = () => loadData<Envelope[]>(KEYS.ENVELOPES, []);

export const saveTransactions = (data: Transaction[]) => saveData(KEYS.TRANSACTIONS, data);
export const loadTransactions = () => loadData<Transaction[]>(KEYS.TRANSACTIONS, []);

export const savePaymentMethods = (data: PaymentMethod[]) => saveData(KEYS.PAYMENT_METHODS, data);
export const loadPaymentMethods = () => loadData<PaymentMethod[]>(KEYS.PAYMENT_METHODS, DEFAULT_PAYMENT_METHODS);

export const saveCategories = (data: TransactionCategory[]) => saveData(KEYS.CATEGORIES, data);
export const loadCategories = () => loadData<TransactionCategory[]>(KEYS.CATEGORIES, DEFAULT_CATEGORIES);

export const saveRecurringTemplates = (data: RecurringTransactionTemplate[]) => saveData(KEYS.RECURRING_TEMPLATES, data);
export const loadRecurringTemplates = () => loadData<RecurringTransactionTemplate[]>(KEYS.RECURRING_TEMPLATES, []);

export const saveSettings = (data: AppSettings) => saveData(KEYS.SETTINGS, data);
export const loadSettings = async (): Promise<AppSettings> => {
  const loaded = await loadData<Partial<AppSettings> & { expenseCutoffDate?: string }>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  const mergedSettings = { ...DEFAULT_SETTINGS, ...loaded };
  if (loaded.expenseCutoffDate && mergedSettings.expenseCutoffDay == null) {
    mergedSettings.expenseCutoffDay = new Date(loaded.expenseCutoffDate).getDate();
  }
  return mergedSettings;
};
