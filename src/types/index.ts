import { ThemeId } from '../theme/colors';

export type EnvelopeType = 'gasto' | 'ahorro' | 'deuda';
export type Currency = 'CRC' | 'USD' | 'EUR';

export interface PaymentMethod {
  id: string;
  name: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
}

export type DebtInterestFrequency = 'mensual' | 'quincenal' | 'anual';

export interface Envelope {
  id: string;
  name: string;
  type: EnvelopeType;
  currency: Currency;
  limit: number;
  isUnlimited: boolean;
  icon: string;
  imageUri?: string;
  color: string;
  // Debt-only fields (type === 'deuda' && !isUnlimited); undefined/unset otherwise.
  interestRate?: number; // percentage applied per cycle, e.g. 2.5 = 2.5%
  interestFrequency?: DebtInterestFrequency;
  minimumPayment?: number;
  dueDay?: number; // 1-31, anchors the debt's interest/minimum-payment/reminder cycle
  dueAnchorMonth?: number | null; // 1-12, fixes which month 'anual' recurs in; set automatically when interestFrequency becomes 'anual'
  lastInterestAccrualPeriod?: string | null; // occurrence key, same scheme as RecurringTransactionTemplate.lastGeneratedPeriod
  lastMinPaymentCheckPeriod?: string | null; // occurrence key for the last minimum-payment shortfall check
  dueReminderNotificationId?: string | null;
  lastDueReminderScheduledPeriod?: string | null; // occurrence key, same scheme as lastReminderScheduledPeriod
}

export interface Transaction {
  id: string;
  envelopeId: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number; // Always positive, 'type' determines sign
  description: string;
  date: string; // ISO string
  paymentMethodId?: string;
  categoryId?: string;
  sourceSavingsEnvelopeId?: string;
  /** Destination envelope id. Only set when type === 'transfer'; envelopeId is the source. */
  toEnvelopeId?: string;
  isArchived: boolean;
  archivedAt?: string;
}

export type RecurrenceFrequency = 'monthly' | 'weekly' | 'biweekly' | 'annual';

export interface RecurringTransactionTemplate {
  id: string;
  envelopeId: string;
  type: 'expense' | 'income';
  amount: number;
  description: string;
  paymentMethodId?: string;
  categoryId?: string;
  sourceSavingsEnvelopeId?: string;
  frequency: RecurrenceFrequency;
  dayOfMonth: number; // 1-31, used by 'monthly' and 'annual'
  dayOfWeek?: number; // 0=Sunday..6=Saturday, used by 'weekly' and 'biweekly'
  anchorDate?: string; // ISO date, first occurrence for 'biweekly'
  month?: number; // 1-12, used by 'annual'
  isActive: boolean;
  lastGeneratedPeriod: string | null; // occurrence key: 'YYYY-MM' (monthly), 'YYYY' (annual), 'YYYY-Www' (weekly), or ISO due date (biweekly)
  reminderNotificationId: string | null;
  lastReminderScheduledPeriod: string | null; // occurrence key, same scheme as lastGeneratedPeriod
}

export interface AppSettings {
  defaultCurrency: Currency;
  exchangeRates: {
    USD_TO_CRC: number;
    EUR_TO_CRC: number;
  };
  expenseCutoffEnabled: boolean;
  expenseCutoffDay: number | null;
  budgetAlertsEnabled: boolean;
  billRemindersEnabled: boolean;
  billReminderLeadDays: number;
  themeId: ThemeId;
}
