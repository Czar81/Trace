import { getUnallocated, parseAmount, toInputString } from './allocation';

describe('allocation helpers', () => {
  it('parses invalid or negative amounts as 0', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
    expect(parseAmount('-5')).toBe(0);
    expect(parseAmount('12.5')).toBe(12.5);
  });

  it('computes the unallocated remainder without float drift', () => {
    expect(getUnallocated(0.3, [0.1, 0.2])).toBe(0);
    expect(getUnallocated(100, [60, 30])).toBe(10);
    expect(getUnallocated(100, [60, 50])).toBe(-10);
  });

  it('formats remainders for inputs', () => {
    expect(toInputString(0.1 + 0.2)).toBe('0.3');
  });
});
