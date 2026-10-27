import { Envelope, Transaction, PaymentMethod, TransactionCategory, AppSettings, RecurringTransactionTemplate } from '../../types';
import {
  loadEnvelopes, loadTransactions, loadPaymentMethods, loadCategories, loadIncomeCategories,
  loadRecurringTemplates, loadSettings, DEFAULT_SETTINGS,
} from './storage';

export interface AppData {
  envelopes: Envelope[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  categories: TransactionCategory[];
  incomeCategories: TransactionCategory[];
  recurringTemplates: RecurringTransactionTemplate[];
  settings: AppSettings;
}

export const EMPTY_DATA: AppData = {
  envelopes: [], transactions: [], paymentMethods: [], categories: [], incomeCategories: [], recurringTemplates: [],
  settings: DEFAULT_SETTINGS,
};

export const loadAppData = async (): Promise<AppData> => ({
  envelopes: await loadEnvelopes(),
  transactions: await loadTransactions(),
  paymentMethods: await loadPaymentMethods(),
  categories: await loadCategories(),
  incomeCategories: await loadIncomeCategories(),
  recurringTemplates: await loadRecurringTemplates(),
  settings: await loadSettings(),
});
