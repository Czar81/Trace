import AsyncStorage from '@react-native-async-storage/async-storage';
import { Envelope, Transaction, PaymentMethod, TransactionCategory, AppSettings } from '../types';

const KEYS = {
  ENVELOPES: '@trace_envelopes',
  TRANSACTIONS: '@trace_transactions',
  PAYMENT_METHODS: '@trace_payment_methods',
  CATEGORIES: '@trace_categories',
  SETTINGS: '@trace_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: 'CRC',
  exchangeRates: { USD_TO_CRC: 510, EUR_TO_CRC: 550 },
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

export const saveSettings = (data: AppSettings) => saveData(KEYS.SETTINGS, data);
export const loadSettings = () => loadData<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
