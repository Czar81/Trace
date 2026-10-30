import { Language } from '../../i18n';

/** Only counts, flags and codes: never amounts, names, notes or categories. */
export interface TechnicalInfoInput {
  language: Language;
  locale: string;
  timezone: string;
  theme: string;
  defaultCurrency: string;
  appLock: boolean;
  autoBackup: boolean;
  envelopes: number;
  transactions: number;
  recurring: number;
  daysSinceFirstOpen: number | null;
  originScreen: string;
  lastError: string | null;
}

const LAST_ERROR_MAX = 300;

/** First line only, cut short: stack traces can carry file paths and values. */
export const sanitizeError = (message: string): string => {
  const firstLine = message.split('\n')[0].trim();
  return firstLine.length > LAST_ERROR_MAX ? `${firstLine.slice(0, LAST_ERROR_MAX)}…` : firstLine;
};

const flag = (value: boolean) => (value ? 'on' : 'off');

export const buildTechnicalInfo = (input: TechnicalInfoInput): string =>
  [
    ['language', input.language],
    ['locale', input.locale],
    ['timezone', input.timezone],
    ['theme', input.theme],
    ['default_currency', input.defaultCurrency],
    ['app_lock', flag(input.appLock)],
    ['auto_backup', flag(input.autoBackup)],
    ['envelopes', String(input.envelopes)],
    ['transactions', String(input.transactions)],
    ['recurring', String(input.recurring)],
    ['days_since_first_open', input.daysSinceFirstOpen == null ? '' : String(input.daysSinceFirstOpen)],
    ['origin_screen', input.originScreen],
    ['last_error', input.lastError ? sanitizeError(input.lastError) : ''],
  ]
    .filter(([, value]) => value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

export const getTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
};

export const daysBetween = (fromIso: string, now: Date): number | null => {
  const from = new Date(fromIso).getTime();
  if (Number.isNaN(from)) return null;
  return Math.max(0, Math.floor((now.getTime() - from) / 86400000));
};
