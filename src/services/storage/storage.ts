import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedDebtPlan, Envelope, Transaction, PaymentMethod, TransactionCategory, AppSettings, RecurringTransactionTemplate, Currency } from '../../types';
import { DEFAULT_THEME_ID } from '../../theme/colors';
import { LanguagePreference, DEFAULT_LANGUAGE_PREFERENCE, isLanguagePreference, translateActive } from '../../i18n';
import { ReportLayoutItem, parseReportLayout } from '../../domain/reports/reports';

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
  AUTO_BACKUP_FOLDER_URI: '@trace_auto_backup_folder_uri',
  LANGUAGE: '@trace_language',
  DEBT_PLANS: '@trace_debt_plans',
  MAIN_DISPLAY_CURRENCY: '@trace_main_display_currency',
  REPORTS_DISPLAY_CURRENCY: '@trace_reports_display_currency',
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

/** Thrown when stored data exists but can't be read, so callers never mistake it for "empty". */
export class StorageReadError extends Error {
  constructor(public readonly key: string, cause: unknown) {
    super(`Could not read ${key}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'StorageReadError';
  }
}

/** Persists `data` under `key`. Rejects when the write fails, so callers can tell the user. */
async function saveData(key: string, data: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key}`, e);
    throw e;
  }
}

/** saveData for preferences whose loss is harmless: logs instead of rejecting. */
const saveDataQuietly = (key: string, data: any) => saveData(key, data).catch(() => undefined);

/**
 * Like loadData, but only falls back to `defaultValue` when nothing is stored:
 * a read or parse failure throws StorageReadError instead of returning the
 * default, which a later save would write over the user's real data.
 */
