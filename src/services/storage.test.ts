jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_INCOME_CATEGORIES,
  loadIncomeCategories,
  saveIncomeCategories,
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  loadReportLayout,
  saveReportLayout,
  loadAutoBackupState,
  saveAutoBackupEnabled,
  saveAutoBackupIntervalDays,
  saveAutoBackupLastSuccessAt,
  saveAutoBackupLastError, saveAutoBackupFolderUri,
  DEFAULT_AUTO_BACKUP_STATE,
  loadLanguagePreference,
  saveLanguagePreference,
  loadMainDisplayCurrency,
  saveMainDisplayCurrency,
  loadReportsDisplayCurrency,
  saveReportsDisplayCurrency,
} from './storage';
import { REPORT_SECTIONS } from '../domain/reports';

describe('income categories storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns the default income categories when nothing has been stored', async () => {
    await expect(loadIncomeCategories()).resolves.toEqual(DEFAULT_INCOME_CATEGORIES);
  });

  it('round-trips a saved income category list', async () => {
    const custom = [{ id: 'inc-99', name: 'Alquiler' }];

    await saveIncomeCategories(custom);

    await expect(loadIncomeCategories()).resolves.toEqual(custom);
  });

  it('keeps income categories under their own key, separate from expense categories', async () => {
    await saveIncomeCategories([{ id: 'inc-99', name: 'Alquiler' }]);

    // The expense categories key must remain untouched.
    expect(await AsyncStorage.getItem('@trace_categories')).toBeNull();
    expect(await AsyncStorage.getItem('@trace_income_categories')).not.toBeNull();
  });
});

describe('settings themeId storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to midnight when nothing is stored', async () => {
    expect((await loadSettings()).themeId).toBe('midnight');
  });

  it('persists a chosen theme across loads', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, themeId: 'arena' });
    expect((await loadSettings()).themeId).toBe('arena');
  });

  it('falls back to midnight for settings stored before themeId existed', async () => {
    const { themeId, ...legacy } = DEFAULT_SETTINGS;
    await AsyncStorage.setItem('@trace_settings', JSON.stringify(legacy));
    expect((await loadSettings()).themeId).toBe('midnight');
  });
});

describe('report layout storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults when nothing is stored', async () => {
    await expect(loadReportLayout()).resolves.toEqual(REPORT_SECTIONS);
  });

  it('round-trips a saved layout', async () => {
    const layout = [
      { id: 'trend' as const, visible: false },
      ...REPORT_SECTIONS.filter(s => s.id !== 'trend'),
    ];

    await saveReportLayout(layout);

    await expect(loadReportLayout()).resolves.toEqual(layout);
  });

  it('falls back to the default when the stored value is corrupted', async () => {
    await AsyncStorage.setItem('@trace_report_layout', '{oops');

    await expect(loadReportLayout()).resolves.toEqual(REPORT_SECTIONS);
  });
});

describe('automatic backup state storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to disabled with a 7-day interval and no history', async () => {
    await expect(loadAutoBackupState()).resolves.toEqual(DEFAULT_AUTO_BACKUP_STATE);
    expect(DEFAULT_AUTO_BACKUP_STATE).toEqual({ enabled: false, intervalDays: 7, lastSuccessAt: null, lastError: null, folderUri: null });
  });

  it('round-trips every field', async () => {
    await saveAutoBackupEnabled(true);
    await saveAutoBackupIntervalDays(15);
    await saveAutoBackupLastSuccessAt('2026-01-01T00:00:00.000Z');
    await saveAutoBackupLastError('disk full');
    await saveAutoBackupFolderUri('content://tree/primary%3ADocuments');

    await expect(loadAutoBackupState()).resolves.toEqual({
      enabled: true,
      intervalDays: 15,
      lastSuccessAt: '2026-01-01T00:00:00.000Z',
      lastError: 'disk full',
      folderUri: 'content://tree/primary%3ADocuments',
    });
  });
});

describe('language preference storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to "system" when nothing is stored', async () => {
    await expect(loadLanguagePreference()).resolves.toBe('system');
  });

  it('round-trips each supported preference under its own key', async () => {
    for (const value of ['en', 'es', 'system'] as const) {
      await saveLanguagePreference(value);
      await expect(loadLanguagePreference()).resolves.toBe(value);
    }
    expect(await AsyncStorage.getItem('@trace_language')).toBe(JSON.stringify('system'));
  });

  it('falls back to "system" for an unsupported stored value', async () => {
    await AsyncStorage.setItem('@trace_language', JSON.stringify('fr'));
    await expect(loadLanguagePreference()).resolves.toBe('system');
  });

  it('is not part of the settings object', async () => {
    await saveLanguagePreference('en');
    expect(Object.keys(await loadSettings())).not.toContain('language');
  });
});

describe('main display currency storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('is null when nothing is stored', async () => {
    await expect(loadMainDisplayCurrency()).resolves.toBeNull();
  });

  it('round-trips each currency', async () => {
    for (const value of ['USD', 'EUR', 'CRC'] as const) {
      await saveMainDisplayCurrency(value);
      await expect(loadMainDisplayCurrency()).resolves.toBe(value);
    }
  });

  it('ignores an unknown stored value', async () => {
    await AsyncStorage.setItem('@trace_main_display_currency', JSON.stringify('GBP'));
    await expect(loadMainDisplayCurrency()).resolves.toBeNull();
  });
});

describe('reports display currency storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('is stored apart from the home total currency', async () => {
    await expect(loadReportsDisplayCurrency()).resolves.toBeNull();
    await saveReportsDisplayCurrency('USD');
    await expect(loadReportsDisplayCurrency()).resolves.toBe('USD');
    await expect(loadMainDisplayCurrency()).resolves.toBeNull();
  });
});
