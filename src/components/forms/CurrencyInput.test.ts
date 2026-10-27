jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { parseCurrencyInput } from './CurrencyInput';

describe('parseCurrencyInput', () => {
  it('reads a typed comma as the decimal point', () => {
    expect(parseCurrencyInput('12,', '12')).toBe('12.');
    expect(parseCurrencyInput('12.5', '12.')).toBe('12.5');
  });

  it('keeps thousands separators out of the raw value', () => {
    expect(parseCurrencyInput('1,2345', '1234')).toBe('12345');
    expect(parseCurrencyInput('1,234,', '1234')).toBe('1234.');
  });

  it('does not turn a separator into a decimal point when a digit is deleted', () => {
    expect(parseCurrencyInput('1,23', '1234')).toBe('123');
  });

  it('reads a pasted "12,50" as twelve and a half', () => {
    expect(parseCurrencyInput('12,50', '')).toBe('12.50');
    expect(parseCurrencyInput('1,250', '')).toBe('1250');
  });

  it('ignores a second decimal point', () => {
    expect(parseCurrencyInput('12.5,', '12.5')).toBe('12.5');
  });
});
