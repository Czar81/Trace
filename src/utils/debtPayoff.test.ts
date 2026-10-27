import { PayoffDebt, monthlyRate, simulatePayoff } from './debtPayoff';

const debt = (id: string, owed: number, rate: number, min = 0): PayoffDebt => ({
  id, owed, interestRate: rate, interestFrequency: 'mensual', minimumPayment: min,
});

describe('monthlyRate', () => {
  it('converts every frequency to a monthly fraction', () => {
    expect(monthlyRate({ interestRate: 2, interestFrequency: 'mensual' })).toBeCloseTo(0.02);
    expect(monthlyRate({ interestRate: 2, interestFrequency: 'quincenal' })).toBeCloseTo(0.04);
    expect(monthlyRate({ interestRate: 12, interestFrequency: 'anual' })).toBeCloseTo(0.01);
  });
});

describe('simulatePayoff', () => {
  const debts = [debt('small', 100, 1, 10), debt('big', 1000, 5, 20)];

  it('snowball targets the smallest balance first', () => {
    expect(simulatePayoff(debts, 200, 'snowball').order).toEqual(['small', 'big']);
  });

  it('avalanche targets the highest rate first', () => {
    expect(simulatePayoff(debts, 200, 'avalanche').order).toEqual(['big', 'small']);
  });

  it('avalanche never pays more interest than snowball', () => {
    const a = simulatePayoff(debts, 200, 'avalanche');
    const s = simulatePayoff(debts, 200, 'snowball');
    expect(a.totalInterest).toBeLessThanOrEqual(s.totalInterest);
    expect(a.feasible && s.feasible).toBe(true);
  });

  it('pays a zero-interest debt in the expected number of months', () => {
    const r = simulatePayoff([debt('a', 300, 0)], 100, 'snowball');
    expect(r.months).toBe(3);
    expect(r.totalInterest).toBe(0);
    expect(r.payoffMonthById.a).toBe(3);
  });

  it('flags a budget that never covers the interest', () => {
    const r = simulatePayoff([debt('a', 1000, 10)], 50, 'avalanche');
    expect(r.feasible).toBe(false);
  });

  it('ignores debts that are already paid', () => {
    const r = simulatePayoff([debt('a', 0, 10)], 50, 'snowball');
    expect(r.months).toBe(0);
    expect(r.feasible).toBe(true);
  });
});
