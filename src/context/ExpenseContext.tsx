import { areRatesStale, fetchExchangeRates } from '../services/exchangeRates';
import { deleteUnreferencedReceipts } from '../services/receipts';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { Envelope, Transaction, EnvelopeType, PaymentMethod, TransactionCategory, AppSettings, Currency, RecurringTransactionTemplate } from '../types';
import {
  loadEnvelopes, saveEnvelopes,
  loadTransactions, saveTransactions,
  loadPaymentMethods, savePaymentMethods,
  loadCategories, saveCategories,
  loadIncomeCategories, saveIncomeCategories,
  loadSettings, saveSettings, DEFAULT_SETTINGS,
  AutoBackupState, DEFAULT_AUTO_BACKUP_STATE, loadAutoBackupState,
  saveAutoBackupEnabled, saveAutoBackupIntervalDays, saveAutoBackupLastSuccessAt, saveAutoBackupLastError, saveAutoBackupFolderUri,
  loadRecurringTemplates, saveRecurringTemplates
} from '../services/storage';
import { pickAndImportBackup } from '../services/importData';
import { createAutomaticBackup, isBackupDue } from '../services/autoBackup';
import { translateActive } from '../i18n';
import { formatCurrency } from '../domain/formatCurrency';
import { clampDayOfMonth } from '../domain/recurrence';
import { calculateEnvelopeBalance, computeEnvelopeBalances, getCutoffPeriodStart, roundMoney } from '../domain/balance';
import { accrueDebtInterest, generateRecurringTransactions } from '../domain/recurringGeneration';
import { removeEnvelopeReferences } from '../domain/envelopeRemoval';
import {
  isExpoGo, requestNotificationPermissions, notifyBudgetThreshold,
  cancelTemplateReminder, scheduleBillReminders, checkMinimumPayments, cancelDebtReminder, scheduleDebtReminders,
} from '../services/notifications';

// Re-exported for backward compatibility — other modules and tests import these from here.
export { clampDayOfMonth, calculateEnvelopeBalance, getCutoffPeriodStart, accrueDebtInterest };

/** Local calendar day, used to notice the date changing while the app stays open. */
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

// Ids are creation timestamps; bumping past the last one keeps two records
// created in the same millisecond from sharing an id.
let lastIdTime = 0;
const newId = (): string => {
  lastIdTime = Math.max(Date.now(), lastIdTime + 1);
  return String(lastIdTime);
};

/** True when two lists hold different items (by reference) or a different count. */
const listChanged = <T,>(a: T[], b: T[]) => a.length !== b.length || a.some((item, i) => item !== b[i]);

/** Translated error for an invalid transfer, or null when it's valid. */
function validateTransfer(envelopes: Envelope[], envelopeId: string, toEnvelopeId: string | undefined): string | null {
  if (envelopeId === toEnvelopeId) return translateActive('transfer.error.sameEnvelope');
  const source = envelopes.find(e => e.id === envelopeId);
  const destination = envelopes.find(e => e.id === toEnvelopeId);
  if (!source || !destination) return translateActive('transfer.error.envelopeNotFound');
  if (source.currency !== destination.currency) return translateActive('transfer.error.currencyMismatch');
  return null;
}

