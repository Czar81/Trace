jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockSchedule = jest.fn();
const mockCancel = jest.fn();
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a: any[]) => mockSchedule(...a),
  cancelScheduledNotificationAsync: (...a: any[]) => mockCancel(...a),
  requestPermissionsAsync: jest.fn(),
}));

jest.mock('../../utils/importData', () => ({
  pickAndImportBackup: jest.fn(),
}));

import React from 'react';
import { Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AppProvider, useAppData } from '../ExpenseContext';
import { pickAndImportBackup, FullBackup } from '../../utils/importData';
import { DEFAULT_SETTINGS } from '../../utils/storage';
import { Envelope, RecurringTransactionTemplate } from '../../types';

const mockedPick = pickAndImportBackup as jest.MockedFunction<typeof pickAndImportBackup>;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AppProvider, null, children);

const envelope = (overrides: Partial<Envelope> = {}): Envelope => ({
  id: 'e1', name: 'Casa', type: 'gasto', currency: 'CRC', limit: 1000, isUnlimited: false, icon: 'home', color: '#fff',
  ...overrides,
});

const template = (overrides: Partial<RecurringTransactionTemplate> = {}): RecurringTransactionTemplate => ({
  id: 'r1', envelopeId: 'e1', type: 'expense', amount: 50, description: 'Internet', frequency: 'monthly', dayOfMonth: 1,
  isActive: true, lastGeneratedPeriod: null, reminderNotificationId: null, lastReminderScheduledPeriod: null,
  ...overrides,
});

const stored = async (key: string) => JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSchedule.mockReset();
  mockCancel.mockReset();
  jest.restoreAllMocks();
});

describe('serialized changes', () => {
  it('keeps a change made before the initial load finishes', async () => {
    await AsyncStorage.setItem('@trace_envelopes', JSON.stringify([envelope()]));
    await AsyncStorage.setItem('@trace_transactions', JSON.stringify([
      { id: 'old', envelopeId: 'e1', type: 'expense', amount: 10, description: 'x', date: new Date().toISOString(), isArchived: false },
    ]));

    const { result } = await renderHook(() => useAppData(), { wrapper });
    await act(async () => {
      await result.current.addTransaction({ envelopeId: 'e1', type: 'expense', amount: 5, description: 'y', date: new Date().toISOString() });
    });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.transactions.map(t => t.id)).toContain('old');
    expect((await stored('@trace_transactions')).length).toBe(2);
  });

  it('keeps both of two changes fired back to back', async () => {
    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      const add = result.current.addTransaction;
      await Promise.all([
        add({ envelopeId: 'e1', type: 'expense', amount: 1, description: 'a', date: new Date().toISOString() }),
        add({ envelopeId: 'e1', type: 'expense', amount: 2, description: 'b', date: new Date().toISOString() }),
      ]);
    });

    expect(result.current.transactions).toHaveLength(2);
    expect(new Set(result.current.transactions.map(t => t.id)).size).toBe(2);
  });

  it('rounds amounts to cents', async () => {
    const { result } = await renderHook(() => useAppData(), { wrapper });
    await act(async () => {
      await result.current.addTransaction({ envelopeId: 'e1', type: 'income', amount: 0.1 + 0.2, description: 'a', date: new Date().toISOString() });
    });
    expect(result.current.transactions[0].amount).toBe(0.3);
  });
});

describe('failed load', () => {
  it('never overwrites stored data it could not read', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await AsyncStorage.setItem('@trace_envelopes', '{corrupt');

    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(Alert.alert).toHaveBeenCalled();

    await act(async () => {
      await result.current.addEnvelope({ name: 'Nuevo', type: 'gasto', currency: 'CRC', limit: 0, isUnlimited: false, icon: 'x', color: '#000' });
    });
    expect(await AsyncStorage.getItem('@trace_envelopes')).toBe('{corrupt');
  });
});

describe('recurring generation while running', () => {
  it('generates what came due when the app returns to the foreground', async () => {
    let onChange: (state: string) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler: any) => {
      onChange = handler;
      return { remove: jest.fn() } as any;
    });
    // Weekly on today's weekday, last generated a week ago.
    const today = new Date();
    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    await AsyncStorage.setItem('@trace_envelopes', JSON.stringify([envelope()]));
    await AsyncStorage.setItem('@trace_recurring_templates', JSON.stringify([
      template({ frequency: 'weekly', dayOfWeek: today.getDay(), lastGeneratedPeriod: null, activeSince: new Date(2999, 0, 1).toISOString() }),
    ]));

    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.transactions).toHaveLength(0);

    // The template became active a week ago while the app sat in the background.
    await act(async () => {
      await result.current.updateRecurringTemplate('r1', { activeSince: lastWeek.toISOString() });
    });
    expect(result.current.transactions).toHaveLength(0);
    await act(async () => {
      onChange('active');
      await new Promise(r => setTimeout(r, 0));
    });

    await waitFor(() => expect(result.current.transactions.length).toBe(2));
  });
});

