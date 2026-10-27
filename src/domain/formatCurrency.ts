import { Currency } from '../types';

const SYMBOLS: Record<Currency, string> = {
  CRC: '₡',
  USD: '$',
  EUR: '€',
};

/**
 * Formats a number as a currency string with the correct symbol.
 * e.g. formatCurrency(12500.5, 'CRC') => '₡12,500.50'
 */
export const formatCurrency = (amount: number, currency: Currency = 'CRC'): string => {
  const symbol = SYMBOLS[currency] ?? '₡';
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${formatted}`;
};

/**
 * Returns the currency symbol only.
 */
export const getCurrencySymbol = (currency: Currency): string => SYMBOLS[currency] ?? '₡';
