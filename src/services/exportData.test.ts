jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { UTF8: 'utf8' },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  shareAsync: jest.fn(),
}));

import { buildFullBackupJson } from './exportData';
import { DEFAULT_SETTINGS } from './storage';

describe('buildFullBackupJson', () => {
  it('keeps the backup shape unchanged and excludes the language preference', () => {
    const json = buildFullBackupJson({
      envelopes: [], transactions: [], paymentMethods: [], categories: [], incomeCategories: [], recurringTemplates: [], settings: DEFAULT_SETTINGS,
    }, new Date('2026-01-01T00:00:00.000Z'));
    const parsed = JSON.parse(json);

    expect(Object.keys(parsed).sort()).toEqual([
      'categories',
      'envelopes',
      'exportedAt',
      'incomeCategories',
      'paymentMethods',
      'recurringTemplates',
      'settings',
      'transactions',
      'version',
    ]);
    expect(Object.keys(parsed.settings)).not.toContain('language');
    expect(json).not.toContain('@trace_language');
  });
});
