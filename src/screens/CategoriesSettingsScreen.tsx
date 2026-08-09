import React from 'react';
import { useAppData } from '../context/ExpenseContext';
import { SimpleListSettingsScreen } from '../components/SimpleListSettingsScreen';

export const CategoriesSettingsScreen = ({ navigation }: any) => {
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
