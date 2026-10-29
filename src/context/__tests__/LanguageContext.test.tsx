jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { LanguageProvider, useTranslation } from '../LanguageContext';
import { loadLanguagePreference } from '../../services/storage/storage';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(LanguageProvider, null, children);

describe('LanguageProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('updates t output on the same hook instance when the preference changes (no remount)', async () => {
    const { result } = await renderHook(() => useTranslation(), { wrapper });
    await act(async () => { await Promise.resolve(); });
    await waitFor(() => expect(result.current).not.toBeNull());

    await act(async () => { await result.current.setPreference('es'); });
    expect(result.current.t('common.cancel')).toBe('Cancelar');

    await act(async () => { await result.current.setPreference('en'); });
    expect(result.current.language).toBe('en');
    expect(result.current.t('common.cancel')).toBe('Cancel');
    expect(result.current.t('bankCsv.toImport', { count: 3 })).toBe('3 transactions to import');

    await act(async () => { await result.current.setPreference('es'); });
    expect(result.current.t('common.cancel')).toBe('Cancelar');
  });

  it('persists the choice and applies it on the next launch', async () => {
    const first = await renderHook(() => useTranslation(), { wrapper });
    await act(async () => { await Promise.resolve(); });
    await waitFor(() => expect(first.result.current).not.toBeNull());
    await act(async () => { await first.result.current.setPreference('en'); });
    await expect(loadLanguagePreference()).resolves.toBe('en');
    await act(async () => { first.unmount(); });

    const second = await renderHook(() => useTranslation(), { wrapper });
    await act(async () => { await Promise.resolve(); });
    await waitFor(() => expect(second.result.current).not.toBeNull());
    expect(second.result.current.preference).toBe('en');
    expect(second.result.current.t('common.cancel')).toBe('Cancel');
  });
});
