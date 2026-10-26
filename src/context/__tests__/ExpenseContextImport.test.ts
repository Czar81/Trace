jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../utils/importData', () => ({
  pickAndImportBackup: jest.fn(),
}));

import { setActiveLanguage } from '../../i18n';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { pickAndImportBackup } from '../../utils/importData';
import { AppProvider, useAppData } from '../ExpenseContext';
import { DEFAULT_SETTINGS, DEFAULT_INCOME_CATEGORIES } from '../../utils/storage';
import { FullBackup } from '../../utils/importData';

const mockedPickAndImport = pickAndImportBackup as jest.MockedFunction<typeof pickAndImportBackup>;

const backupWithoutIncomeCategories: FullBackup = {
  envelopes: [],
  transactions: [],
  paymentMethods: [],
  categories: [{ id: '1', name: 'Comida' }],
  settings: DEFAULT_SETTINGS,
  exportedAt: '2026-01-01T00:00:00.000Z',
  version: '1.0',
};

describe('importFromBackup and income categories', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(AppProvider, null, children);

  it('keeps the current income catalog and reports income categories when the backup omits them', async () => {
    mockedPickAndImport.mockResolvedValue({
      backup: backupWithoutIncomeCategories,
      errors: [],
    });

    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.incomeCategories).toEqual(DEFAULT_INCOME_CATEGORIES));

    let message = '';
    await act(async () => {
      const res = await result.current.importFromBackup();
      message = res.message;
    });

    expect(message).toContain('categorías de ingreso');
    expect(result.current.incomeCategories).toEqual(DEFAULT_INCOME_CATEGORIES);
  });

  it('applies income categories when the backup carries them', async () => {
    mockedPickAndImport.mockResolvedValue({
      backup: { ...backupWithoutIncomeCategories, incomeCategories: [{ id: 'inc-9', name: 'Premios' }] },
      errors: [],
    });

    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.incomeCategories).toEqual(DEFAULT_INCOME_CATEGORIES));

    await act(async () => {
      await result.current.importFromBackup();
    });

    expect(result.current.incomeCategories).toEqual([{ id: 'inc-9', name: 'Premios' }]);
  });

  it('reports the restore result in English when the active language is English', async () => {
    mockedPickAndImport.mockResolvedValue({ backup: backupWithoutIncomeCategories, errors: [] });
    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.incomeCategories.length).toBeGreaterThan(0));

    setActiveLanguage('en');
    try {
      let message = '';
      await act(async () => { message = (await result.current.importFromBackup()).message; });
      expect(message).toMatch(/^Backup restored: .* income categories/);
    } finally {
      setActiveLanguage('es');
    }
  });
});
