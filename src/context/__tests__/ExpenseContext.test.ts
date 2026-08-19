import React from 'react';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { AppProvider, useAppData, getCutoffPeriodStart, accrueDebtInterest } from '../ExpenseContext';
import { Envelope, Transaction } from '../../types';

describe('accrueDebtInterest', () => {
  const baseDebtEnvelope = (overrides: Partial<Envelope> = {}): Envelope => ({
    id: 'debt-1',
    name: 'Tarjeta',
    type: 'deuda',
    currency: 'CRC',
    limit: 1000,
    isUnlimited: false,
    icon: 'credit-card',
    color: '#F2A65A',
    interestRate: 10,
    interestFrequency: 'mensual',
    dueDay: 15,
    lastInterestAccrualPeriod: null,
    ...overrides,
  });

  it('charges interest on the amount owed when the cycle is reached', () => {
    const envelope = baseDebtEnvelope();
    // limit 1000, no transactions -> balance 0 -> amount owed 1000 -> 10% = 100
    const now = new Date(2026, 2, 15); // March 15, 2026
    const { updatedEnvelopes, newTransactions } = accrueDebtInterest([envelope], [], now);

    expect(newTransactions).toHaveLength(1);
    expect(newTransactions[0]).toMatchObject({ envelopeId: 'debt-1', type: 'expense', amount: 100, description: 'Interés' });
    expect(updatedEnvelopes[0].lastInterestAccrualPeriod).toBe('2026-03');
  });

  it('does not charge interest before the cycle is reached', () => {
    const envelope = baseDebtEnvelope();
    const now = new Date(2026, 2, 10); // before day 15
    const { updatedEnvelopes, newTransactions } = accrueDebtInterest([envelope], [], now);

    expect(newTransactions).toHaveLength(0);
    expect(updatedEnvelopes[0].lastInterestAccrualPeriod).toBeNull();
  });

  it('does not charge interest twice for the same cycle', () => {
    const envelope = baseDebtEnvelope({ lastInterestAccrualPeriod: '2026-03' });
    const now = new Date(2026, 2, 20); // still within the March cycle
    const { newTransactions } = accrueDebtInterest([envelope], [], now);

    expect(newTransactions).toHaveLength(0);
  });

  it('does not charge interest when the debt is already paid off (amount owed <= 0)', () => {
    const envelope = baseDebtEnvelope();
    const transactions: Transaction[] = [
      { id: 't1', envelopeId: 'debt-1', type: 'income', amount: 1000, description: 'Pago total', date: new Date(2026, 1, 1).toISOString(), isArchived: false },
    ];
    const now = new Date(2026, 2, 15);
    const { updatedEnvelopes, newTransactions } = accrueDebtInterest([envelope], transactions, now);

    expect(newTransactions).toHaveLength(0);
    // Cycle is still marked handled so it isn't re-evaluated every app open.
    expect(updatedEnvelopes[0].lastInterestAccrualPeriod).toBe('2026-03');
  });

  it('does not accrue interest for unlimited debt envelopes, non-deuda envelopes, or envelopes missing rate/frequency/dueDay', () => {
    const now = new Date(2026, 2, 15);
    const envelopes: Envelope[] = [
      baseDebtEnvelope({ id: 'd1', isUnlimited: true }),
      baseDebtEnvelope({ id: 'd2', interestRate: 0 }),
      baseDebtEnvelope({ id: 'd3', dueDay: undefined }),
      { ...baseDebtEnvelope({ id: 'd4' }), type: 'gasto' },
    ];
    const { newTransactions } = accrueDebtInterest(envelopes, [], now);
    expect(newTransactions).toHaveLength(0);
  });
});

describe('getCutoffPeriodStart', () => {
  it('returns this month\'s cutoff day when it falls within the current month and has already passed', () => {
    const now = new Date(2026, 2, 20); // March 20, 2026
    const result = getCutoffPeriodStart(now, 15);
    expect(result).toEqual(new Date(2026, 2, 15, 0, 0, 0, 0));
  });

  it('clamps the cutoff day to the last day of a short month when rolling back into it (e.g. cutoffDay 31, previous month is February)', () => {
    const now = new Date(2026, 2, 1); // March 1, 2026 -> hasn't reached cutoff day 31 yet, rolls back to February
    const result = getCutoffPeriodStart(now, 31);
    // February 2026 has 28 days, so clamp to Feb 28
    expect(result).toEqual(new Date(2026, 1, 28, 0, 0, 0, 0));
  });

  it('rolls back to the previous month when now is before the cutoff day', () => {
    const now = new Date(2026, 3, 5); // April 5, 2026, cutoff day 20 -> previous month is March
    const result = getCutoffPeriodStart(now, 20);
    expect(result).toEqual(new Date(2026, 2, 20, 0, 0, 0, 0));
  });

  it('stays in the current month when now is exactly on or after the cutoff day', () => {
    const now = new Date(2026, 4, 10); // May 10, 2026
    const result = getCutoffPeriodStart(now, 10);
    expect(result).toEqual(new Date(2026, 4, 10, 0, 0, 0, 0));
  });
});

