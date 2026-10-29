/**
 * Single source of truth for supported currencies. To add one, append an entry
 * here: the Currency type, formatting, selectors and backup validation follow.
 * Symbols are kept distinct between currencies that share "$".
 */
export const CURRENCIES = [
  { code: 'CRC', symbol: '₡', decimals: 2, name: { es: 'Colón costarricense', en: 'Costa Rican colón' } },
  { code: 'USD', symbol: '$', decimals: 2, name: { es: 'Dólar estadounidense', en: 'US dollar' } },
  { code: 'EUR', symbol: '€', decimals: 2, name: { es: 'Euro', en: 'Euro' } },
  { code: 'MXN', symbol: 'MX$', decimals: 2, name: { es: 'Peso mexicano', en: 'Mexican peso' } },
  { code: 'COP', symbol: 'COL$', decimals: 2, name: { es: 'Peso colombiano', en: 'Colombian peso' } },
  { code: 'ARS', symbol: 'AR$', decimals: 2, name: { es: 'Peso argentino', en: 'Argentine peso' } },
  { code: 'CLP', symbol: 'CLP$', decimals: 0, name: { es: 'Peso chileno', en: 'Chilean peso' } },
  { code: 'UYU', symbol: '$U', decimals: 2, name: { es: 'Peso uruguayo', en: 'Uruguayan peso' } },
  { code: 'DOP', symbol: 'RD$', decimals: 2, name: { es: 'Peso dominicano', en: 'Dominican peso' } },
  { code: 'PEN', symbol: 'S/', decimals: 2, name: { es: 'Sol peruano', en: 'Peruvian sol' } },
  { code: 'BRL', symbol: 'R$', decimals: 2, name: { es: 'Real brasileño', en: 'Brazilian real' } },
  { code: 'BOB', symbol: 'Bs.', decimals: 2, name: { es: 'Boliviano', en: 'Bolivian boliviano' } },
  { code: 'PYG', symbol: '₲', decimals: 0, name: { es: 'Guaraní paraguayo', en: 'Paraguayan guaraní' } },
  { code: 'GTQ', symbol: 'Q', decimals: 2, name: { es: 'Quetzal guatemalteco', en: 'Guatemalan quetzal' } },
  { code: 'HNL', symbol: 'L', decimals: 2, name: { es: 'Lempira hondureño', en: 'Honduran lempira' } },
  { code: 'NIO', symbol: 'C$', decimals: 2, name: { es: 'Córdoba nicaragüense', en: 'Nicaraguan córdoba' } },
  { code: 'PAB', symbol: 'B/.', decimals: 2, name: { es: 'Balboa panameño', en: 'Panamanian balboa' } },
  { code: 'VES', symbol: 'Bs.S', decimals: 2, name: { es: 'Bolívar venezolano', en: 'Venezuelan bolívar' } },
  { code: 'CAD', symbol: 'CA$', decimals: 2, name: { es: 'Dólar canadiense', en: 'Canadian dollar' } },
  { code: 'GBP', symbol: '£', decimals: 2, name: { es: 'Libra esterlina', en: 'British pound' } },
  { code: 'CHF', symbol: 'CHF', decimals: 2, name: { es: 'Franco suizo', en: 'Swiss franc' } },
  { code: 'JPY', symbol: '¥', decimals: 0, name: { es: 'Yen japonés', en: 'Japanese yen' } },
  { code: 'CNY', symbol: 'CN¥', decimals: 2, name: { es: 'Yuan chino', en: 'Chinese yuan' } },
  { code: 'KRW', symbol: '₩', decimals: 0, name: { es: 'Won surcoreano', en: 'South Korean won' } },
  { code: 'INR', symbol: '₹', decimals: 2, name: { es: 'Rupia india', en: 'Indian rupee' } },
  { code: 'AUD', symbol: 'A$', decimals: 2, name: { es: 'Dólar australiano', en: 'Australian dollar' } },
  { code: 'NZD', symbol: 'NZ$', decimals: 2, name: { es: 'Dólar neozelandés', en: 'New Zealand dollar' } },
  { code: 'SEK', symbol: 'kr', decimals: 2, name: { es: 'Corona sueca', en: 'Swedish krona' } },
  { code: 'NOK', symbol: 'NOK', decimals: 2, name: { es: 'Corona noruega', en: 'Norwegian krone' } },
  { code: 'DKK', symbol: 'DKK', decimals: 2, name: { es: 'Corona danesa', en: 'Danish krone' } },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

export const CURRENCY_CODES: readonly CurrencyCode[] = CURRENCIES.map(c => c.code);

export const isCurrencyCode = (v: unknown): v is CurrencyCode =>
  typeof v === 'string' && (CURRENCY_CODES as readonly string[]).includes(v);

const BY_CODE = new Map<string, (typeof CURRENCIES)[number]>(CURRENCIES.map(c => [c.code, c]));

export const getCurrencyInfo = (code: string) => BY_CODE.get(code) ?? BY_CODE.get('CRC')!;

/** Option label shown in selectors, e.g. "₡ CRC — Colón costarricense". */
export const currencyLabel = (code: CurrencyCode, language: 'es' | 'en'): string => {
  const c = getCurrencyInfo(code);
  return `${c.symbol} ${c.code} — ${c.name[language]}`;
};
