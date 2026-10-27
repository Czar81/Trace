export const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/USD';

export interface FetchedRates {
  USD_TO_CRC: number;
  EUR_TO_CRC: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Converts an open.er-api.com "latest/USD" payload into the app's CRC-based rates; null when unusable. */
export const parseRatesResponse = (json: any): FetchedRates | null => {
  const crc = json?.rates?.CRC;
  const eur = json?.rates?.EUR;
  if (json?.result !== 'success' || !(crc > 0) || !(eur > 0)) return null;
  return { USD_TO_CRC: round2(crc), EUR_TO_CRC: round2(crc / eur) };
};

export const fetchExchangeRates = async (fetchImpl: typeof fetch = fetch): Promise<FetchedRates | null> => {
  try {
    const res = await fetchImpl(EXCHANGE_RATE_URL);
    if (!res.ok) return null;
    return parseRatesResponse(await res.json());
  } catch {
    return null;
  }
};

export const RATES_STALE_MS = 12 * 60 * 60 * 1000;

export const areRatesStale = (updatedAt: string | undefined, now: number = Date.now()): boolean =>
  !updatedAt || isNaN(Date.parse(updatedAt)) || now - Date.parse(updatedAt) > RATES_STALE_MS;
