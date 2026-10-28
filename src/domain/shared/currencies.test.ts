import { CURRENCIES, CURRENCY_CODES, currencyLabel, getCurrencyInfo, isCurrencyCode } from './currencies';
import { formatCurrency, getCurrencySymbol } from './formatCurrency';

describe('currencies', () => {
  it('has unique codes and unique symbols', () => {
    expect(new Set(CURRENCY_CODES).size).toBe(CURRENCIES.length);
    expect(new Set(CURRENCIES.map(c => c.symbol)).size).toBe(CURRENCIES.length);
  });

  it('keeps the original three first (report/total ordering)', () => {
    expect(CURRENCY_CODES.slice(0, 3)).toEqual(['CRC', 'USD', 'EUR']);
  });

  it('has es and en names for every currency', () => {
    for (const c of CURRENCIES) {
      expect(c.name.es.length).toBeGreaterThan(0);
      expect(c.name.en.length).toBeGreaterThan(0);
    }
  });

  it('validates codes', () => {
    expect(isCurrencyCode('MXN')).toBe(true);
    expect(isCurrencyCode('XXX')).toBe(false);
    expect(isCurrencyCode(undefined)).toBe(false);
  });

  it('builds localized labels', () => {
    expect(currencyLabel('MXN', 'es')).toBe('MX$ MXN — Peso mexicano');
    expect(currencyLabel('GBP', 'en')).toBe('£ GBP — British pound');
  });

  it('falls back to CRC for unknown codes', () => {
    expect(getCurrencyInfo('ZZZ').code).toBe('CRC');
  });
});

describe('formatCurrency with extended list', () => {
  it('keeps two decimals for regular currencies', () => {
    expect(formatCurrency(12500.5, 'CRC')).toBe('₡12,500.50');
    expect(formatCurrency(-3.2, 'MXN')).toBe('-MX$3.20');
    expect(formatCurrency(10, 'GBP')).toBe('£10.00');
  });

  it('uses zero decimals for JPY, CLP, KRW and PYG', () => {
    expect(formatCurrency(1234.6, 'JPY')).toBe('¥1,235');
    expect(formatCurrency(50000, 'CLP')).toBe('CLP$50,000');
  });

  it('exposes symbols', () => {
    expect(getCurrencySymbol('BRL')).toBe('R$');
    expect(getCurrencySymbol('COP')).toBe('COL$');
  });
});