interface AppData {
  envelopes: Envelope[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  categories: TransactionCategory[];
  incomeCategories: TransactionCategory[];
  recurringTemplates: RecurringTransactionTemplate[];
  settings: AppSettings;
}

const EMPTY_DATA: AppData = {
  envelopes: [], transactions: [], paymentMethods: [], categories: [], incomeCategories: [], recurringTemplates: [],
  settings: DEFAULT_SETTINGS,
};

const loadAppData = async (): Promise<AppData> => ({
  envelopes: await loadEnvelopes(),
  transactions: await loadTransactions(),
  paymentMethods: await loadPaymentMethods(),
  categories: await loadCategories(),
  incomeCategories: await loadIncomeCategories(),
  recurringTemplates: await loadRecurringTemplates(),
  settings: await loadSettings(),
});

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
  /** Returns total in settings.defaultCurrency */
  getTotalByType: (type: EnvelopeType) => number;
  convertToCRC: (amount: number, from: Currency) => number;
  formatAmount: (amount: number, currency: Currency) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<TransactionCategory[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTransactionTemplate[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [autoBackup, setAutoBackup] = useState<AutoBackupState>(DEFAULT_AUTO_BACKUP_STATE);
  const [today, setToday] = useState(() => dayKey(new Date()));

  // ─── Serialized access to the data ────────────────────────────────────────
  // `data` always holds the latest committed values. Every change reads from it
  // (never from a render's closure) and runs through `runExclusive`, one at a
  // time, starting only after the initial load — so a change made before the
  // load finishes, or two quick changes in a row, never overwrite each other.
  const data = useRef<AppData>(EMPTY_DATA);
  // Set when stored data couldn't be read: saving then would replace the
  // user's real data with whatever is in memory.
  const writesBlocked = useRef(false);
  const initGate = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  if (!initGate.current) {
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>(r => { resolve = r; });
    initGate.current = { promise, resolve };
  }
  const queue = useRef<Promise<unknown>>(initGate.current.promise);
  const lastSaveErrorAt = useRef(0);

  const runExclusive = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(task);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  /** Applies changes to memory and state, then persists them (unless writes are blocked). */
  const commit = useCallback(async (changes: Partial<AppData>) => {
    data.current = { ...data.current, ...changes };
    const saves: Promise<unknown>[] = [];
    const persist = !writesBlocked.current;
    if (changes.envelopes) { setEnvelopes(changes.envelopes); if (persist) saves.push(saveEnvelopes(changes.envelopes)); }
    if (changes.transactions) { setTransactions(changes.transactions); if (persist) saves.push(saveTransactions(changes.transactions)); }
    if (changes.paymentMethods) { setPaymentMethods(changes.paymentMethods); if (persist) saves.push(savePaymentMethods(changes.paymentMethods)); }
    if (changes.categories) { setCategories(changes.categories); if (persist) saves.push(saveCategories(changes.categories)); }
    if (changes.incomeCategories) { setIncomeCategories(changes.incomeCategories); if (persist) saves.push(saveIncomeCategories(changes.incomeCategories)); }
    if (changes.recurringTemplates) { setRecurringTemplates(changes.recurringTemplates); if (persist) saves.push(saveRecurringTemplates(changes.recurringTemplates)); }
    if (changes.settings) { setSettings(changes.settings); if (persist) saves.push(saveSettings(changes.settings)); }

    const results = await Promise.allSettled(saves);
    // One alert per burst of failures, not one per collection.
    if (results.some(r => r.status === 'rejected') && Date.now() - lastSaveErrorAt.current > 10_000) {
      lastSaveErrorAt.current = Date.now();
      Alert.alert(translateActive('storage.saveFailedTitle'), translateActive('storage.saveFailedBody'));
    }
  }, []);

  // ─── Recurring generation, debt interest and reminders ────────────────────
  /**
   * Generates due recurring transactions (catching up missed periods), accrues
   * debt interest, checks minimum payments and schedules upcoming reminders.
   * Runs on launch, when the app returns to the foreground and after an import.
   */
  const processScheduledWork = useCallback(async (now: Date) => {
    const d = data.current;
    const { updatedTemplates, newTransactions } = generateRecurringTransactions(d.recurringTemplates, now);
    const transactionsBeforeDebt = newTransactions.length > 0 ? [...newTransactions, ...d.transactions] : d.transactions;
    const { updatedEnvelopes, newTransactions: interestTransactions } =
      accrueDebtInterest(d.envelopes, transactionsBeforeDebt, now);
    const allTransactions = interestTransactions.length > 0
      ? [...interestTransactions, ...transactionsBeforeDebt]
      : transactionsBeforeDebt;

    const { billRemindersEnabled, billReminderLeadDays } = d.settings;
    const envelopesAfterMinCheck = await checkMinimumPayments(updatedEnvelopes, allTransactions, billRemindersEnabled, now);
    const envelopesWithReminders = await scheduleDebtReminders(envelopesAfterMinCheck, allTransactions, billRemindersEnabled, billReminderLeadDays);
    const templatesWithReminders = await scheduleBillReminders(updatedTemplates, envelopesWithReminders, billRemindersEnabled, billReminderLeadDays);

    const changes: Partial<AppData> = {};
    if (allTransactions !== d.transactions) changes.transactions = allTransactions;
    if (listChanged(envelopesWithReminders, d.envelopes)) changes.envelopes = envelopesWithReminders;
    if (listChanged(templatesWithReminders, d.recurringTemplates)) changes.recurringTemplates = templatesWithReminders;
    if (Object.keys(changes).length > 0) await commit(changes);
  }, [commit]);

  // ─── Automatic backup (never blocks or rejects the caller) ────────────────
  const runAutoBackup = useCallback(async (now: Date) => {
    if (writesBlocked.current) return;
    try {
      const backupState = await loadAutoBackupState();
      setAutoBackup(backupState);
      if (!backupState.enabled || !isBackupDue(backupState.lastSuccessAt, backupState.intervalDays, now)) return;
      try {
        await createAutomaticBackup(data.current, now, backupState.folderUri);
        const lastSuccessAt = now.toISOString();
        await saveAutoBackupLastSuccessAt(lastSuccessAt);
        await saveAutoBackupLastError(null);
        setAutoBackup(prev => ({ ...prev, lastSuccessAt, lastError: null }));
      } catch (e) {
        const lastError = e instanceof Error ? e.message : String(e);
        console.error('Automatic backup failed', e);
        await saveAutoBackupLastError(lastError);
        setAutoBackup(prev => ({ ...prev, lastError }));
      }
    } catch (e) {
      console.error('Automatic backup check failed', e);
    }
  }, []);

  // Refreshes exchange rates in the background; offline or API errors keep the saved rates.
  const refreshExchangeRates = useCallback((current: AppSettings) => {
    if (!current.autoExchangeRates || !areRatesStale(current.exchangeRatesUpdatedAt)) return;
    void fetchExchangeRates().then(rates => {
      if (!rates) return;
      return runExclusive(() => commit({
        settings: { ...data.current.settings, exchangeRates: rates, exchangeRatesUpdatedAt: new Date().toISOString() },
      }));
    }).catch(() => undefined);
  }, [runExclusive, commit]);

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
        refreshExchangeRates(loaded.settings);
        await processScheduledWork(now);
      } catch (e) {
        console.error('Could not load stored data', e);
        writesBlocked.current = true;
        Alert.alert(translateActive('storage.loadFailedTitle'), translateActive('storage.loadFailedBody'));
      } finally {
        setIsLoaded(true);
        initGate.current?.resolve();
      }
      await runExclusive(() => runAutoBackup(now));
    };
    initData();
  }, [commit, processScheduledWork, runAutoBackup, runExclusive, refreshExchangeRates]);

  // Returning to the app on a later day (or after a while) generates what
  // came due meanwhile and refreshes date-based balances such as the cutoff.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      const now = new Date();
      setToday(dayKey(now));
      if (writesBlocked.current) return;
      runExclusive(async () => {
        await processScheduledWork(now);
        await runAutoBackup(now);
      }).catch(e => console.error('Error processing scheduled work', e));
    });
    return () => subscription.remove();
  }, [processScheduledWork, runAutoBackup, runExclusive]);

  const updateAutoBackup = useCallback(async (updates: Partial<Pick<AutoBackupState, 'enabled' | 'intervalDays' | 'folderUri'>>) => {
    setAutoBackup(prev => ({ ...prev, ...updates }));
    if (updates.enabled !== undefined) await saveAutoBackupEnabled(updates.enabled);
    if (updates.intervalDays !== undefined) await saveAutoBackupIntervalDays(updates.intervalDays);
    if (updates.folderUri !== undefined) await saveAutoBackupFolderUri(updates.folderUri);
  }, []);

  // ─── Currency helpers ──────────────────────────────────────────────────────
  const convertToCRC = useCallback((amount: number, from: Currency): number => {
    if (from === 'CRC') return amount;
    if (from === 'USD') return amount * settings.exchangeRates.USD_TO_CRC;
    if (from === 'EUR') return amount * settings.exchangeRates.EUR_TO_CRC;
    return amount;
  }, [settings.exchangeRates]);

  const formatAmount = useCallback((amount: number, currency: Currency): string => {
    return formatCurrency(amount, currency);
  }, []);

  // ─── Balance computation ───────────────────────────────────────────────────
  /** Envelope id -> balance, computed once per change (and per day) so lookups are O(1). */
  const envelopeBalanceMap = useMemo(
    () => computeEnvelopeBalances(transactions, envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay),
    // `today` recomputes the cutoff window when the date changes while the app is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay, today]
  );

  const getEnvelopeBalance = useCallback((envelopeId: string): number => {
    // Envelopes with no transactions are absent from the map.
    return envelopeBalanceMap.get(envelopeId) ?? 0;
  }, [envelopeBalanceMap]);

  /**
   * getTotalByType computes the sum of all envelope *available balances*
   * converted to CRC for display in the summary card.
   * For 'gasto': sum of (limit + balance) per envelope — total disponible.
   * For 'ahorro': sum of balances — total ahorrado.
   * For 'deuda': sum of (limit - balance) per non-unlimited envelope — total por pagar.
   */
  const getTotalByType = useCallback((type: EnvelopeType): number => {
    return roundMoney(envelopes
      .filter(e => e.type === type)
      .reduce((total, env) => {
        // Exclude unlimited envelopes from the 'Total Disponible' / 'Total por pagar' totals
        if ((type === 'gasto' || type === 'deuda') && env.isUnlimited) return total;

        const balance = getEnvelopeBalance(env.id);
        const displayValue = type === 'gasto'
          ? env.limit + balance
          : type === 'deuda'
          ? env.limit - balance
          : balance;
        return total + convertToCRC(displayValue, env.currency);
      }, 0));
  }, [envelopes, getEnvelopeBalance, convertToCRC]);

  // ─── Budget alerts (spent-percentage transition detection) ─────────────────
  /**
   * Compares an envelope's spent fraction before/after a transaction mutation
   * and notifies on the transition into the 80% or 100% band, per budget-alerts
   * spec. No-op for non-'gasto' envelopes (a growing debt balance is not
   * "overspending"), unlimited ones, or when the setting is off.
   */
  const checkBudgetAlerts = useCallback(async (envelopeId: string, beforeTxns: Transaction[], afterTxns: Transaction[]) => {
    const { envelopes: envs, settings: s } = data.current;
    if (!s.budgetAlertsEnabled || isExpoGo) return;

    const envelope = envs.find(e => e.id === envelopeId);
    if (!envelope || envelope.type !== 'gasto' || envelope.isUnlimited || !envelope.limit) return;

    const spent = (txns: Transaction[]) =>
      -calculateEnvelopeBalance(envelopeId, txns, envs, s.expenseCutoffEnabled, s.expenseCutoffDay) / envelope.limit;
    await notifyBudgetThreshold(envelope, spent(beforeTxns), spent(afterTxns));
  }, []);

  // ─── Envelope CRUD ─────────────────────────────────────────────────────────
  const addEnvelope = useCallback((envelopeData: Omit<Envelope, 'id'>) => runExclusive(async () => {
    const d = data.current;
    const newEnvelope: Envelope = { ...envelopeData, id: newId() };
    const updated = [newEnvelope, ...d.envelopes];
    await commit({ envelopes: updated });
    const withReminders = await scheduleDebtReminders(updated, d.transactions, d.settings.billRemindersEnabled, d.settings.billReminderLeadDays);
    if (listChanged(withReminders, updated)) await commit({ envelopes: withReminders });
  }), [runExclusive, commit]);

  const updateEnvelope = useCallback((id: string, updates: Partial<Omit<Envelope, 'id'>>) => runExclusive(async () => {
    const d = data.current;
    const target = d.envelopes.find(e => e.id === id);
    if (!target) return;

    // Fields that move a pending debt reminder's date or change what it says.
    const reminderFields: (keyof Envelope)[] = [
      'dueDay', 'interestFrequency', 'dueAnchorMonth', 'isUnlimited', 'type', 'minimumPayment', 'limit', 'name', 'currency',
    ];
    const merged = { ...target, ...updates };
    const base = reminderFields.some(k => merged[k] !== target[k]) ? await cancelDebtReminder(target) : target;

    const updated = d.envelopes.map(e => (e.id === id ? { ...base, ...updates } : e));
    const withReminders = await scheduleDebtReminders(updated, d.transactions, d.settings.billRemindersEnabled, d.settings.billReminderLeadDays);
    await commit({ envelopes: withReminders });
  }), [runExclusive, commit]);

  const deleteEnvelope = useCallback((id: string) => runExclusive(async () => {
    const d = data.current;
    const target = d.envelopes.find(e => e.id === id);
    if (target) await cancelDebtReminder(target);

    const { transactions: keptTransactions, templates, removedTemplates } =
      removeEnvelopeReferences(id, d.transactions, d.recurringTemplates);
    await Promise.all(removedTemplates.map(cancelTemplateReminder));

    await commit({
      envelopes: d.envelopes.filter(e => e.id !== id),
      transactions: keptTransactions,
      recurringTemplates: templates,
    });
    await deleteUnreferencedReceipts(
      d.transactions.filter(t => t.envelopeId === id).flatMap(t => t.receiptUris ?? []),
      keptTransactions
    );
  }), [runExclusive, commit]);

  const archiveTransactions = useCallback((envelopeId?: string) => runExclusive(async () => {
    const archivedAt = new Date().toISOString();
    const updatedTransactions = data.current.transactions.map(t =>
      !t.isArchived && (envelopeId == null || t.envelopeId === envelopeId)
        ? { ...t, isArchived: true, archivedAt }
        : t
    );
    await commit({ transactions: updatedTransactions });
  }), [runExclusive, commit]);

  const resetEnvelope = useCallback((envelopeId: string) => archiveTransactions(envelopeId), [archiveTransactions]);

  const resetAllEnvelopes = useCallback(() => archiveTransactions(), [archiveTransactions]);

  // ─── Transaction CRUD ──────────────────────────────────────────────────────
  const addTransaction = useCallback((transactionData: Omit<Transaction, 'id' | 'isArchived'>) => runExclusive(async () => {
    const before = data.current.transactions;
    const newTransaction: Transaction = {
      ...transactionData,
      amount: roundMoney(transactionData.amount),
      id: newId(),
      isArchived: false,
      date: transactionData.date || new Date().toISOString(),
    };
    const updated = [newTransaction, ...before];
    await commit({ transactions: updated });
    if (newTransaction.type === 'expense') {
      await checkBudgetAlerts(newTransaction.envelopeId, before, updated);
    }
  }), [runExclusive, commit, checkBudgetAlerts]);

  const addTransactions = useCallback((list: Omit<Transaction, 'id' | 'isArchived'>[]) => runExclusive(async () => {
    if (list.length === 0) return;
    const before = data.current.transactions;
    const created: Transaction[] = list.map(item => ({
      ...item,
      amount: roundMoney(item.amount),
      id: newId(),
      isArchived: false,
      date: item.date || new Date().toISOString(),
    }));
    const updated = [...created.slice().reverse(), ...before];
    await commit({ transactions: updated });
    const expenseEnvelopeIds = new Set(created.filter(c => c.type === 'expense').map(c => c.envelopeId));
    for (const envelopeId of expenseEnvelopeIds) {
      await checkBudgetAlerts(envelopeId, before, updated);
    }
  }), [runExclusive, commit, checkBudgetAlerts]);

  const updateTransaction = useCallback((id: string, updates: Partial<Omit<Transaction, 'id'>>) => runExclusive(async () => {
    const before = data.current.transactions;
    const normalized = updates.amount !== undefined ? { ...updates, amount: roundMoney(updates.amount) } : updates;
    const updated = before.map(t => (t.id === id ? { ...t, ...normalized } : t));
    await commit({ transactions: updated });
    if (updates.receiptUris !== undefined) {
      const kept = new Set(updates.receiptUris);
      await deleteUnreferencedReceipts(
        before.find(t => t.id === id)?.receiptUris?.filter(uri => !kept.has(uri)),
        updated
      );
    }
    const updatedTransaction = updated.find(t => t.id === id);
    if (updatedTransaction && updatedTransaction.type === 'expense') {
      await checkBudgetAlerts(updatedTransaction.envelopeId, before, updated);
    }
  }), [runExclusive, commit, checkBudgetAlerts]);

  const deleteTransaction = useCallback((id: string) => runExclusive(async () => {
    const before = data.current.transactions;
    const updated = before.filter(t => t.id !== id);
    await commit({ transactions: updated });
    await deleteUnreferencedReceipts(before.find(t => t.id === id)?.receiptUris, updated);
  }), [runExclusive, commit]);

  /**
   * Creates a transfer transaction moving `amount` from `envelopeId` (source)
   * to `toEnvelopeId` (destination). Validates same-envelope and currency-match
   * defensively (the UI is expected to validate first), and never triggers
   * budget alerts since addTransaction only checks them for expenses.
   */
  const addTransfer = useCallback(async (transfer: {
    envelopeId: string;
    toEnvelopeId: string;
    amount: number;
    description: string;
    notes?: string;
    date?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    // Validate against the data as it will be once earlier queued changes land.
    await runExclusive(async () => undefined);
    const error = validateTransfer(data.current.envelopes, transfer.envelopeId, transfer.toEnvelopeId);
    if (error) return { success: false, error };

    await addTransaction({
      envelopeId: transfer.envelopeId,
      toEnvelopeId: transfer.toEnvelopeId,
      type: 'transfer',
      amount: transfer.amount,
      description: transfer.description,
      notes: transfer.notes,
      date: transfer.date ?? new Date().toISOString(),
    });
    return { success: true };
  }, [runExclusive, addTransaction]);

  /**
   * Updates an existing transfer transaction: merges the updates into the
   * existing one, re-validates the result with the same rules as addTransfer,
   * and only then delegates to updateTransaction.
   */
  const updateTransfer = useCallback(async (id: string, updates: {
    envelopeId?: string;
    toEnvelopeId?: string;
    amount?: number;
    description?: string;
    notes?: string;
    date?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    await runExclusive(async () => undefined);
    const existing = data.current.transactions.find(t => t.id === id);
    if (!existing) {
      return { success: false, error: translateActive('transfer.error.notFound') };
    }
    const merged = { ...existing, ...updates };
    const error = validateTransfer(data.current.envelopes, merged.envelopeId, merged.toEnvelopeId);
    if (error) return { success: false, error };

    await updateTransaction(id, {
      envelopeId: merged.envelopeId,
      toEnvelopeId: merged.toEnvelopeId,
      amount: merged.amount,
      description: merged.description,
      date: merged.date,
    });
    return { success: true };
  }, [runExclusive, updateTransaction]);

  // ─── Recurring Transaction Template CRUD ───────────────────────────────────
  const addRecurringTemplate = useCallback((
    templateData: Omit<RecurringTransactionTemplate, 'id' | 'lastGeneratedPeriod' | 'reminderNotificationId' | 'lastReminderScheduledPeriod'>
  ) => runExclusive(async () => {
    const d = data.current;
    const newTemplate: RecurringTransactionTemplate = {
      ...templateData,
      amount: roundMoney(templateData.amount),
      id: newId(),
      activeSince: new Date().toISOString(),
      lastGeneratedPeriod: null,
      reminderNotificationId: null,
      lastReminderScheduledPeriod: null,
    };
    const updated = [newTemplate, ...d.recurringTemplates];
    await commit({ recurringTemplates: updated });
    const withReminders = await scheduleBillReminders(updated, d.envelopes, d.settings.billRemindersEnabled, d.settings.billReminderLeadDays);
    if (listChanged(withReminders, updated)) await commit({ recurringTemplates: withReminders });
  }), [runExclusive, commit]);

  const updateRecurringTemplate = useCallback((id: string, updates: Partial<Omit<RecurringTransactionTemplate, 'id'>>) => runExclusive(async () => {
    const d = data.current;
    const target = d.recurringTemplates.find(t => t.id === id);
    if (!target) return;

    const normalized = updates.amount !== undefined ? { ...updates, amount: roundMoney(updates.amount) } : updates;
    const merged: RecurringTransactionTemplate = { ...target, ...normalized };
    // Anything that moves the reminder's date or changes what it says invalidates the pending one.
    const reminderFields: (keyof RecurringTransactionTemplate)[] = [
      'dayOfMonth', 'dayOfWeek', 'anchorDate', 'month', 'frequency', 'isActive', 'amount', 'description', 'envelopeId',
    ];
    const base = reminderFields.some(k => merged[k] !== target[k]) ? await cancelTemplateReminder(target) : target;

    // Reactivating, or switching to a frequency whose period keys differ, starts
    // generation over from today instead of backfilling the paused/old schedule.
    const restartsSchedule = (merged.isActive && !target.isActive) || merged.frequency !== target.frequency;
    const next: RecurringTransactionTemplate = {
      ...base,
      ...normalized,
      ...(restartsSchedule ? { lastGeneratedPeriod: null, activeSince: new Date().toISOString() } : {}),
    };

    const updated = d.recurringTemplates.map(t => (t.id === id ? next : t));
    const withReminders = await scheduleBillReminders(updated, d.envelopes, d.settings.billRemindersEnabled, d.settings.billReminderLeadDays);
    await commit({ recurringTemplates: withReminders });
  }), [runExclusive, commit]);

  const deleteRecurringTemplate = useCallback((id: string) => runExclusive(async () => {
    const d = data.current;
    const target = d.recurringTemplates.find(t => t.id === id);
    if (target) await cancelTemplateReminder(target);
    await commit({ recurringTemplates: d.recurringTemplates.filter(t => t.id !== id) });
  }), [runExclusive, commit]);

  // ─── Payment Methods CRUD ──────────────────────────────────────────────────
  const addPaymentMethod = useCallback((name: string) => runExclusive(async () => {
    await commit({ paymentMethods: [...data.current.paymentMethods, { id: newId(), name }] });
  }), [runExclusive, commit]);

  const deletePaymentMethod = useCallback((id: string) => runExclusive(async () => {
    await commit({ paymentMethods: data.current.paymentMethods.filter(pm => pm.id !== id) });
  }), [runExclusive, commit]);

  // ─── Categories CRUD ───────────────────────────────────────────────────────
  const addCategory = useCallback((name: string) => runExclusive(async () => {
    await commit({ categories: [...data.current.categories, { id: newId(), name }] });
  }), [runExclusive, commit]);

  const deleteCategory = useCallback((id: string) => runExclusive(async () => {
    await commit({ categories: data.current.categories.filter(c => c.id !== id) });
  }), [runExclusive, commit]);

  // ─── Income Categories CRUD ────────────────────────────────────────────────
  const addIncomeCategory = useCallback((name: string) => runExclusive(async () => {
    // Prefixed so an income category id can never collide with an expense one.
    await commit({ incomeCategories: [...data.current.incomeCategories, { id: `inc-${newId()}`, name }] });
  }), [runExclusive, commit]);

  const deleteIncomeCategory = useCallback((id: string) => runExclusive(async () => {
    await commit({ incomeCategories: data.current.incomeCategories.filter(c => c.id !== id) });
  }), [runExclusive, commit]);

  // ─── Settings ──────────────────────────────────────────────────────────────
  const updateSettings = useCallback((updates: Partial<AppSettings>) => runExclusive(async () => {
    const d = data.current;
    const previous = d.settings;
    const updated = { ...previous, ...updates };

    if (
      (updated.budgetAlertsEnabled && !previous.budgetAlertsEnabled) ||
      (updated.billRemindersEnabled && !previous.billRemindersEnabled)
    ) {
      await requestNotificationPermissions();
    }
    await commit({ settings: updated });

    const turnedOn = updated.billRemindersEnabled && !previous.billRemindersEnabled;
    const turnedOff = !updated.billRemindersEnabled && previous.billRemindersEnabled;
    const leadDaysChanged = updated.billRemindersEnabled && previous.billRemindersEnabled
      && updated.billReminderLeadDays !== previous.billReminderLeadDays;
    if (!turnedOn && !turnedOff && !leadDaysChanged) return;

    // Turning reminders off, or moving their lead time, cancels what's pending.
    let templates = d.recurringTemplates;
    let envs = d.envelopes;
    if (turnedOff || leadDaysChanged) {
      templates = await Promise.all(templates.map(cancelTemplateReminder));
      envs = await Promise.all(envs.map(cancelDebtReminder));
    }
    if (turnedOn || leadDaysChanged) {
      templates = await scheduleBillReminders(templates, envs, true, updated.billReminderLeadDays);
      envs = await scheduleDebtReminders(envs, d.transactions, true, updated.billReminderLeadDays);
    }
    await commit({ recurringTemplates: templates, envelopes: envs });
  }), [runExclusive, commit]);

  // ─── Import/Export ─────────────────────────────────────────────────────────
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

        // Backups from before templates were exported keep the device's templates,
        // but only those whose envelope exists in the restored data.
        const envelopeIds = new Set(backup.envelopes.map(e => e.id));
        const restoredTemplates = (backup.recurringTemplates
          ?? d.recurringTemplates.filter(t => envelopeIds.has(t.envelopeId))
        ).map(t => ({ ...t, reminderNotificationId: null, lastReminderScheduledPeriod: null }));
        // Notification ids in the file belong to whichever device scheduled them.
        const restoredEnvelopes = backup.envelopes.map(e => ({ ...e, dueReminderNotificationId: null, lastDueReminderScheduledPeriod: null }));

        // Income categories are optional in the backup: apply them only when the
        // file carried the field, so importing a pre-change backup does not wipe
        // the device's current income catalog.
        const restoredIncomeCategories = backup.incomeCategories ?? d.incomeCategories;

        // A successful restore replaces whatever couldn't be read, so saving is safe again.
        writesBlocked.current = false;
        await commit({
          envelopes: restoredEnvelopes,
          transactions: backup.transactions,
          paymentMethods: backup.paymentMethods,
          categories: backup.categories,
          incomeCategories: restoredIncomeCategories,
          recurringTemplates: restoredTemplates,
          settings: backup.settings,
        });
        await processScheduledWork(new Date());

        const message = translateActive('import.restored', {
          envelopes: backup.envelopes.length,
          transactions: backup.transactions.length,
          categories: backup.categories.length,
          incomeCategories: restoredIncomeCategories.length,
          paymentMethods: backup.paymentMethods.length,
        });
        return { success: true, message };
      });
    } catch (e) {
      console.error('Error restoring backup', e);
      return { success: false, message: translateActive('import.failed') };
    }
  }, [runExclusive, commit, processScheduledWork]);

  const value = useMemo(() => ({
    envelopes, transactions, paymentMethods, categories, incomeCategories, settings, settingsLoaded, recurringTemplates, isLoaded, autoBackup, updateAutoBackup,
    addEnvelope, updateEnvelope, deleteEnvelope, resetEnvelope, resetAllEnvelopes,
    addTransaction, addTransactions, updateTransaction, deleteTransaction, addTransfer, updateTransfer,
    addRecurringTemplate, updateRecurringTemplate, deleteRecurringTemplate,
    addPaymentMethod, deletePaymentMethod,
    addCategory, deleteCategory,
    addIncomeCategory, deleteIncomeCategory,
    updateSettings,
    importFromBackup,
    getEnvelopeBalance, getTotalByType, convertToCRC, formatAmount,
  }), [
    envelopes, transactions, paymentMethods, categories, incomeCategories, settings, settingsLoaded, recurringTemplates, isLoaded, autoBackup, updateAutoBackup,
    addEnvelope, updateEnvelope, deleteEnvelope, resetEnvelope, resetAllEnvelopes,
    addTransaction, addTransactions, updateTransaction, deleteTransaction, addTransfer, updateTransfer,
    addRecurringTemplate, updateRecurringTemplate, deleteRecurringTemplate,
    addPaymentMethod, deletePaymentMethod,
    addCategory, deleteCategory,
    addIncomeCategory, deleteIncomeCategory,
    updateSettings,
    importFromBackup,
    getEnvelopeBalance, getTotalByType, convertToCRC, formatAmount,
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