describe('reminders', () => {
  it('cancels pending reminders when they are turned off', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 20);
    await AsyncStorage.setItem('@trace_envelopes', JSON.stringify([envelope()]));
    await AsyncStorage.setItem('@trace_settings', JSON.stringify({ ...DEFAULT_SETTINGS, billRemindersEnabled: true }));
    await AsyncStorage.setItem('@trace_recurring_templates', JSON.stringify([
      template({ frequency: 'weekly', dayOfWeek: future.getDay(), activeSince: future.toISOString(), reminderNotificationId: 'n-1', lastReminderScheduledPeriod: 'x' }),
    ]));

    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.updateSettings({ billRemindersEnabled: false });
    });
    expect(mockCancel).toHaveBeenCalledWith('n-1');
    expect(result.current.recurringTemplates[0].reminderNotificationId).toBeNull();
  });

  it('reschedules a template reminder when only its amount changes', async () => {
    mockSchedule.mockResolvedValue('n-2');
    await AsyncStorage.setItem('@trace_envelopes', JSON.stringify([envelope()]));
    await AsyncStorage.setItem('@trace_settings', JSON.stringify({ ...DEFAULT_SETTINGS, billRemindersEnabled: true, billReminderLeadDays: 1 }));
    const inTenDays = new Date();
    inTenDays.setDate(inTenDays.getDate() + 10);
    await AsyncStorage.setItem('@trace_recurring_templates', JSON.stringify([
      template({ frequency: 'weekly', dayOfWeek: inTenDays.getDay(), activeSince: new Date().toISOString(), reminderNotificationId: 'n-1', lastReminderScheduledPeriod: 'stale' }),
    ]));

    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    mockSchedule.mockClear();

    await act(async () => {
      await result.current.updateRecurringTemplate('r1', { amount: 75 });
    });
    expect(mockCancel).toHaveBeenCalled();
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule.mock.calls[0][0].content.body).toContain('75');
  });
});

describe('import', () => {
  const backup = (overrides: Partial<FullBackup> = {}): FullBackup => ({
    envelopes: [envelope({ id: 'b1' })], transactions: [], paymentMethods: [], categories: [],
    settings: DEFAULT_SETTINGS, exportedAt: '2026-01-01T00:00:00.000Z', version: '1.0',
    ...overrides,
  });

  it('restores templates from the backup and cancels the device reminders', async () => {
    await AsyncStorage.setItem('@trace_envelopes', JSON.stringify([envelope()]));
    await AsyncStorage.setItem('@trace_recurring_templates', JSON.stringify([template({ reminderNotificationId: 'n-old' })]));
    mockedPick.mockResolvedValue({ backup: backup({ recurringTemplates: [template({ id: 'rb', envelopeId: 'b1', activeSince: new Date(2999, 0, 1).toISOString() })] }), errors: [] });

    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    await act(async () => { await result.current.importFromBackup(); });

    expect(mockCancel).toHaveBeenCalledWith('n-old');
    expect(result.current.recurringTemplates.map(t => t.id)).toEqual(['rb']);
    expect((await stored('@trace_recurring_templates')).map((t: any) => t.id)).toEqual(['rb']);
  });

  it('drops device templates whose envelope is not in an older backup', async () => {
    await AsyncStorage.setItem('@trace_recurring_templates', JSON.stringify([
      template({ id: 'keep', envelopeId: 'b1', activeSince: new Date(2999, 0, 1).toISOString() }),
      template({ id: 'orphan', envelopeId: 'gone' }),
    ]));
    mockedPick.mockResolvedValue({ backup: backup(), errors: [] });

    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    await act(async () => { await result.current.importFromBackup(); });

    expect(result.current.recurringTemplates.map(t => t.id)).toEqual(['keep']);
  });

  it('reports a failure, not a cancellation, when the file cannot be read', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedPick.mockRejectedValue(new Error('permission denied'));
    const { result } = await renderHook(() => useAppData(), { wrapper });
    let response: any;
    await act(async () => { response = await result.current.importFromBackup(); });
    expect(response.success).toBe(false);
    expect(response.message).toBe('No se pudo importar el backup. Verifica que el archivo sea válido.');
  });
});

describe('deleteEnvelope', () => {
  it('keeps the other envelopes balances and removes its templates', async () => {
    await AsyncStorage.setItem('@trace_envelopes', JSON.stringify([envelope({ id: 'a' }), envelope({ id: 'b', type: 'ahorro' })]));
    const date = new Date().toISOString();
    await AsyncStorage.setItem('@trace_transactions', JSON.stringify([
      { id: 't1', envelopeId: 'a', toEnvelopeId: 'b', type: 'transfer', amount: 100, description: 'x', date, isArchived: false },
      { id: 't2', envelopeId: 'b', type: 'income', amount: 40, description: 'x', date, isArchived: false },
    ]));
    await AsyncStorage.setItem('@trace_recurring_templates', JSON.stringify([template({ id: 'rb', envelopeId: 'b', activeSince: new Date(2999, 0, 1).toISOString() })]));

    const { result } = await renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const before = result.current.getEnvelopeBalance('a');

    await act(async () => { await result.current.deleteEnvelope('b'); });

    expect(result.current.getEnvelopeBalance('a')).toBe(before);
    expect(result.current.transactions.map(t => t.id)).toEqual(['t1']);
    expect(result.current.recurringTemplates).toEqual([]);
  });
});
