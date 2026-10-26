import AsyncStorage from '@react-native-async-storage/async-storage';
import { Envelope, Transaction, PaymentMethod, TransactionCategory, AppSettings, RecurringTransactionTemplate } from '../types';
import { DEFAULT_THEME_ID } from '../theme/colors';
import { LanguagePreference, DEFAULT_LANGUAGE_PREFERENCE, isLanguagePreference, translateActive } from '../i18n';
import { ReportLayoutItem, parseReportLayout } from './reports';

const KEYS = {
  ENVELOPES: '@trace_envelopes',
  TRANSACTIONS: '@trace_transactions',
  PAYMENT_METHODS: '@trace_payment_methods',
  CATEGORIES: '@trace_categories',
  INCOME_CATEGORIES: '@trace_income_categories',
  SETTINGS: '@trace_settings',
  RECURRING_TEMPLATES: '@trace_recurring_templates',
  REPORT_LAYOUT: '@trace_report_layout',
  AUTO_BACKUP_ENABLED: '@trace_auto_backup_enabled',
  AUTO_BACKUP_INTERVAL_DAYS: '@trace_auto_backup_interval_days',
  AUTO_BACKUP_LAST_SUCCESS_AT: '@trace_auto_backup_last_success_at',
  AUTO_BACKUP_LAST_ERROR: '@trace_auto_backup_last_error',
  LANGUAGE: '@trace_language',
};

export const DEFAULT_AUTO_BACKUP_INTERVAL_DAYS = 7;

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

// Default catalogs are built in the active language the first time data is created;
// once saved they are the user's own names and are never re-translated.
const defaultPaymentMethods = (): PaymentMethod[] => [
  { id: '1', name: translateActive('default.paymentCash') },
  { id: '2', name: translateActive('default.paymentDebit') },
  { id: '3', name: translateActive('default.paymentCredit') },
];

const defaultCategories = (): TransactionCategory[] => [
  { id: '1', name: translateActive('default.catFood') },
  { id: '2', name: translateActive('default.catTransport') },
  { id: '3', name: translateActive('default.catServices') },
  { id: '4', name: translateActive('default.catEntertainment') },
  { id: '5', name: translateActive('default.catHealth') },
  { id: '6', name: translateActive('default.catOther') },
];

// Income categories are a separate catalog. Their ids are prefixed with `inc-`
// so they can never collide with an expense category id, which keeps the
// combined category filter in search unambiguous.
const defaultIncomeCategories = (): TransactionCategory[] => [
  { id: 'inc-1', name: translateActive('default.incSalary') },
  { id: 'inc-2', name: translateActive('default.incFreelance') },
  { id: 'inc-3', name: translateActive('default.incInvestments') },
  { id: 'inc-4', name: translateActive('default.incRefunds') },
  { id: 'inc-5', name: translateActive('default.incOther') },
];

/** Spanish defaults, kept for tests and imports that need a fixed reference. */
export const DEFAULT_INCOME_CATEGORIES: TransactionCategory[] = defaultIncomeCategories();

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
export const loadPaymentMethods = () => loadData<PaymentMethod[]>(KEYS.PAYMENT_METHODS, defaultPaymentMethods());

export const saveCategories = (data: TransactionCategory[]) => saveData(KEYS.CATEGORIES, data);
export const loadCategories = () => loadData<TransactionCategory[]>(KEYS.CATEGORIES, defaultCategories());

export const saveIncomeCategories = (data: TransactionCategory[]) => saveData(KEYS.INCOME_CATEGORIES, data);
export const loadIncomeCategories = () => loadData<TransactionCategory[]>(KEYS.INCOME_CATEGORIES, defaultIncomeCategories());

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

export const saveReportLayout = (data: ReportLayoutItem[]) => saveData(KEYS.REPORT_LAYOUT, data);
export const loadReportLayout = async (): Promise<ReportLayoutItem[]> => {
  try {
    return parseReportLayout(await AsyncStorage.getItem(KEYS.REPORT_LAYOUT));
  } catch (e) {
    console.error(`Error loading ${KEYS.REPORT_LAYOUT}`, e);
    return parseReportLayout(null);
  }
};

// Automatic backup metadata lives under its own keys (not in AppSettings) so it
// never travels inside a backup file and a restore cannot overwrite it.
export interface AutoBackupState {
  enabled: boolean;
  intervalDays: number;
  lastSuccessAt: string | null;
  lastError: string | null;
}

export const DEFAULT_AUTO_BACKUP_STATE: AutoBackupState = {
  enabled: false,
  intervalDays: DEFAULT_AUTO_BACKUP_INTERVAL_DAYS,
  lastSuccessAt: null,
  lastError: null,
};

export const loadAutoBackupState = async (): Promise<AutoBackupState> => ({
  enabled: await loadData<boolean>(KEYS.AUTO_BACKUP_ENABLED, DEFAULT_AUTO_BACKUP_STATE.enabled),
  intervalDays: await loadData<number>(KEYS.AUTO_BACKUP_INTERVAL_DAYS, DEFAULT_AUTO_BACKUP_STATE.intervalDays),
  lastSuccessAt: await loadData<string | null>(KEYS.AUTO_BACKUP_LAST_SUCCESS_AT, null),
  lastError: await loadData<string | null>(KEYS.AUTO_BACKUP_LAST_ERROR, null),
});

export const saveAutoBackupEnabled = (v: boolean) => saveData(KEYS.AUTO_BACKUP_ENABLED, v);
export const saveAutoBackupIntervalDays = (v: number) => saveData(KEYS.AUTO_BACKUP_INTERVAL_DAYS, v);
export const saveAutoBackupLastSuccessAt = (v: string | null) => saveData(KEYS.AUTO_BACKUP_LAST_SUCCESS_AT, v);
export const saveAutoBackupLastError = (v: string | null) => saveData(KEYS.AUTO_BACKUP_LAST_ERROR, v);

// The language preference has its own key (not in AppSettings) so it is never
// part of a backup and a restore cannot overwrite it.
export const saveLanguagePreference = (v: LanguagePreference) => saveData(KEYS.LANGUAGE, v);
export const loadLanguagePreference = async (): Promise<LanguagePreference> => {
  const stored = await loadData<unknown>(KEYS.LANGUAGE, DEFAULT_LANGUAGE_PREFERENCE);
  return isLanguagePreference(stored) ? stored : DEFAULT_LANGUAGE_PREFERENCE;
};
