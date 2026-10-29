import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Envelope, Transaction, PaymentMethod, TransactionCategory, AppSettings, RecurringTransactionTemplate } from '../../types';
import { isCurrencyCode } from '../../domain/shared/currencies';
import { THEMES } from '../../theme/colors';
import { DEFAULT_SETTINGS } from '../storage/storage';
import { translateActive } from '../../i18n';

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
  /**
   * Optional for the same reason: backups from before templates were exported
   * omit it, and the importer then keeps only the device's templates whose
   * envelope exists in the backup.
   */
  recurringTemplates?: RecurringTransactionTemplate[];
  settings: AppSettings;
  exportedAt: string;
  version: string;
}

export interface ImportResult {
  backup: FullBackup;
  errors: string[];
}

/**
 * Lets the user pick a backup file and parses it. Resolves null only when the
 * user cancels the picker; failing to open or read the file rejects, so the
 * caller reports an error instead of "cancelled".
 */
export const pickAndImportBackup = async (): Promise<ImportResult | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
  });

  if (result.canceled) return null;

  const uri = result.assets[0].uri;
  const content = await readAsStringAsync(uri);

  return parseBackup(content);
};

const ENVELOPE_TYPES = ['gasto', 'ahorro', 'deuda'];
const TRANSACTION_TYPES = ['expense', 'income', 'transfer'];
const FREQUENCIES = ['monthly', 'weekly', 'biweekly', 'annual'];

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isValidDate = (v: unknown) => typeof v === 'string' && !Number.isNaN(new Date(v).getTime());

const isValidEnvelope = (e: any) =>
  isNonEmptyString(e?.id) && typeof e.name === 'string' &&
  ENVELOPE_TYPES.includes(e.type) && isCurrencyCode(e.currency) && isFiniteNumber(e.limit);

const isValidTransaction = (t: any) =>
  isNonEmptyString(t?.id) && isNonEmptyString(t.envelopeId) &&
  TRANSACTION_TYPES.includes(t.type) && isValidDate(t.date);

const isValidCatalogItem = (c: any) => isNonEmptyString(c?.id) && typeof c.name === 'string';

const isValidTemplate = (t: any) =>
  isNonEmptyString(t?.id) && isNonEmptyString(t.envelopeId) &&
  (t.type === 'expense' || t.type === 'income') && isFiniteNumber(t.amount) &&
  FREQUENCIES.includes(t.frequency) && isFiniteNumber(t.dayOfMonth);

/**
 * Settings from the file, keeping each known field only when it has the right
 * type; anything missing or malformed falls back to the default. Fields this
 * version doesn't check are carried through as they are.
 */
const sanitizeSettings = (raw: any): AppSettings => {
  const s = raw && typeof raw === 'object' ? raw : {};
  const dayOrNull = (v: unknown) => (isFiniteNumber(v) && v >= 1 && v <= 31 ? Math.round(v) : null);
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

  let expenseCutoffDay = dayOrNull(s.expenseCutoffDay);
  if (s.expenseCutoffDate && expenseCutoffDay == null && isValidDate(s.expenseCutoffDate)) {
    expenseCutoffDay = new Date(s.expenseCutoffDate).getDate();
  }

  // Rates from older backups (conversion was removed) are dropped.
  const { expenseCutoffDate: _legacyCutoffDate, expenseCutoffEnabled: _legacyCutoffEnabled, exchangeRates: _legacyRates, autoExchangeRates: _legacyAuto, exchangeRatesUpdatedAt: _legacyRatesAt, ...rest } = s;
  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    defaultCurrency: isCurrencyCode(s.defaultCurrency) ? s.defaultCurrency : DEFAULT_SETTINGS.defaultCurrency,
    expenseCutoffDay: expenseCutoffDay ?? DEFAULT_SETTINGS.expenseCutoffDay,
    budgetAlertsEnabled: bool(s.budgetAlertsEnabled, DEFAULT_SETTINGS.budgetAlertsEnabled),
    billRemindersEnabled: bool(s.billRemindersEnabled, DEFAULT_SETTINGS.billRemindersEnabled),
    billReminderLeadDays: isFiniteNumber(s.billReminderLeadDays) && s.billReminderLeadDays >= 0
      ? Math.round(s.billReminderLeadDays)
      : DEFAULT_SETTINGS.billReminderLeadDays,
    themeId: typeof s.themeId === 'string' && s.themeId in THEMES ? s.themeId : DEFAULT_SETTINGS.themeId,
  };
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

    if (parsed.recurringTemplates !== undefined && !Array.isArray(parsed.recurringTemplates)) {
      result.errors.push(translateActive('import.error.templatesNotArray'));
      return result;
    }

    if (!parsed.envelopes.every(isValidEnvelope)) {
      result.errors.push(translateActive('import.error.badEnvelope'));
      return result;
    }

    if (!parsed.transactions.every(isValidTransaction)) {
      result.errors.push(translateActive('import.error.badTransaction'));
      return result;
    }

    if (
      !parsed.paymentMethods.every(isValidCatalogItem) ||
      !parsed.categories.every(isValidCatalogItem) ||
      (parsed.incomeCategories && !parsed.incomeCategories.every(isValidCatalogItem))
    ) {
      result.errors.push(translateActive('import.error.badCatalog'));
      return result;
    }

    if (parsed.recurringTemplates && !parsed.recurringTemplates.every(isValidTemplate)) {
      result.errors.push(translateActive('import.error.badTemplate'));
      return result;
    }

    result.backup = {
      envelopes: parsed.envelopes,
      transactions: parsed.transactions,
      paymentMethods: parsed.paymentMethods,
      categories: parsed.categories,
      settings: sanitizeSettings(parsed.settings),
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      version: parsed.version || '1.0',
    };

    // Only carry the field through when the backup actually had it; leaving it
    // undefined tells the importer to keep the device's current income catalog.
    if (Array.isArray(parsed.incomeCategories)) {
      result.backup.incomeCategories = parsed.incomeCategories;
    }
    if (Array.isArray(parsed.recurringTemplates)) {
      // Templates of envelopes that aren't in the file would generate orphan transactions.
      const envelopeIds = new Set(parsed.envelopes.map((e: Envelope) => e.id));
      result.backup.recurringTemplates = (parsed.recurringTemplates as RecurringTransactionTemplate[])
        .filter(t => envelopeIds.has(t.envelopeId));
    }

  } catch {
    result.errors.push(translateActive('import.error.corrupt'));
  }

  return result;
};
