import { Envelope, EnvelopeType, Transaction } from '../types';

export type RootStackParamList = {
  Main: undefined;
  EnvelopeDetail: { envelopeId: string };
  CreateEnvelope: { envelopeType: EnvelopeType; envelope?: Envelope };
  CreateTransaction: { envelopeId: string; transaction?: Transaction };
  Settings: undefined;
  CurrencySettings: undefined;
  PaymentMethodsSettings: undefined;
  CategoriesSettings: undefined;
  CutoffSettings: undefined;
  Reports: undefined;
};
