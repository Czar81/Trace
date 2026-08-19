import { Envelope, EnvelopeType, Transaction, RecurringTransactionTemplate } from '../types';

export type RootStackParamList = {
  Main: undefined;
  EnvelopeDetail: { envelopeId: string };
  CreateEnvelope: { envelopeType: EnvelopeType; envelope?: Envelope };
  CreateTransaction: { envelopeId: string; transaction?: Transaction };
  CreateTransfer: { envelopeId?: string; transaction?: Transaction } | undefined;
  Settings: undefined;
  AppearanceSettings: undefined;
  CurrencySettings: undefined;
  PaymentMethodsSettings: undefined;
  CategoriesSettings: undefined;
  Reports: undefined;
  Search: undefined;
  Recurring: undefined;
  CreateRecurringTransaction: { template?: RecurringTransactionTemplate };
};
