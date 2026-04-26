export type EnvelopeType = 'gasto' | 'ahorro';
export type Currency = 'CRC' | 'USD' | 'EUR';

export interface PaymentMethod {
  id: string;
  name: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
}

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
}

export interface Transaction {
  id: string;
  envelopeId: string;
  type: 'expense' | 'income';
  amount: number; // Always positive, 'type' determines sign
  description: string;
  date: string; // ISO string
  paymentMethodId?: string;
  categoryId?: string;
  isArchived: boolean;
  archivedAt?: string;
}

export interface AppSettings {
  defaultCurrency: Currency;
  exchangeRates: {
    USD_TO_CRC: number;
    EUR_TO_CRC: number;
  };
}
