import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Envelope, Transaction, EnvelopeType, PaymentMethod, TransactionCategory, AppSettings, Currency } from '../types';
import {
  loadEnvelopes, saveEnvelopes,
  loadTransactions, saveTransactions,
  loadPaymentMethods, savePaymentMethods,
  loadCategories, saveCategories,
  loadSettings, saveSettings
} from '../utils/storage';

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
        const balance = getEnvelopeBalance(env.id);
        const displayValue = type === 'gasto'
          ? env.isUnlimited ? balance : env.limit + balance
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

  return (
    <AppContext.Provider value={{
      envelopes, transactions, paymentMethods, categories, settings,
      addEnvelope, updateEnvelope, deleteEnvelope, resetEnvelope, resetAllEnvelopes,
      addTransaction, updateTransaction, deleteTransaction,
      addPaymentMethod, deletePaymentMethod,
      addCategory, deleteCategory,
      updateSettings,
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
