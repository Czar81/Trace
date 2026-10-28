jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockWrite = jest.fn();
const mockReadDir = jest.fn().mockResolvedValue([]);
const mockDelete = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  writeAsStringAsync: (...args: any[]) => mockWrite(...args),
  readDirectoryAsync: (...args: any[]) => mockReadDir(...args),
  deleteAsync: (...args: any[]) => mockDelete(...args),
  readAsStringAsync: jest.fn(),
  EncodingType: { UTF8: 'utf8' },
}));
const mockIsAvailable = jest.fn().mockResolvedValue(true);
const mockShare = jest.fn();
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsAvailable(),
  shareAsync: (...args: any[]) => mockShare(...args),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

import { BackupData, exportBackupJson } from './exportData';
import { parseBackup } from './importData';
import { DEFAULT_SETTINGS } from '../storage/storage';
import { RecurringTransactionTemplate } from '../../types';

const data = (overrides: Partial<BackupData> = {}): BackupData => ({
  envelopes: [], transactions: [], paymentMethods: [], categories: [], incomeCategories: [], recurringTemplates: [],
  settings: DEFAULT_SETTINGS,
  ...overrides,
});

beforeEach(() => {
  mockWrite.mockClear();
  mockDelete.mockClear();
  mockShare.mockClear();
});

describe('export -> parse round trip with income categories', () => {
  it('keeps incomeCategories and income transaction categoryId', async () => {
    const incomeCategories = [{ id: 'inc-1', name: 'Salario' }, { id: 'inc-99', name: 'Premios' }];
    const categories = [{ id: '1', name: 'Comida' }];
    const transactions: any[] = [
      { id: 't1', envelopeId: 'e1', type: 'income', amount: 500, description: 'Pago', date: '2026-01-01T00:00:00.000Z', categoryId: 'inc-99', isArchived: false },
      { id: 't2', envelopeId: 'e1', type: 'expense', amount: 20, description: 'Pan', date: '2026-01-02T00:00:00.000Z', categoryId: '1', isArchived: false },
    ];

    await exportBackupJson(data({ transactions, categories, incomeCategories }));

    expect(mockWrite).toHaveBeenCalledTimes(1);
    const json = mockWrite.mock.calls[0][1] as string;
    const { backup, errors } = parseBackup(json);

    expect(errors).toEqual([]);
    expect(backup.incomeCategories).toEqual(incomeCategories);
    expect(backup.categories).toEqual(categories);
    expect(backup.transactions.find(t => t.id === 't1')?.categoryId).toBe('inc-99');
    expect(backup.transactions.find(t => t.id === 't2')?.categoryId).toBe('1');
  });

  it('carries recurring templates, without device-only reminder ids', async () => {
    const envelopes: any[] = [{ id: 'e1', name: 'Casa', type: 'gasto', currency: 'CRC', limit: 1000, isUnlimited: false, icon: 'home', color: '#fff' }];
    const template: RecurringTransactionTemplate = {
      id: 'r1', envelopeId: 'e1', type: 'expense', amount: 50, description: 'Internet', frequency: 'monthly', dayOfMonth: 3,
      isActive: true, lastGeneratedPeriod: '2026-01', reminderNotificationId: 'notif-1', lastReminderScheduledPeriod: '2026-02',
    };

    await exportBackupJson(data({ envelopes, recurringTemplates: [template] }));
    const { backup, errors } = parseBackup(mockWrite.mock.calls[0][1]);

    expect(errors).toEqual([]);
    expect(backup.recurringTemplates).toEqual([{ ...template, reminderNotificationId: null, lastReminderScheduledPeriod: null }]);
  });
});

describe('manual export output', () => {
  it('matches the full-backup shape exactly', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-03T04:05:06.000Z'));
    const incomeCategories = [{ id: 'inc-1', name: 'Salario' }];

    await exportBackupJson(data({ incomeCategories }));
    jest.useRealTimers();

    const json = mockWrite.mock.calls[0][1] as string;
    expect(json).toBe(JSON.stringify({
      envelopes: [],
      transactions: [],
      paymentMethods: [],
      categories: [],
      incomeCategories,
      recurringTemplates: [],
      settings: DEFAULT_SETTINGS,
      exportedAt: '2026-02-03T04:05:06.000Z',
      version: '1.0',
    }, null, 2));
  });

  it('deletes earlier export files, keeping automatic backups', async () => {
    mockReadDir.mockResolvedValueOnce(['trace_backup_1.json', 'trace-auto-backup-2026.json', 'other.txt']);
    await exportBackupJson(data());
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith('file:///docs/trace_backup_1.json', { idempotent: true });
  });

  it('rejects when the file cannot be shared', async () => {
    mockIsAvailable.mockResolvedValueOnce(false);
    await expect(exportBackupJson(data())).rejects.toThrow();
  });

  it('rejects when the file cannot be written', async () => {
    mockWrite.mockRejectedValueOnce(new Error('disk full'));
    await expect(exportBackupJson(data())).rejects.toThrow('disk full');
    expect(mockShare).not.toHaveBeenCalled();
  });
});
