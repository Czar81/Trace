import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Envelope, Transaction, EnvelopeType, PaymentMethod, TransactionCategory, AppSettings, Currency } from '../types';
import {
  loadEnvelopes, saveEnvelopes,
  loadTransactions, saveTransactions,
  loadPaymentMethods, savePaymentMethods,
  loadCategories, saveCategories,
  loadSettings, saveSettings
} from '../utils/storage';
import { pickAndImportBackup } from '../utils/importData';
import { formatCurrency } from '../utils/formatCurrency';

/**
 * Start of the current cutoff period: this month's cutoffDay if we've reached it,
 * otherwise last month's. Clamped to the target month's last day so cutoffDay values
 * like 31 don't roll over into the next month on shorter months.
 */
export function getCutoffPeriodStart(now: Date, cutoffDay: number): Date {
  const targetMonth = now.getDate() >= cutoffDay ? now.getMonth() : now.getMonth() - 1;
  const daysInTargetMonth = new Date(now.getFullYear(), targetMonth + 1, 0).getDate();
  const day = Math.min(cutoffDay, daysInTargetMonth);
  return new Date(now.getFullYear(), targetMonth, day, 0, 0, 0, 0);
}

interface AppContextType {
  envelopes: Envelope[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  categories: TransactionCategory[];
  settings: AppSettings;

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
  const [settings, setSettings] = useState<AppSettings>({
    defaultCurrency: 'CRC',
    exchangeRates: { USD_TO_CRC: 510, EUR_TO_CRC: 550 },
    expenseCutoffEnabled: false,
    expenseCutoffDay: null,
  });

  useEffect(() => {
    const initData = async () => {
      setEnvelopes(await loadEnvelopes());
      setTransactions(await loadTransactions());
      setPaymentMethods(await loadPaymentMethods());
      setCategories(await loadCategories());
      setSettings(await loadSettings());
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
  const getEnvelopeBalance = useCallback((envelopeId: string): number => {
    const envelope = envelopes.find(e => e.id === envelopeId);
    const isGastoEnvelope = envelope?.type === 'gasto';
    const hasCutoff = isGastoEnvelope && settings.expenseCutoffEnabled && !!settings.expenseCutoffDay;
    const periodStart = hasCutoff ? getCutoffPeriodStart(new Date(), settings.expenseCutoffDay as number) : null;

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
  }, [transactions, envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay]);

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
  }, [transactions]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
    const updated = transactions.map(t => (t.id === id ? { ...t, ...updates } : t));
    setTransactions(updated);
    await saveTransactions(updated);
  }, [transactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    await saveTransactions(updated);
  }, [transactions]);

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
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }, []);

  const value = useMemo(() => ({
    envelopes, transactions, paymentMethods, categories, settings,
    addEnvelope, updateEnvelope, deleteEnvelope, resetEnvelope, resetAllEnvelopes,
    addTransaction, updateTransaction, deleteTransaction,
    addPaymentMethod, deletePaymentMethod,
    addCategory, deleteCategory,
    updateSettings,
    importFromBackup,
    getEnvelopeBalance, getTotalByType, convertToCRC, formatAmount,
  }), [
    envelopes, transactions, paymentMethods, categories, settings,
    addEnvelope, updateEnvelope, deleteEnvelope, resetEnvelope, resetAllEnvelopes,
    addTransaction, updateTransaction, deleteTransaction,
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
