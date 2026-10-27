import { validateTransfer } from './transfer';
import { listChanged, newId, dayKey } from './helpers';
import { Envelope } from '../types';

const env = (id: string, currency: Envelope['currency'] = 'CRC'): Envelope => ({
  id, name: id, type: 'gasto', currency, limit: 0, isUnlimited: false, icon: 'x', color: '#000',
});

describe('validateTransfer', () => {
  const envs = [env('a'), env('b'), env('usd', 'USD')];
  it('accepts two envelopes with the same currency', () => expect(validateTransfer(envs, 'a', 'b')).toBeNull());
  it('rejects same, missing and mixed-currency envelopes', () => {
    expect(validateTransfer(envs, 'a', 'a')).toEqual(expect.any(String));
    expect(validateTransfer(envs, 'a', 'nope')).toEqual(expect.any(String));
    expect(validateTransfer(envs, 'a', 'usd')).toEqual(expect.any(String));
  });
});

describe('helpers', () => {
  it('newId never repeats within the same millisecond', () => {
    const ids = new Set(Array.from({ length: 50 }, newId));
    expect(ids.size).toBe(50);
  });
  it('listChanged compares by reference', () => {
    const x = {};
    expect(listChanged([x], [x])).toBe(false);
    expect(listChanged([x], [{}])).toBe(true);
    expect(listChanged([x], [])).toBe(true);
  });
  it('dayKey is the local calendar day', () => expect(dayKey(new Date(2026, 0, 5))).toBe('2026-1-5'));
});
