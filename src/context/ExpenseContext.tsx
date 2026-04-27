import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Envelope, Transaction, EnvelopeType, PaymentMethod, TransactionCategory, AppSettings, Currency } from '../types';
import {
  loadEnvelopes, saveEnvelopes,
  loadTransactions, saveTransactions,
  loadPaymentMethods, savePaymentMethods,
  loadCategories, saveCategories,
  loadSettings, saveSettings
} from '../utils/storage';
import { pickAndParseCSV } from '../utils/importData';

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
  importFromCSV: () => Promise<{ success: boolean; message: string; errors?: string[] }>;

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

  const SYMBOLS: Record<Currency, string> = { CRC: '₡', USD: '$', EUR: '€' };

  const formatAmount = useCallback((amount: number, currency: Currency): string => {
    const sym = SYMBOLS[currency] ?? '₡';
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sign}${sym}${abs}`;
  }, []);

  // ─── Balance computation ───────────────────────────────────────────────────
  const getEnvelopeBalance = useCallback((envelopeId: string): number => {
    return transactions
      .filter(t => t.envelopeId === envelopeId && !t.isArchived)
      .reduce((sum, t) => (t.type === 'income' ? sum + t.amount : sum - t.amount), 0);
  }, [transactions]);

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
  const addEnvelope = async (envelopeData: Omit<Envelope, 'id'>) => {
    const newEnvelope: Envelope = { ...envelopeData, id: Date.now().toString() };
    const updated = [newEnvelope, ...envelopes];
    setEnvelopes(updated);
    await saveEnvelopes(updated);
  };

  const updateEnvelope = async (id: string, updates: Partial<Omit<Envelope, 'id'>>) => {
    const updated = envelopes.map(e => (e.id === id ? { ...e, ...updates } : e));
    setEnvelopes(updated);
    await saveEnvelopes(updated);
  };

  const deleteEnvelope = async (id: string) => {
    const updatedEnvelopes = envelopes.filter(e => e.id !== id);
    // Also remove associated transactions
    const updatedTransactions = transactions.filter(t => t.envelopeId !== id);
    setEnvelopes(updatedEnvelopes);
    setTransactions(updatedTransactions);
    await saveEnvelopes(updatedEnvelopes);
    await saveTransactions(updatedTransactions);
  };

  const resetEnvelope = async (envelopeId: string) => {
    const updatedTransactions = transactions.map(t =>
      t.envelopeId === envelopeId && !t.isArchived
        ? { ...t, isArchived: true, archivedAt: new Date().toISOString() }
        : t
    );
    setTransactions(updatedTransactions);
    await saveTransactions(updatedTransactions);
  };

  const resetAllEnvelopes = async () => {
    const updatedTransactions = transactions.map(t =>
      !t.isArchived
        ? { ...t, isArchived: true, archivedAt: new Date().toISOString() }
        : t
    );
    setTransactions(updatedTransactions);
    await saveTransactions(updatedTransactions);
  };

  // ─── Transaction CRUD ──────────────────────────────────────────────────────
  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'isArchived'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: Date.now().toString(),
      isArchived: false,
      date: transactionData.date || new Date().toISOString(),
    };
    const updated = [newTransaction, ...transactions];
    setTransactions(updated);
    await saveTransactions(updated);
  };

  const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
    const updated = transactions.map(t => (t.id === id ? { ...t, ...updates } : t));
    setTransactions(updated);
    await saveTransactions(updated);
  };

  const deleteTransaction = async (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    await saveTransactions(updated);
  };

  // ─── Payment Methods CRUD ──────────────────────────────────────────────────
  const addPaymentMethod = async (name: string) => {
    const newPM: PaymentMethod = { id: Date.now().toString(), name };
    const updated = [...paymentMethods, newPM];
    setPaymentMethods(updated);
    await savePaymentMethods(updated);
  };

  const deletePaymentMethod = async (id: string) => {
    const updated = paymentMethods.filter(pm => pm.id !== id);
    setPaymentMethods(updated);
    await savePaymentMethods(updated);
  };

  // ─── Categories CRUD ───────────────────────────────────────────────────────
  const addCategory = async (name: string) => {
    const newCat: TransactionCategory = { id: Date.now().toString(), name };
    const updated = [...categories, newCat];
    setCategories(updated);
    await saveCategories(updated);
  };

  const deleteCategory = async (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    await saveCategories(updated);
  };

  // ─── Settings ──────────────────────────────────────────────────────────────
  const updateSettings = async (updates: Partial<AppSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await saveSettings(updated);
  };

  // ─── Import/Export ─────────────────────────────────────────────────────────
  const importFromCSV = async () => {
    try {
      const importResult = await pickAndParseCSV();
      if (!importResult) {
        return { success: false, message: 'Importación cancelada' };
      }

      if (importResult.errors.length > 0) {
        return { success: false, message: 'Errores en el archivo', errors: importResult.errors };
      }

      // Create maps for new items
      const newEnvelopesMap = new Map<string, Envelope>();
      const newCategoriesMap = new Map<string, TransactionCategory>();
      const newPaymentMethodsMap = new Map<string, PaymentMethod>();

      // Add new envelopes
      for (const envData of importResult.envelopes) {
        const existing = envelopes.find(e => e.name.toLowerCase() === envData.name.toLowerCase());
        if (existing) {
          newEnvelopesMap.set(envData.name, existing);
        } else {
          const newEnv: Envelope = { ...envData, id: Date.now().toString() + Math.random() };
          newEnvelopesMap.set(envData.name, newEnv);
        }
      }

      // Add new categories
      for (const cat of importResult.categories) {
        const existing = categories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
        if (existing) {
          newCategoriesMap.set(cat.name, existing);
        } else {
          const newCat: TransactionCategory = { id: Date.now().toString() + Math.random(), name: cat.name };
          newCategoriesMap.set(cat.name, newCat);
        }
      }

      // Add new payment methods
      for (const pm of importResult.paymentMethods) {
        const existing = paymentMethods.find(p => p.name.toLowerCase() === pm.name.toLowerCase());
        if (existing) {
          newPaymentMethodsMap.set(pm.name, existing);
        } else {
          const newPM: PaymentMethod = { id: Date.now().toString() + Math.random(), name: pm.name };
          newPaymentMethodsMap.set(pm.name, newPM);
        }
      }

      // Merge envelopes
      const existingEnvelopeNames = new Set(envelopes.map(e => e.name.toLowerCase()));
      const newEnvelopesToAdd = Array.from(newEnvelopesMap.values()).filter(
        e => !existingEnvelopeNames.has(e.name.toLowerCase())
      );
      const allEnvelopes = [...envelopes, ...newEnvelopesToAdd];

      // Merge categories
      const existingCategoryNames = new Set(categories.map(c => c.name.toLowerCase()));
      const newCategoriesToAdd = Array.from(newCategoriesMap.values()).filter(
        c => !existingCategoryNames.has(c.name.toLowerCase())
      );
      const allCategories = [...categories, ...newCategoriesToAdd];

      // Merge payment methods
      const existingPMNames = new Set(paymentMethods.map(p => p.name.toLowerCase()));
      const newPMsToAdd = Array.from(newPaymentMethodsMap.values()).filter(
        p => !existingPMNames.has(p.name.toLowerCase())
      );
      const allPaymentMethods = [...paymentMethods, ...newPMsToAdd];

      // Map transactions to envelope IDs and create them
      const newTransactions: Transaction[] = [];
      for (const transData of importResult.transactions) {
        const envelopeName = (transData as any)._envelopeName;
        const envelope = allEnvelopes.find(e => e.name === envelopeName);
        if (envelope) {
          const categoryName = typeof transData.categoryId === 'string' ? transData.categoryId : undefined;
          const pmName = typeof transData.paymentMethodId === 'string' ? transData.paymentMethodId : undefined;

          const newTrans: Transaction = {
            ...transData,
            id: Date.now().toString() + Math.random(),
            envelopeId: envelope.id,
            categoryId: categoryName ? newCategoriesMap.get(categoryName)?.id : undefined,
            paymentMethodId: pmName ? newPaymentMethodsMap.get(pmName)?.id : undefined,
            isArchived: false,
          };
          newTransactions.push(newTrans);
        }
      }

      // Save all
      setEnvelopes(allEnvelopes);
      setCategories(allCategories);
      setPaymentMethods(allPaymentMethods);
      setTransactions([...transactions, ...newTransactions]);

      await saveEnvelopes(allEnvelopes);
      await saveCategories(allCategories);
      await savePaymentMethods(allPaymentMethods);
      await saveTransactions([...transactions, ...newTransactions]);

      const message = `Importados: ${newEnvelopesToAdd.length} sobres, ${newTransactions.length} transacciones, ${newCategoriesToAdd.length} categorías, ${newPMsToAdd.length} métodos de pago`;
      return { success: true, message };
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  };

  return (
    <AppContext.Provider value={{
      envelopes, transactions, paymentMethods, categories, settings,
      addEnvelope, updateEnvelope, deleteEnvelope, resetEnvelope, resetAllEnvelopes,
      addTransaction, updateTransaction, deleteTransaction,
      addPaymentMethod, deletePaymentMethod,
      addCategory, deleteCategory,
      updateSettings,
      importFromCSV,
      getEnvelopeBalance, getTotalByType, convertToCRC, formatAmount,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppData must be used within an AppProvider');
  return context;
};
