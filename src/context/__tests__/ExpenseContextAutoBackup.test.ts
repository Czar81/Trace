jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockWrite = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  writeAsStringAsync: (...a: any[]) => mockWrite(...a),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  deleteAsync: jest.fn(),
  EncodingType: { UTF8: 'utf8' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';
import { AppProvider, useAppData } from '../ExpenseContext';
import { saveAutoBackupEnabled, saveAutoBackupIntervalDays } from '../../services/storage';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AppProvider, null, children);

describe('automatic backup on startup', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockWrite.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('does nothing while disabled (default)', async () => {
    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.transactions).toEqual([]));
    await new Promise(r => setTimeout(r, 50));
    expect(mockWrite).not.toHaveBeenCalled();
    expect(result.current.autoBackup.enabled).toBe(false);
  });

  it('creates a backup when enabled and due, recording success', async () => {
    await saveAutoBackupEnabled(true);
    await saveAutoBackupIntervalDays(7);

    const { result } = await renderHook(() => useAppData(), { wrapper });

    await waitFor(() => expect(result.current.autoBackup.lastSuccessAt).not.toBeNull());
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(result.current.autoBackup.lastError).toBeNull();
  });

  it('records the error and still loads when the write fails', async () => {
    mockWrite.mockRejectedValue(new Error('disk full'));
    await saveAutoBackupEnabled(true);

    const { result } = await renderHook(() => useAppData(), { wrapper });

    await waitFor(() => expect(result.current.autoBackup.lastError).toBe('disk full'));
    expect(result.current.autoBackup.lastSuccessAt).toBeNull();
    expect(result.current.paymentMethods.length).toBeGreaterThan(0);
    expect(await AsyncStorage.getItem('@trace_auto_backup_last_error')).toBe(JSON.stringify('disk full'));
  });
});
