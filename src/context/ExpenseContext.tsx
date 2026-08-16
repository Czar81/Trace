import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as Notifications from 'expo-notifications';
import { Envelope, Transaction, EnvelopeType, PaymentMethod, TransactionCategory, AppSettings, Currency, RecurringTransactionTemplate } from '../types';
import {
  loadEnvelopes, saveEnvelopes,
  loadTransactions, saveTransactions,
  loadPaymentMethods, savePaymentMethods,
  loadCategories, saveCategories,
  loadSettings, saveSettings,
  loadRecurringTemplates, saveRecurringTemplates
} from '../utils/storage';
import { pickAndImportBackup } from '../utils/importData';
import { formatCurrency } from '../utils/formatCurrency';

/**
 * Clamps `day` to the last valid day of the given year/month (0-indexed month),
 * so values like 31 don't roll over into the next month on shorter months.
 */
export function clampDayOfMonth(year: number, month: number, day: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(day, daysInMonth);
}

/**
 * Start of the current cutoff period: this month's cutoffDay if we've reached it,
 * otherwise last month's. Clamped to the target month's last day so cutoffDay values
 * like 31 don't roll over into the next month on shorter months.
 */
export function getCutoffPeriodStart(now: Date, cutoffDay: number): Date {
  const targetMonth = now.getDate() >= cutoffDay ? now.getMonth() : now.getMonth() - 1;
  const day = clampDayOfMonth(now.getFullYear(), targetMonth, cutoffDay);
  return new Date(now.getFullYear(), targetMonth, day, 0, 0, 0, 0);
}

/**
 * Pure envelope-balance formula shared by getEnvelopeBalance (live state) and
 * computeSpentPercentage (explicit before/after snapshots for budget alerts).
 * For 'gasto' envelopes with an active cutoff, expenses dated before the current
 * cutoff period start are excluded from the balance.
 */
export function calculateEnvelopeBalance(
  envelopeId: string,
  transactions: Transaction[],
  envelopes: Envelope[],
  expenseCutoffEnabled: boolean,
  expenseCutoffDay: number | null
): number {
  const envelope = envelopes.find(e => e.id === envelopeId);
  const isGastoEnvelope = envelope?.type === 'gasto';
  const hasCutoff = isGastoEnvelope && expenseCutoffEnabled && !!expenseCutoffDay;
  const periodStart = hasCutoff ? getCutoffPeriodStart(new Date(), expenseCutoffDay as number) : null;

  return transactions.reduce((sum, t) => {
    if (t.isArchived) return sum;

    if (hasCutoff && t.type === 'expense' && t.envelopeId === envelopeId && periodStart != null) {
      const transactionDate = new Date(t.date);
      if (transactionDate < periodStart) {
        return sum;
      }
    }

    if (t.envelopeId === envelopeId) {
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }
    if (t.type === 'expense' && t.sourceSavingsEnvelopeId === envelopeId) {
      return sum - t.amount;
    }
    return sum;
  }, 0);
}

