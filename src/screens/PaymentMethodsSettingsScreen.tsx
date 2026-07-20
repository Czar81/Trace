import React from 'react';
import { useAppData } from '../context/ExpenseContext';
import { SimpleListSettingsScreen } from '../components/SimpleListSettingsScreen';

export const PaymentMethodsSettingsScreen = ({ navigation }: any) => {
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
