import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { SimpleListSettingsScreen } from '../components/SimpleListSettingsScreen';
import { RootStackParamList } from '../navigation/types';
import { useTranslation } from '../context/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethodsSettings'>;

export const PaymentMethodsSettingsScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const { paymentMethods, addPaymentMethod, deletePaymentMethod } = useAppData();

  return (
    <SimpleListSettingsScreen
      navigation={navigation}
      title={t('paymentMethods.title')}
      existingSectionTitle={t('paymentMethods.existing')}
      addSectionTitle={t('paymentMethods.addSection')}
      addPlaceholder={t('paymentMethods.addPlaceholder')}
      items={paymentMethods}
      onAdd={addPaymentMethod}
      onDelete={deletePaymentMethod}
    />
  );
};