describe('getEnvelopeBalance (via useAppData)', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(AppProvider, null, children);

  const baseEnvelope = (overrides: Partial<Omit<Envelope, 'id'>> & { name: string }): Omit<Envelope, 'id'> => ({
    type: 'gasto',
    currency: 'CRC',
    limit: 0,
    isUnlimited: false,
    icon: 'wallet',
    color: '#000000',
    ...overrides,
  });

  /**
   * addEnvelope generates its own id (Date.now().toString()), ignoring any id passed in,
   * so tests must look up the real generated id by the unique `name` they gave it.
   */
  const findIdByName = (envelopes: Envelope[], name: string): string => {
    const found = envelopes.find(e => e.name === name);
    if (!found) throw new Error(`Envelope with name "${name}" not found`);
    return found.id;
  };

  it('reflects added expenses and income for a gasto envelope with no cutoff', async () => {
    const { result } = await renderHook(() => useAppData(), { wrapper });

    await act(async () => {
      await result.current.addEnvelope(baseEnvelope({ name: 'Gasto No Cutoff', type: 'gasto', limit: 1000 }));
    });
    const id = findIdByName(result.current.envelopes, 'Gasto No Cutoff');

    await act(async () => {
      await result.current.addTransaction({
        envelopeId: id,
        type: 'expense',
        amount: 300,
        description: 'Groceries',
        date: new Date().toISOString(),
      });
    });

    await act(async () => {
      await result.current.addTransaction({
        envelopeId: id,
        type: 'income',
        amount: 100,
        description: 'Refund',
        date: new Date().toISOString(),
      });
    });

    // balance = -300 (expense) + 100 (income) = -200 (limit is NOT included in getEnvelopeBalance itself)
    expect(result.current.getEnvelopeBalance(id)).toBe(-200);
  });

  it('excludes transactions dated before the current cutoff period start for a gasto envelope with cutoff enabled', async () => {
    const { result } = await renderHook(() => useAppData(), { wrapper });

    const now = new Date();
    // Well before any possible cutoff period start.
    const longAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const cutoffDay = now.getDate();

    await act(async () => {
      await result.current.updateSettings({ expenseCutoffEnabled: true, expenseCutoffDay: cutoffDay });
    });

    await act(async () => {
      await result.current.addEnvelope(baseEnvelope({ name: 'Gasto Cutoff', type: 'gasto', limit: 0 }));
    });
    const id = findIdByName(result.current.envelopes, 'Gasto Cutoff');

    // Transaction inside the current cutoff period (dated now) -> included.
    await act(async () => {
      await result.current.addTransaction({
        envelopeId: id,
        type: 'expense',
        amount: 50,
        description: 'Inside period',
        date: now.toISOString(),
      });
    });

    // Transaction dated well before the cutoff period start -> excluded.
    await act(async () => {
      await result.current.addTransaction({
        envelopeId: id,
        type: 'expense',
        amount: 9999,
        description: 'Before cutoff period',
        date: longAgo.toISOString(),
      });
    });

    expect(result.current.getEnvelopeBalance(id)).toBe(-50);
  });

  it('sums/subtracts transactions directly for an ahorro envelope, with no cutoff logic applied', async () => {
    const { result } = await renderHook(() => useAppData(), { wrapper });

    await act(async () => {
      await result.current.updateSettings({ expenseCutoffEnabled: true, expenseCutoffDay: new Date().getDate() });
    });

    await act(async () => {
      await result.current.addEnvelope(baseEnvelope({ name: 'Ahorro Envelope', type: 'ahorro', limit: 0 }));
    });
    const id = findIdByName(result.current.envelopes, 'Ahorro Envelope');

    const longAgo = new Date(2000, 0, 1).toISOString();

    await act(async () => {
      await result.current.addTransaction({
        envelopeId: id,
        type: 'income',
        amount: 500,
        description: 'Deposit',
        date: longAgo,
      });
    });

    await act(async () => {
      await result.current.addTransaction({
        envelopeId: id,
        type: 'expense',
        amount: 200,
        description: 'Withdrawal',
        date: longAgo,
      });
    });

    // No cutoff exclusion applies to 'ahorro' envelopes even though a cutoff is enabled globally,
    // and even though the transactions are dated long before any cutoff period start.
    expect(result.current.getEnvelopeBalance(id)).toBe(300);
  });

  it('reduces both the spending envelope balance and the source savings envelope balance for an expense with sourceSavingsEnvelopeId', async () => {
    const { result } = await renderHook(() => useAppData(), { wrapper });

    // addEnvelope/addTransaction derive their id from Date.now().toString(); calls made back-to-back
    // in the same millisecond would otherwise collide. Force distinct, deterministic ids for this test.
    let idCounter = 1000;
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => idCounter++);

    try {
      await act(async () => {
        await result.current.addEnvelope(baseEnvelope({ name: 'Gasto Linked', type: 'gasto', limit: 0 }));
      });
      await act(async () => {
        await result.current.addEnvelope(baseEnvelope({ name: 'Ahorro Source', type: 'ahorro', limit: 0 }));
      });
    } finally {
      dateNowSpy.mockRestore();
    }

    const gastoId = findIdByName(result.current.envelopes, 'Gasto Linked');
    const ahorroId = findIdByName(result.current.envelopes, 'Ahorro Source');
    expect(gastoId).not.toBe(ahorroId);

    // Seed the savings envelope with some funds first.
    await act(async () => {
      await result.current.addTransaction({
        envelopeId: ahorroId,
        type: 'income',
        amount: 1000,
        description: 'Initial savings',
        date: new Date().toISOString(),
      });
    });

    // Expense charged against the gasto envelope, funded from the savings envelope.
    await act(async () => {
      await result.current.addTransaction({
        envelopeId: gastoId,
        type: 'expense',
        amount: 250,
        description: 'Big purchase funded by savings',
        date: new Date().toISOString(),
        sourceSavingsEnvelopeId: ahorroId,
      } as Omit<Transaction, 'id' | 'isArchived'>);
    });

    // Spending envelope balance reflects the expense.
    expect(result.current.getEnvelopeBalance(gastoId)).toBe(-250);
    // Source savings envelope balance is reduced by the same amount, on top of its own income.
    expect(result.current.getEnvelopeBalance(ahorroId)).toBe(1000 - 250);
  });
});
