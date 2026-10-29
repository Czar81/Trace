import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, AppState } from 'react-native';
import { Envelope, Transaction, EnvelopeType, PaymentMethod, TransactionCategory, AppSettings, Currency, RecurringTransactionTemplate } from '../types';
import { CURRENCY_CODES } from '../domain/shared/currencies';
import { AutoBackupState, DEFAULT_AUTO_BACKUP_STATE, saveAutoBackupEnabled, saveAutoBackupIntervalDays, saveAutoBackupFolderUri } from '../services/storage/storage';
import { AppData, loadAppData } from '../services/storage/appData';
import { pickAndImportBackup } from '../services/backup/importData';
import { runAutoBackup as performAutoBackup } from '../services/backup/autoBackupRunner';
import { computeScheduledWork } from '../services/scheduling/scheduledWork';
import { cancelDebtReminder, cancelTemplateReminder } from '../services/notifications/notifications';
import { requestPermissionsIfEnabled, syncReminderSettings } from '../services/notifications/reminders';
import { translateActive } from '../i18n';
import { formatCurrency } from '../domain/shared/formatCurrency';
import { dayKey } from '../domain/shared/helpers';
import { clampDayOfMonth } from '../domain/recurring/recurrence';
import { buildRestoredData } from '../domain/backup/restoreBackup';
import { calculateEnvelopeBalance, computeEnvelopeBalances, getCutoffPeriodStart, roundMoney } from '../domain/budget/balance';
import { accrueDebtInterest } from '../domain/recurring/recurringGeneration';
import { useDataStore } from './useDataStore';
import { useEnvelopeActions } from './actions/useEnvelopeActions';
import { useTransactionActions } from './actions/useTransactionActions';
import { useTemplateActions } from './actions/useTemplateActions';
import { useCatalogActions } from './actions/useCatalogActions';

// Re-exported for backward compatibility — other modules and tests import these from here.
export { clampDayOfMonth, calculateEnvelopeBalance, getCutoffPeriodStart, accrueDebtInterest };

export interface CurrencyTotal {
  currency: Currency;
  total: number;
}