interface AppContextType {
  envelopes: Envelope[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  categories: TransactionCategory[];
  settings: AppSettings;
  recurringTemplates: RecurringTransactionTemplate[];

  // Envelope CRUD
  addEnvelope: (envelope: Omit<Envelope, 'id'>) => Promise<void>;
  updateEnvelope: (id: string, updates: Partial<Omit<Envelope, 'id'>>) => Promise<void>;
  deleteEnvelope: (id: string) => Promise<void>;
  resetEnvelope: (envelopeId: string) => Promise<void>;
  resetAllEnvelopes: () => Promise<void>;

  // Transaction CRUD
  addTransaction: (transaction: Omit<Transaction, 'id' | 'isArchived'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Recurring Transaction Template CRUD
  addRecurringTemplate: (template: Omit<RecurringTransactionTemplate, 'id' | 'lastGeneratedPeriod'>) => Promise<void>;
  updateRecurringTemplate: (id: string, updates: Partial<Omit<RecurringTransactionTemplate, 'id'>>) => Promise<void>;
  deleteRecurringTemplate: (id: string) => Promise<void>;

  // Payment Methods & Categories CRUD
  addPaymentMethod: (name: string) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

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
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTransactionTemplate[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    defaultCurrency: 'CRC',
    exchangeRates: { USD_TO_CRC: 510, EUR_TO_CRC: 550 },
    expenseCutoffEnabled: false,
    expenseCutoffDay: null,
    budgetAlertsEnabled: false,
  });

  useEffect(() => {
    const initData = async () => {
      setEnvelopes(await loadEnvelopes());
      const loadedTransactions = await loadTransactions();
      const loadedTemplates = await loadRecurringTemplates();
      setPaymentMethods(await loadPaymentMethods());
      setCategories(await loadCategories());
      setSettings(await loadSettings());

      // ─── Automatic generation of due recurring transactions ──────────────
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentPeriod = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const today = now.getDate();

      const newTransactions: Transaction[] = [];
      let idOffset = 0;
      const finalTemplates = loadedTemplates.map(template => {
        if (!template.isActive) return template;
        if (template.lastGeneratedPeriod === currentPeriod) return template;

        const clampedDay = clampDayOfMonth(currentYear, currentMonth, template.dayOfMonth);
        if (today < clampedDay) return template;

        const generatedDate = new Date(currentYear, currentMonth, clampedDay, 0, 0, 0, 0);
        newTransactions.push({
          id: (Date.now() + idOffset++).toString(),
          envelopeId: template.envelopeId,
          type: template.type,
          amount: template.amount,
          description: template.description,
          date: generatedDate.toISOString(),
          paymentMethodId: template.paymentMethodId,
          categoryId: template.categoryId,
          sourceSavingsEnvelopeId: template.sourceSavingsEnvelopeId,
          isArchived: false,
        });

        return { ...template, lastGeneratedPeriod: currentPeriod };
      });

      if (newTransactions.length > 0) {
        const finalTransactions = [...newTransactions, ...loadedTransactions];
        await saveTransactions(finalTransactions);
        await saveRecurringTemplates(finalTemplates);
        setTransactions(finalTransactions);
        setRecurringTemplates(finalTemplates);
      } else {
        setTransactions(loadedTransactions);
        setRecurringTemplates(loadedTemplates);
      }
    };
    initData();
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
  /**
   * Envelope id -> balance, computed in a single pass over `transactions` so
   * per-envelope lookups (e.g. rendering the envelope list) are O(1) instead of
   * each doing its own O(n) reduce. Mirrors calculateEnvelopeBalance's formula:
   * a transaction affects at most two envelopes (its own envelopeId, and, for
   * expenses funded from savings, sourceSavingsEnvelopeId), so both effects are
   * applied per transaction as the map is built.
   */
  const envelopeBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const envelopeById = new Map(envelopes.map(e => [e.id, e]));
    const cutoffPeriodStart = settings.expenseCutoffEnabled && settings.expenseCutoffDay
      ? getCutoffPeriodStart(new Date(), settings.expenseCutoffDay)
      : null;

    for (const t of transactions) {
      if (t.isArchived) continue;

      if (t.envelopeId) {
        const envelope = envelopeById.get(t.envelopeId);
        const hasCutoff = envelope?.type === 'gasto' && cutoffPeriodStart != null;
        const skip = hasCutoff && t.type === 'expense' && new Date(t.date) < (cutoffPeriodStart as Date);
        if (!skip) {
          const delta = t.type === 'income' ? t.amount : -t.amount;
          map.set(t.envelopeId, (map.get(t.envelopeId) ?? 0) + delta);
        }
      }
      if (t.type === 'expense' && t.sourceSavingsEnvelopeId) {
        const sourceId = t.sourceSavingsEnvelopeId;
        map.set(sourceId, (map.get(sourceId) ?? 0) - t.amount);
      }
    }

    return map;
  }, [transactions, envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay]);

  const getEnvelopeBalance = useCallback((envelopeId: string): number => {
    const cached = envelopeBalanceMap.get(envelopeId);
    if (cached !== undefined) return cached;
    // Fallback for ids not present in the map (e.g. a brand-new envelope with
    // zero transactions) — never hit in practice, but keeps this correct.
    return calculateEnvelopeBalance(envelopeId, transactions, envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay);
  }, [envelopeBalanceMap, transactions, envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay]);

  /**
   * getTotalByType computes the sum of all envelope *available balances* 
   * converted to CRC for display in the summary card.
   * For 'gasto': sum of (limit + balance) per envelope — total disponible.
   * For 'ahorro': sum of balances — total ahorrado.
   */
  const getTotalByType = useCallback((type: EnvelopeType): number => {
    return envelopes
      .filter(e => e.type === type)
      .reduce((total, env) => {
        // Exclude unlimited expenses from the 'Total Disponible' general
        if (type === 'gasto' && env.isUnlimited) return total;

        const balance = getEnvelopeBalance(env.id);
        const displayValue = type === 'gasto'
          ? env.limit + balance
          : balance;
        return total + convertToCRC(displayValue, env.currency);
      }, 0);
  }, [envelopes, getEnvelopeBalance, convertToCRC]);

  // ─── Budget alerts (spent-percentage transition detection) ─────────────────
  /**
   * Same formula as getEnvelopeBalance/spent, but takes an explicit transactions
   * array so it can be computed for a "before" and "after" snapshot of a mutation
   * without touching state.
   */
  const computeSpentPercentage = useCallback((envelopeId: string, txns: Transaction[]): number => {
    const envelope = envelopes.find(e => e.id === envelopeId);
    if (!envelope || !envelope.limit) return 0;

    const balance = calculateEnvelopeBalance(envelopeId, txns, envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay);

    const spent = -balance;
    return spent / envelope.limit;
  }, [envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay]);

  /**
   * Compares an envelope's spent-percentage before/after a transaction mutation
   * and fires a local notification only on the transition into the 80% or 100%
   * band, per budget-alerts spec. No-op for ahorro envelopes, unlimited gasto
   * envelopes, or when the setting is off.
   */
  const checkBudgetAlerts = useCallback(async (
    envelopeId: string,
    beforeTxns: Transaction[],
    afterTxns: Transaction[]
  ) => {
    if (!settings.budgetAlertsEnabled) return;

    const envelope = envelopes.find(e => e.id === envelopeId);
    if (!envelope || envelope.type !== 'gasto' || envelope.isUnlimited) return;

    const before = computeSpentPercentage(envelopeId, beforeTxns);
    const after = computeSpentPercentage(envelopeId, afterTxns);

    try {
      if (before < 0.8 && after >= 0.8) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Presupuesto al 80%',
            body: `Tu sobre "${envelope.name}" llegó al ${Math.round(after * 100)}% de su presupuesto.`,
          },
          trigger: null,
        });
      }

