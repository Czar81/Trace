import { es } from './es';
import { en } from './en';
import { resolveLanguage, translate, isLanguagePreference } from './index';

describe('dictionaries', () => {
  it('have identical key sets', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('have no empty values', () => {
    for (const [key, value] of [...Object.entries(es), ...Object.entries(en)]) {
      expect([key, typeof value]).toEqual([key, 'string']);
    }
  });

  it('use the same {placeholders} in both languages', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      expect([key, placeholders(en[key])]).toEqual([key, placeholders(es[key])]);
    }
  });
});

describe('resolveLanguage', () => {
  it('honors an explicit choice regardless of the device locale', () => {
    expect(resolveLanguage('en', 'es-CR')).toBe('en');
    expect(resolveLanguage('es', 'en-US')).toBe('es');
  });

  it('follows the device language for "system" when supported', () => {
    expect(resolveLanguage('system', 'en-US')).toBe('en');
    expect(resolveLanguage('system', 'en_GB')).toBe('en');
    expect(resolveLanguage('system', 'es-CR')).toBe('es');
  });

  it('falls back to Spanish for "system" with an unsupported or empty locale', () => {
    expect(resolveLanguage('system', 'fr-FR')).toBe('es');
    expect(resolveLanguage('system', '')).toBe('es');
  });
});

describe('translate', () => {
  it('returns the entry from the given dictionary', () => {
    expect(translate(en, 'common.cancel')).toBe('Cancel');
    expect(translate(es, 'common.cancel')).toBe('Cancelar');
  });

  it('falls back to Spanish when the key is missing in the dictionary', () => {
    const { 'common.cancel': _omitted, ...incomplete } = en;
    expect(translate(incomplete, 'common.cancel')).toBe('Cancelar');
  });

  it('fills {params} and leaves unknown placeholders untouched', () => {
    expect(translate(en, 'settings.cutoffOn', { day: 5 })).toBe('Ignores expenses before day 5 of each month');
    expect(translate(en, 'settings.cutoffOn', {})).toContain('{day}');
  });
});

describe('isLanguagePreference', () => {
  it('accepts supported values only', () => {
    expect(['es', 'en', 'system'].every(isLanguagePreference)).toBe(true);
    expect(isLanguagePreference('fr')).toBe(false);
    expect(isLanguagePreference(null)).toBe(false);
  });
});

describe('localized cadence labels', () => {
  const { formatCadence } = require('../domain/recurring/recurrence');
  const template = { frequency: 'weekly', dayOfWeek: 1 };

  it('defaults to Spanish and follows the given translator', () => {
    expect(formatCadence(template)).toBe('Cada lunes');
    expect(formatCadence(template, (key: any, params: any) => translate(en, key, params))).toBe('Every Monday');
  });
});