interface AppContextType {
  envelopes: Envelope[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  categories: TransactionCategory[];
  incomeCategories: TransactionCategory[];
  settings: AppSettings;
  /** False until persisted settings have been read from storage. */
  settingsLoaded: boolean;
  recurringTemplates: RecurringTransactionTemplate[];
  /** False until stored data has been read; changes made before then wait for it. */
  isLoaded: boolean;
  autoBackup: AutoBackupState;
  updateAutoBackup: (updates: Partial<Pick<AutoBackupState, 'enabled' | 'intervalDays' | 'folderUri'>>) => Promise<void>;

  // Envelope CRUD
  addEnvelope: (envelope: Omit<Envelope, 'id'>) => Promise<void>;
  updateEnvelope: (id: string, updates: Partial<Omit<Envelope, 'id'>>) => Promise<void>;
  deleteEnvelope: (id: string) => Promise<void>;
  resetEnvelope: (envelopeId: string) => Promise<void>;
  resetAllEnvelopes: () => Promise<void>;

  // Transaction CRUD
  addTransaction: (transaction: Omit<Transaction, 'id' | 'isArchived'>) => Promise<void>;
  /** Adds several transactions with a single save (avoids stale-state clobbering from looping addTransaction). */
  addTransactions: (transactions: Omit<Transaction, 'id' | 'isArchived'>[]) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addTransfer: (transfer: {
    envelopeId: string;
    toEnvelopeId: string;
    amount: number;
    description: string;
    notes?: string;
    date?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateTransfer: (id: string, updates: {
    envelopeId?: string;
    toEnvelopeId?: string;
    amount?: number;
    description?: string;
    notes?: string;
    date?: string;
  }) => Promise<{ success: boolean; error?: string }>;

  // Recurring Transaction Template CRUD
  addRecurringTemplate: (template: Omit<RecurringTransactionTemplate, 'id' | 'lastGeneratedPeriod' | 'reminderNotificationId' | 'lastReminderScheduledPeriod'>) => Promise<void>;
  updateRecurringTemplate: (id: string, updates: Partial<Omit<RecurringTransactionTemplate, 'id'>>) => Promise<void>;
  deleteRecurringTemplate: (id: string) => Promise<void>;

  // Payment Methods & Categories CRUD
  addPaymentMethod: (name: string) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addIncomeCategory: (name: string) => Promise<void>;
  deleteIncomeCategory: (id: string) => Promise<void>;

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;

  // Import/Export
  importFromBackup: () => Promise<{ success: boolean; message: string; errors?: string[] }>;

  // Computed helpers
  getEnvelopeBalance: (envelopeId: string) => number;
  /** Totals per currency (never converted); only currencies that have envelopes of this type. */
  getTotalsByType: (type: EnvelopeType) => CurrencyTotal[];
  formatAmount: (amount: number, currency: Currency) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useDataStore();
  const { state, data, writesBlocked, runExclusive, commit, releaseInit } = store;
  const { envelopes, transactions, paymentMethods, categories, incomeCategories, recurringTemplates, settings } = state;
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [autoBackup, setAutoBackup] = useState<AutoBackupState>(DEFAULT_AUTO_BACKUP_STATE);
  const [today, setToday] = useState(() => dayKey(new Date()));

  // Generates due recurring transactions, accrues debt interest and schedules
  // reminders. Runs on launch, when the app returns to the foreground and after an import.
  const processScheduledWork = useCallback(async (now: Date) => {
    const changes = await computeScheduledWork(data.current, now);
    if (Object.keys(changes).length > 0) await commit(changes);
  }, [data, commit]);

  // Automatic backup (never blocks or rejects the caller).
  const runAutoBackup = useCallback(async (now: Date) => {
    if (writesBlocked.current) return;
    const result = await performAutoBackup(data.current, now);
    if (result) setAutoBackup(result);
  }, [data, writesBlocked]);

  useEffect(() => {
    const initData = async () => {
      const now = new Date();
      try {
        let loaded: AppData;
        try {
          loaded = await loadAppData();
        } catch {
          // A failed read is often transient right after launch; try once more.
          await new Promise(r => setTimeout(r, 300));
          loaded = await loadAppData();
        }
        await commit(loaded);
        setSettingsLoaded(true);
        await processScheduledWork(now);
      } catch (e) {
        console.error('Could not load stored data', e);
        writesBlocked.current = true;
        Alert.alert(translateActive('storage.loadFailedTitle'), translateActive('storage.loadFailedBody'));
      } finally {
        setIsLoaded(true);
        releaseInit();
      }
      await runExclusive(() => runAutoBackup(now));
    };
    initData();
  }, [commit, processScheduledWork, runAutoBackup, runExclusive, releaseInit, writesBlocked]);

  // Returning to the app on a later day (or after a while) generates what
  // came due meanwhile and refreshes date-based balances such as the cutoff.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', appState => {
      if (appState !== 'active') return;
      const now = new Date();
      setToday(dayKey(now));
      if (writesBlocked.current) return;
      runExclusive(async () => {
        await processScheduledWork(now);
        await runAutoBackup(now);
      }).catch(e => console.error('Error processing scheduled work', e));
    });
    return () => subscription.remove();
  }, [processScheduledWork, runAutoBackup, runExclusive, writesBlocked]);

  const updateAutoBackup = useCallback(async (updates: Partial<Pick<AutoBackupState, 'enabled' | 'intervalDays' | 'folderUri'>>) => {
    setAutoBackup(prev => ({ ...prev, ...updates }));
    if (updates.enabled !== undefined) await saveAutoBackupEnabled(updates.enabled);
    if (updates.intervalDays !== undefined) await saveAutoBackupIntervalDays(updates.intervalDays);
    if (updates.folderUri !== undefined) await saveAutoBackupFolderUri(updates.folderUri);
  }, []);

  // ─── Currency helpers ──────────────────────────────────────────────────────
  const formatAmount = useCallback((amount: number, currency: Currency): string => {
    return formatCurrency(amount, currency);
  }, []);

  // ─── Balance computation ───────────────────────────────────────────────────
  /** Envelope id -> balance, computed once per change (and per day) so lookups are O(1). */
  const envelopeBalanceMap = useMemo(
    () => computeEnvelopeBalances(transactions, envelopes),
    // `today` recomputes the cutoff window when the date changes while the app is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, envelopes, today]
  );

  const getEnvelopeBalance = useCallback((envelopeId: string): number => {
    // Envelopes with no transactions are absent from the map.
    return envelopeBalanceMap.get(envelopeId) ?? 0;
  }, [envelopeBalanceMap]);

  /**
   * getTotalsByType sums the envelope *available balances* of a type, one total
   * per currency (currencies are never mixed).
   * For 'gasto': sum of (limit + balance) per envelope — total disponible.
   * For 'ahorro': sum of balances — total ahorrado.
   * For 'deuda': sum of (limit - balance) per non-unlimited envelope — total por pagar.
   */
  const getTotalsByType = useCallback((type: EnvelopeType): CurrencyTotal[] => {
    const totals = new Map<Currency, number>();
    for (const env of envelopes) {
      if (env.type !== type) continue;
      // Exclude unlimited envelopes from the 'Total Disponible' / 'Total por pagar' totals
      if ((type === 'gasto' || type === 'deuda') && env.isUnlimited) continue;

      const balance = getEnvelopeBalance(env.id);
      const displayValue = type === 'gasto'
        ? env.limit + balance
        : type === 'deuda'
        ? env.limit - balance
        : balance;
      totals.set(env.currency, (totals.get(env.currency) ?? 0) + displayValue);
    }
    return Array.from(totals, ([currency, total]) => ({ currency, total: roundMoney(total) }))
      .sort((a, b) => CURRENCY_CODES.indexOf(a.currency) - CURRENCY_CODES.indexOf(b.currency));
  }, [envelopes, getEnvelopeBalance]);

  // ─── Data actions (each hook owns one slice) ──────────────────────────────
  const envelopeActions = useEnvelopeActions(store);
  const transactionActions = useTransactionActions(store);
  const templateActions = useTemplateActions(store);
  const catalogActions = useCatalogActions(store);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => runExclusive(async () => {
    const d = data.current;
    const previous = d.settings;
    const updated = { ...previous, ...updates };

    await requestPermissionsIfEnabled(previous, updated);
    await commit({ settings: updated });
    const reminderChanges = await syncReminderSettings(previous, updated, d);
    if (reminderChanges) await commit(reminderChanges);
  }), [data, runExclusive, commit]);

  const importFromBackup = useCallback(async () => {
    let importResult;
    try {
      importResult = await pickAndImportBackup();
    } catch (e) {
      console.error('Error reading backup file', e);
      return { success: false, message: translateActive('import.failed') };
    }
    if (!importResult) {
      return { success: false, message: translateActive('import.cancelled') };
    }
    if (importResult.errors.length > 0) {
      return { success: false, message: translateActive('import.fileErrors'), errors: importResult.errors };
    }

    const backup = importResult.backup;
    try {
      return await runExclusive(async () => {
        const d = data.current;
        // Reminders scheduled for the data being replaced would otherwise keep firing.
        await Promise.all(d.recurringTemplates.map(cancelTemplateReminder));
        await Promise.all(d.envelopes.map(cancelDebtReminder));

        const restored = buildRestoredData(backup, d);
        // A successful restore replaces whatever couldn't be read, so saving is safe again.
        writesBlocked.current = false;
        await commit(restored);
        await processScheduledWork(new Date());

        const message = translateActive('import.restored', {
          envelopes: backup.envelopes.length,
          transactions: backup.transactions.length,
          categories: backup.categories.length,
          incomeCategories: restored.incomeCategories.length,
          paymentMethods: backup.paymentMethods.length,
        });
        return { success: true, message };
      });
    } catch (e) {
      console.error('Error restoring backup', e);
      return { success: false, message: translateActive('import.failed') };
    }
  }, [data, writesBlocked, runExclusive, commit, processScheduledWork]);

  const value = useMemo(() => ({
    envelopes, transactions, paymentMethods, categories, incomeCategories, settings, settingsLoaded, recurringTemplates, isLoaded, autoBackup, updateAutoBackup,
    ...envelopeActions, ...transactionActions, ...templateActions, ...catalogActions,
    updateSettings,
    importFromBackup,
    getEnvelopeBalance, getTotalsByType, formatAmount,
  }), [
    envelopes, transactions, paymentMethods, categories, incomeCategories, settings, settingsLoaded, recurringTemplates, isLoaded, autoBackup, updateAutoBackup,
    envelopeActions, transactionActions, templateActions, catalogActions,
    updateSettings,
    importFromBackup,
    getEnvelopeBalance, getTotalsByType, formatAmount,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppData must be used within an AppProvider');
  return context;
};
