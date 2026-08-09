import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { SimpleListSettingsScreen } from '../components/SimpleListSettingsScreen';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethodsSettings'>;

export const PaymentMethodsSettingsScreen = ({ navigation }: Props) => {
  const { paymentMethods, addPaymentMethod, deletePaymentMethod } = useAppData();

  return (
    <SimpleListSettingsScreen
      navigation={navigation}
      title="Métodos de pago"
      existingSectionTitle="Métodos de pago existentes"
      addSectionTitle="Agregar método de pago"
      addPlaceholder="Nuevo método..."
      items={paymentMethods}
      onAdd={addPaymentMethod}
      onDelete={deletePaymentMethod}
    />
  );
};
