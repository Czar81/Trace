import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { SimpleListSettingsScreen } from '../components/SimpleListSettingsScreen';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoriesSettings'>;

export const CategoriesSettingsScreen = ({ navigation }: Props) => {
  const { categories, addCategory, deleteCategory } = useAppData();

  return (
    <SimpleListSettingsScreen
      navigation={navigation}
      title="Categorías"
      existingSectionTitle="Categorías existentes"
      addSectionTitle="Agregar categoría"
      addPlaceholder="Nueva categoría..."
      items={categories}
      onAdd={addCategory}
      onDelete={deleteCategory}
    />
  );
};
