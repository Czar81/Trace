jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { parseBackup } from './importData';

const baseBackup = {
  envelopes: [],
  transactions: [],
  paymentMethods: [],
  categories: [{ id: '1', name: 'Comida' }],
  settings: {},
  exportedAt: '2026-01-01T00:00:00.000Z',
  version: '1.0',
};

describe('parseBackup income categories', () => {
  it('leaves incomeCategories undefined when the backup omits it (pre-change backup)', () => {
    const result = parseBackup(JSON.stringify(baseBackup));

    expect(result.errors).toEqual([]);
    expect(result.backup.incomeCategories).toBeUndefined();
  });

  it('carries incomeCategories through when the backup includes it', () => {
    const result = parseBackup(JSON.stringify({
      ...baseBackup,
      incomeCategories: [{ id: 'inc-1', name: 'Salario' }],
    }));

    expect(result.errors).toEqual([]);
    expect(result.backup.incomeCategories).toEqual([{ id: 'inc-1', name: 'Salario' }]);
  });

  it('rejects a backup whose incomeCategories is present but not an array', () => {
    const result = parseBackup(JSON.stringify({
      ...baseBackup,
      incomeCategories: 'nope',
    }));

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.backup.incomeCategories).toBeUndefined();
  });
});

describe('parseBackup themeId', () => {
  it('round-trips a themeId through an export-shaped backup', () => {
    const result = parseBackup(JSON.stringify({ ...baseBackup, settings: { themeId: 'lavanda' } }));

    expect(result.errors).toEqual([]);
    expect(result.backup.settings.themeId).toBe('lavanda');
  });

  it('falls back to Medianoche when an older backup has no themeId', () => {
    const result = parseBackup(JSON.stringify({ ...baseBackup, settings: { defaultCurrency: 'CRC' } }));

    expect(result.errors).toEqual([]);
    expect(result.backup.settings.themeId).toBe('midnight');
  });
});

describe('parseBackup validation messages in English', () => {
  const { setActiveLanguage } = require('../i18n');
  afterEach(() => setActiveLanguage('es'));

  it('translates errors using the active language', () => {
    setActiveLanguage('en');
    expect(parseBackup('{bad').errors).toEqual(['The file is not a valid backup (corrupt JSON).']);
    expect(parseBackup('{}').errors[0]).toMatch(/^Invalid backup format\. Required/);
  });
});

describe('parseBackup validation messages in English', () => {
  const { setActiveLanguage } = require('../i18n');
  afterEach(() => setActiveLanguage('es'));

  it('translates errors using the active language', () => {
    setActiveLanguage('en');
    expect(parseBackup('{bad').errors).toEqual(['The file is not a valid backup (corrupt JSON).']);
    expect(parseBackup('{}').errors[0]).toMatch(/^Invalid backup format\. Required/);
  });
});

describe('parseBackup validation', () => {
  const envelope = { id: 'e1', name: 'Casa', type: 'gasto', currency: 'CRC', limit: 100, isUnlimited: false, icon: 'x', color: '#000' };

  it('rejects envelopes with an unknown type or currency', () => {
    const result = parseBackup(JSON.stringify({ ...baseBackup, envelopes: [{ ...envelope, currency: 'MXN' }] }));
    expect(result.errors).toHaveLength(1);
  });

  it('rejects transactions without a valid date', () => {
    const result = parseBackup(JSON.stringify({
      ...baseBackup,
      envelopes: [envelope],
      transactions: [{ id: 't', envelopeId: 'e1', type: 'expense', amount: 1, date: 'yesterday' }],
    }));
    expect(result.errors).toHaveLength(1);
  });

  it('replaces malformed settings fields with defaults and keeps unknown ones', () => {
    const result = parseBackup(JSON.stringify({
      ...baseBackup,
      settings: { defaultCurrency: 'XYZ', billReminderLeadDays: 'two', exchangeRates: { USD_TO_CRC: -1 }, futureFlag: true },
    }));
    expect(result.errors).toEqual([]);
    expect(result.backup.settings.defaultCurrency).toBe('CRC');
    expect(result.backup.settings.billReminderLeadDays).toBe(2);
    expect(result.backup.settings.exchangeRates.USD_TO_CRC).toBe(510);
    expect((result.backup.settings as any).futureFlag).toBe(true);
  });

  it('keeps recurring templates whose envelope is in the backup', () => {
    const tpl = { id: 'r', envelopeId: 'e1', type: 'expense', amount: 5, description: 'x', frequency: 'monthly', dayOfMonth: 1, isActive: true };
    const result = parseBackup(JSON.stringify({
      ...baseBackup,
      envelopes: [envelope],
      recurringTemplates: [tpl, { ...tpl, id: 'orphan', envelopeId: 'nope' }],
    }));
    expect(result.errors).toEqual([]);
    expect(result.backup.recurringTemplates?.map(t => t.id)).toEqual(['r']);
  });
});
