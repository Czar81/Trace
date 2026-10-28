import { getUnallocated, parseAmount, splitEqually, toInputString } from './allocation';

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

describe('splitEqually', () => {
  it('gives leftover cents to the last parts and always sums to the total', () => {
    expect(splitEqually(100, 3)).toEqual([33.33, 33.33, 33.34]);
    expect(splitEqually(100, 4)).toEqual([25, 25, 25, 25]);
    expect(getUnallocated(100, splitEqually(100, 3))).toBe(0);
  });

  it('puts every leftover cent on the last parts for other sizes', () => {
    expect(splitEqually(0.05, 3)).toEqual([0.01, 0.02, 0.02]);
    expect(splitEqually(56, 3)).toEqual([18.66, 18.67, 18.67]);
    expect(getUnallocated(56, splitEqually(56, 3))).toBe(0);
  });

  it('returns nothing for zero parts', () => {
    expect(splitEqually(50, 0)).toEqual([]);
  });
});
