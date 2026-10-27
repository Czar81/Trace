import { useCallback, useMemo } from 'react';
import { AppData } from '../../services/appData';
import { Store } from '../useDataStore';
import { newId } from '../../domain/helpers';

type CatalogKey = 'paymentMethods' | 'categories' | 'incomeCategories';

/** Add/delete for the simple name-only lists (payment methods and both category lists). */
export function useCatalogActions({ data, runExclusive, commit }: Store) {
  const add = useCallback((key: CatalogKey, name: string, idPrefix = '') => runExclusive(async () => {
    const list: AppData[CatalogKey] = data.current[key];
    await commit({ [key]: [...list, { id: `${idPrefix}${newId()}`, name }] });
  }), [data, runExclusive, commit]);

  const remove = useCallback((key: CatalogKey, id: string) => runExclusive(async () => {
    const list: AppData[CatalogKey] = data.current[key];
    await commit({ [key]: list.filter(item => item.id !== id) });
  }), [data, runExclusive, commit]);

  return useMemo(() => ({
    addPaymentMethod: (name: string) => add('paymentMethods', name),
    deletePaymentMethod: (id: string) => remove('paymentMethods', id),
    addCategory: (name: string) => add('categories', name),
    deleteCategory: (id: string) => remove('categories', id),
    // Prefixed so an income category id can never collide with an expense one.
    addIncomeCategory: (name: string) => add('incomeCategories', name, 'inc-'),
    deleteIncomeCategory: (id: string) => remove('incomeCategories', id),
  }), [add, remove]);
}
