import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../../context/ExpenseContext';
import { SimpleListSettingsScreen } from '../../components/layout/SimpleListSettingsScreen';
import { RootStackParamList } from '../../navigation/types';
import { useTranslation } from '../../context/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoriesSettings'>;

export const CategoriesSettingsScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const { categories, addCategory, deleteCategory, incomeCategories, addIncomeCategory, deleteIncomeCategory } = useAppData();

  return (
    <SimpleListSettingsScreen
      navigation={navigation}
      title={t('categories.title')}
      groupTitle={t('categories.expensesGroup')}
      existingSectionTitle={t('categories.existing')}
      addSectionTitle={t('categories.addSection')}
      addPlaceholder={t('categories.addPlaceholder')}
      items={categories}
      onAdd={addCategory}
      onDelete={deleteCategory}
      extraSections={[{
        groupTitle: t('categories.incomeGroup'),
        existingSectionTitle: t('incomeCategories.existing'),
        addSectionTitle: t('incomeCategories.addSection'),
        addPlaceholder: t('incomeCategories.addPlaceholder'),
        items: incomeCategories,
        onAdd: addIncomeCategory,
        onDelete: deleteIncomeCategory,
      }]}
    />
  );
};