      if (before < 1.0 && after >= 1.0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Presupuesto excedido',
            body: `Tu sobre "${envelope.name}" superó su presupuesto (${Math.round(after * 100)}%).`,
          },
          trigger: null,
        });
      }
    } catch (e) {
      console.error('Error scheduling budget alert notification', e);
    }
  }, [envelopes, settings.budgetAlertsEnabled, computeSpentPercentage]);

  // ─── Envelope CRUD ─────────────────────────────────────────────────────────
  const addEnvelope = useCallback(async (envelopeData: Omit<Envelope, 'id'>) => {
    const newEnvelope: Envelope = { ...envelopeData, id: Date.now().toString() };
    const updated = [newEnvelope, ...envelopes];
    setEnvelopes(updated);
    await saveEnvelopes(updated);
  }, [envelopes]);

  const updateEnvelope = useCallback(async (id: string, updates: Partial<Omit<Envelope, 'id'>>) => {
    const updated = envelopes.map(e => (e.id === id ? { ...e, ...updates } : e));
    setEnvelopes(updated);
    await saveEnvelopes(updated);
  }, [envelopes]);

  const deleteEnvelope = useCallback(async (id: string) => {
    const updatedEnvelopes = envelopes.filter(e => e.id !== id);
    // Also remove associated transactions
    const updatedTransactions = transactions.filter(t => t.envelopeId !== id);
    setEnvelopes(updatedEnvelopes);
    setTransactions(updatedTransactions);
    await saveEnvelopes(updatedEnvelopes);
    await saveTransactions(updatedTransactions);
  }, [envelopes, transactions]);

  const archiveTransactions = useCallback(async (envelopeId?: string) => {
    const updatedTransactions = transactions.map(t =>
      !t.isArchived && (envelopeId == null || t.envelopeId === envelopeId)
        ? { ...t, isArchived: true, archivedAt: new Date().toISOString() }
        : t
    );
    setTransactions(updatedTransactions);
    await saveTransactions(updatedTransactions);
  }, [transactions]);

  const resetEnvelope = useCallback((envelopeId: string) => archiveTransactions(envelopeId), [archiveTransactions]);

  const resetAllEnvelopes = useCallback(() => archiveTransactions(), [archiveTransactions]);

  // ─── Transaction CRUD ──────────────────────────────────────────────────────
  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'isArchived'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: Date.now().toString(),
      isArchived: false,
      date: transactionData.date || new Date().toISOString(),
    };
    const updated = [newTransaction, ...transactions];
    setTransactions(updated);
    await saveTransactions(updated);
    if (newTransaction.type === 'expense') {
      await checkBudgetAlerts(newTransaction.envelopeId, transactions, updated);
    }
  }, [transactions, checkBudgetAlerts]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
    const updated = transactions.map(t => (t.id === id ? { ...t, ...updates } : t));
    setTransactions(updated);
    await saveTransactions(updated);
    const updatedTransaction = updated.find(t => t.id === id);
    if (updatedTransaction && updatedTransaction.type === 'expense') {
      await checkBudgetAlerts(updatedTransaction.envelopeId, transactions, updated);
    }
  }, [transactions, checkBudgetAlerts]);

  const deleteTransaction = useCallback(async (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    await saveTransactions(updated);
  }, [transactions]);

  // ─── Recurring Transaction Template CRUD ───────────────────────────────────
  const addRecurringTemplate = useCallback(async (templateData: Omit<RecurringTransactionTemplate, 'id' | 'lastGeneratedPeriod'>) => {
    const newTemplate: RecurringTransactionTemplate = {
      ...templateData,
      id: Date.now().toString(),
      lastGeneratedPeriod: null,
    };
    const updated = [newTemplate, ...recurringTemplates];
    setRecurringTemplates(updated);
    await saveRecurringTemplates(updated);
  }, [recurringTemplates]);

  const updateRecurringTemplate = useCallback(async (id: string, updates: Partial<Omit<RecurringTransactionTemplate, 'id'>>) => {
    const updated = recurringTemplates.map(t => (t.id === id ? { ...t, ...updates } : t));
    setRecurringTemplates(updated);
    await saveRecurringTemplates(updated);
  }, [recurringTemplates]);

  const deleteRecurringTemplate = useCallback(async (id: string) => {
    const updated = recurringTemplates.filter(t => t.id !== id);
    setRecurringTemplates(updated);
    await saveRecurringTemplates(updated);
  }, [recurringTemplates]);

  // ─── Payment Methods CRUD ──────────────────────────────────────────────────
  const addPaymentMethod = useCallback(async (name: string) => {
    const newPM: PaymentMethod = { id: Date.now().toString(), name };
    const updated = [...paymentMethods, newPM];
    setPaymentMethods(updated);
    await savePaymentMethods(updated);
  }, [paymentMethods]);

  const deletePaymentMethod = useCallback(async (id: string) => {
    const updated = paymentMethods.filter(pm => pm.id !== id);
    setPaymentMethods(updated);
    await savePaymentMethods(updated);
  }, [paymentMethods]);

  // ─── Categories CRUD ───────────────────────────────────────────────────────
  const addCategory = useCallback(async (name: string) => {
    const newCat: TransactionCategory = { id: Date.now().toString(), name };
    const updated = [...categories, newCat];
    setCategories(updated);
    await saveCategories(updated);
  }, [categories]);

  const deleteCategory = useCallback(async (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    await saveCategories(updated);
  }, [categories]);

  // ─── Settings ──────────────────────────────────────────────────────────────
  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    if (updates.budgetAlertsEnabled === true && !settings.budgetAlertsEnabled) {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (e) {
        console.error('Error requesting notification permissions', e);
      }
    }
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  // ─── Import/Export ─────────────────────────────────────────────────────────
  const importFromBackup = useCallback(async () => {
    try {
      const importResult = await pickAndImportBackup();
      if (!importResult) {
        return { success: false, message: 'Import cancelled' };
      }

      if (importResult.errors.length > 0) {
        return { success: false, message: 'Errors in file', errors: importResult.errors };
      }

      const backup = importResult.backup;

      // Replace all data with backup data
      setEnvelopes(backup.envelopes);
      setTransactions(backup.transactions);
      setPaymentMethods(backup.paymentMethods);
      setCategories(backup.categories);
      setSettings(backup.settings);

      // Save all
      await saveEnvelopes(backup.envelopes);
      await saveTransactions(backup.transactions);
      await savePaymentMethods(backup.paymentMethods);
      await saveCategories(backup.categories);
      await saveSettings(backup.settings);

      const message = `Backup restored: ${backup.envelopes.length} envelopes, ${backup.transactions.length} transactions, ${backup.categories.length} categories, ${backup.paymentMethods.length} payment methods`;
      return { success: true, message };
    } catch {
      return { success: false, message: 'No se pudo importar el backup. Verifica que el archivo sea válido.' };
    }
  }, []);

  const value = useMemo(() => ({
    envelopes, transactions, paymentMethods, categories, settings, recurringTemplates,
    addEnvelope, updateEnvelope, deleteEnvelope, resetEnvelope, resetAllEnvelopes,
    addTransaction, updateTransaction, deleteTransaction,
    addRecurringTemplate, updateRecurringTemplate, deleteRecurringTemplate,
    addPaymentMethod, deletePaymentMethod,
    addCategory, deleteCategory,
    updateSettings,
    importFromBackup,
    getEnvelopeBalance, getTotalByType, convertToCRC, formatAmount,
  }), [
    envelopes, transactions, paymentMethods, categories, settings, recurringTemplates,
    addEnvelope, updateEnvelope, deleteEnvelope, resetEnvelope, resetAllEnvelopes,
    addTransaction, updateTransaction, deleteTransaction,
    addRecurringTemplate, updateRecurringTemplate, deleteRecurringTemplate,
    addPaymentMethod, deletePaymentMethod,
    addCategory, deleteCategory,
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
