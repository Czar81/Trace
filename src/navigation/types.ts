import { Envelope, EnvelopeType, Transaction, RecurringTransactionTemplate } from '../types';

export type RootStackParamList = {
  Main: undefined;
  EnvelopeDetail: { envelopeId: string };
  CreateEnvelope: { envelopeType: EnvelopeType; envelope?: Envelope };
  CreateTransaction: { envelopeId: string; transaction?: Transaction };
  CreateTransfer: { envelopeId?: string; transaction?: Transaction } | undefined;
  AssignIncome: undefined;
  ImportBankCsv: undefined;
  Settings: undefined;
  Onboarding: undefined;
  AppearanceSettings: undefined;
  PaymentMethodsSettings: undefined;
  CategoriesSettings: undefined;
  BackupSettings: undefined;
  Reports: undefined;
  Search: undefined;
  Recurring: undefined;
  CreateRecurringTransaction: { template?: RecurringTransactionTemplate };
};
