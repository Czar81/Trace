import { areRatesStale, fetchExchangeRates, parseRatesResponse } from './exchangeRates';

const ok = { result: 'success', rates: { CRC: 500, EUR: 0.92 } };

describe('exchange rates', () => {
  it('derives USD and EUR rates against CRC', () => {
    expect(parseRatesResponse(ok)).toEqual({ USD_TO_CRC: 500, EUR_TO_CRC: 543.48 });
  });

  it('rejects malformed payloads', () => {
    expect(parseRatesResponse({ result: 'error' })).toBeNull();
    expect(parseRatesResponse({ result: 'success', rates: { CRC: 500 } })).toBeNull();
    expect(parseRatesResponse(null)).toBeNull();
  });

  it('returns null on network failure or bad status', async () => {
    expect(await fetchExchangeRates((async () => { throw new Error('offline'); }) as any)).toBeNull();
    expect(await fetchExchangeRates((async () => ({ ok: false })) as any)).toBeNull();
    expect(await fetchExchangeRates((async () => ({ ok: true, json: async () => ok })) as any)).not.toBeNull();
  });

  it('treats missing or old timestamps as stale', () => {
    const now = Date.parse('2026-10-27T12:00:00Z');
    expect(areRatesStale(undefined, now)).toBe(true);
    expect(areRatesStale('2026-10-27T10:00:00Z', now)).toBe(false);
    expect(areRatesStale('2026-10-26T10:00:00Z', now)).toBe(true);
  });
});