async function loadCriticalData<T>(key: string, defaultValue: T): Promise<T> {
  let jsonValue: string | null;
  try {
    jsonValue = await AsyncStorage.getItem(key);
  } catch (e) {
    throw new StorageReadError(key, e);
  }
  if (jsonValue == null) return defaultValue;
  try {
    return JSON.parse(jsonValue);
  } catch (e) {
    throw new StorageReadError(key, e);
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
export const loadEnvelopes = () => loadCriticalData<Envelope[]>(KEYS.ENVELOPES, []);

export const saveTransactions = (data: Transaction[]) => saveData(KEYS.TRANSACTIONS, data);
export const loadTransactions = () => loadCriticalData<Transaction[]>(KEYS.TRANSACTIONS, []);

export const savePaymentMethods = (data: PaymentMethod[]) => saveData(KEYS.PAYMENT_METHODS, data);
export const loadPaymentMethods = () => loadCriticalData<PaymentMethod[]>(KEYS.PAYMENT_METHODS, defaultPaymentMethods());

export const saveCategories = (data: TransactionCategory[]) => saveData(KEYS.CATEGORIES, data);
export const loadCategories = () => loadCriticalData<TransactionCategory[]>(KEYS.CATEGORIES, defaultCategories());

export const saveIncomeCategories = (data: TransactionCategory[]) => saveData(KEYS.INCOME_CATEGORIES, data);
export const loadIncomeCategories = () => loadCriticalData<TransactionCategory[]>(KEYS.INCOME_CATEGORIES, defaultIncomeCategories());

export const saveRecurringTemplates = (data: RecurringTransactionTemplate[]) => saveData(KEYS.RECURRING_TEMPLATES, data);
export const loadRecurringTemplates = () => loadCriticalData<RecurringTransactionTemplate[]>(KEYS.RECURRING_TEMPLATES, []);

export const saveSettings = (data: AppSettings) => saveData(KEYS.SETTINGS, data);
export const loadSettings = async (): Promise<AppSettings> => {
  const loaded = await loadCriticalData<Partial<AppSettings> & { expenseCutoffDate?: string }>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  const mergedSettings = { ...DEFAULT_SETTINGS, ...loaded };
  if (loaded.expenseCutoffDate && mergedSettings.expenseCutoffDay == null) {
    mergedSettings.expenseCutoffDay = new Date(loaded.expenseCutoffDate).getDate();
  }
  return mergedSettings;
};

export const saveDebtPlans = (data: SavedDebtPlan[]) => saveData(KEYS.DEBT_PLANS, data);
export const loadDebtPlans = () => loadData<SavedDebtPlan[]>(KEYS.DEBT_PLANS, []);

export const saveReportLayout = (data: ReportLayoutItem[]) => saveDataQuietly(KEYS.REPORT_LAYOUT, data);
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
  /** Android folder (Storage Access Framework URI) that also receives each backup, so it survives uninstalling. */
  folderUri: string | null;
}

export const DEFAULT_AUTO_BACKUP_STATE: AutoBackupState = {
  enabled: false,
  intervalDays: DEFAULT_AUTO_BACKUP_INTERVAL_DAYS,
  lastSuccessAt: null,
  lastError: null,
  folderUri: null,
};

export const loadAutoBackupState = async (): Promise<AutoBackupState> => ({
  enabled: await loadData<boolean>(KEYS.AUTO_BACKUP_ENABLED, DEFAULT_AUTO_BACKUP_STATE.enabled),
  intervalDays: await loadData<number>(KEYS.AUTO_BACKUP_INTERVAL_DAYS, DEFAULT_AUTO_BACKUP_STATE.intervalDays),
  lastSuccessAt: await loadData<string | null>(KEYS.AUTO_BACKUP_LAST_SUCCESS_AT, null),
  lastError: await loadData<string | null>(KEYS.AUTO_BACKUP_LAST_ERROR, null),
  folderUri: await loadData<string | null>(KEYS.AUTO_BACKUP_FOLDER_URI, null),
});

export const saveAutoBackupEnabled = (v: boolean) => saveDataQuietly(KEYS.AUTO_BACKUP_ENABLED, v);
export const saveAutoBackupIntervalDays = (v: number) => saveDataQuietly(KEYS.AUTO_BACKUP_INTERVAL_DAYS, v);
export const saveAutoBackupLastSuccessAt = (v: string | null) => saveDataQuietly(KEYS.AUTO_BACKUP_LAST_SUCCESS_AT, v);
export const saveAutoBackupLastError = (v: string | null) => saveDataQuietly(KEYS.AUTO_BACKUP_LAST_ERROR, v);
export const saveAutoBackupFolderUri = (v: string | null) => saveDataQuietly(KEYS.AUTO_BACKUP_FOLDER_URI, v);

// The language preference has its own key (not in AppSettings) so it is never
// part of a backup and a restore cannot overwrite it.
export const saveLanguagePreference = (v: LanguagePreference) => saveDataQuietly(KEYS.LANGUAGE, v);
export const loadLanguagePreference = async (): Promise<LanguagePreference> => {
  const stored = await loadData<unknown>(KEYS.LANGUAGE, DEFAULT_LANGUAGE_PREFERENCE);
  return isLanguagePreference(stored) ? stored : DEFAULT_LANGUAGE_PREFERENCE;
};

const CURRENCIES: Currency[] = ['CRC', 'USD', 'EUR'];

const loadCurrency = async (key: string): Promise<Currency | null> => {
  const stored = await loadData<unknown>(key, null);
  return CURRENCIES.includes(stored as Currency) ? (stored as Currency) : null;
};

// The currencies the home total and Reports are shown in are UI preferences
// with their own keys (not in AppSettings), so they are not part of a backup.
// null means "use the default currency".
export const saveMainDisplayCurrency = (v: Currency) => saveData(KEYS.MAIN_DISPLAY_CURRENCY, v);
export const loadMainDisplayCurrency = () => loadCurrency(KEYS.MAIN_DISPLAY_CURRENCY);

export const saveReportsDisplayCurrency = (v: Currency) => saveData(KEYS.REPORTS_DISPLAY_CURRENCY, v);
export const loadReportsDisplayCurrency = () => loadCurrency(KEYS.REPORTS_DISPLAY_CURRENCY);
