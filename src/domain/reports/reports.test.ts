import { Envelope, Transaction, TransactionCategory } from '../../types';
import { getSpendingByCategory, getTopTransactions, resolvePeriodRange, getSummary, parseReportLayout, REPORT_SECTIONS } from './reports';

const envelope: Envelope = {
  id: 'e1',
  name: 'Gastos',
  type: 'gasto',
  currency: 'CRC',
  limit: 0,
  isUnlimited: false,
  icon: 'wallet',
  color: '#000000',
};

const convert = (amount: number) => amount;

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(),
  envelopeId: 'e1',
  type: 'expense',
  amount: 0,
  description: 't',
  date: new Date().toISOString(),
  isArchived: false,
  ...overrides,
});

describe('reports ignore income categories', () => {
  const expenseCategories: TransactionCategory[] = [{ id: '1', name: 'Comida' }];
  const incomeCategories: TransactionCategory[] = [{ id: 'inc-1', name: 'Salario' }];

  const transactions: Transaction[] = [
    tx({ id: 'exp', type: 'expense', amount: 100, categoryId: '1' }),
    tx({ id: 'inc', type: 'income', amount: 50, categoryId: 'inc-1' }),
  ];

  it('spending by category counts only expense transactions and only expense categories', () => {
    const result = getSpendingByCategory(transactions, expenseCategories, [envelope], 'all-time', convert);

    expect(result).toEqual([
      { categoryId: '1', name: 'Comida', totalCRC: 100, percentage: 100 },
    ]);
    expect(result.some(r => r.name === 'Salario')).toBe(false);
  });

  it('top transactions excludes income', () => {
    const result = getTopTransactions(transactions, expenseCategories, [envelope], 'all-time', convert);

    expect(result.map(r => r.transaction.id)).toEqual(['exp']);
    expect(incomeCategories).toHaveLength(1); // income catalog is simply not consulted here
  });
});

describe('custom report period', () => {
  const period = { kind: 'custom' as const, start: new Date(2026, 4, 1), end: new Date(2026, 4, 10) };
  const transactions: Transaction[] = [
    tx({ id: 'before', amount: 1, date: new Date(2026, 3, 30, 23, 59).toISOString() }),
    tx({ id: 'start', amount: 2, date: new Date(2026, 4, 1, 0, 0).toISOString() }),
    tx({ id: 'end', amount: 4, date: new Date(2026, 4, 10, 23, 59).toISOString() }),
    tx({ id: 'after', amount: 8, date: new Date(2026, 4, 11, 0, 0).toISOString() }),
  ];

  it('sets the end to the end of its local day', () => {
    const range = resolvePeriodRange(period);
    expect(range?.start).toEqual(new Date(2026, 4, 1, 0, 0, 0, 0));
    expect(range?.end).toEqual(new Date(2026, 4, 10, 23, 59, 59, 999));
  });

  it('includes a transaction on the end date at 23:59 and excludes the next day', () => {
    const ids = getTopTransactions(transactions, [], [envelope], period, convert).map(e => e.transaction.id);
    expect(ids.sort()).toEqual(['end', 'start']);
  });
});

describe('getSummary', () => {
  const usdEnvelope: Envelope = { ...envelope, id: 'e2', currency: 'USD' };
  const toCRC = (amount: number, from: string) => (from === 'USD' ? amount * 500 : amount);

  it('totals income and expenses across currencies and excludes archived', () => {
    const result = getSummary(
      [
        tx({ type: 'expense', amount: 1000 }),
        tx({ type: 'expense', amount: 1, envelopeId: 'e2' }),
        tx({ type: 'income', amount: 4000 }),
        tx({ type: 'expense', amount: 9999, isArchived: true }),
        tx({ type: 'income', amount: 9999, isArchived: true }),
      ],
      [envelope, usdEnvelope],
      'all-time',
      toCRC
    );

    expect(result).toEqual({ income: 4000, expenses: 1500, net: 2500, averageExpense: 750, expenseCount: 2 });
  });

  it('only counts transactions within the period', () => {
    const result = getSummary(
      [
        tx({ type: 'expense', amount: 100, date: new Date(2024, 0, 15).toISOString() }),
        tx({ type: 'expense', amount: 500, date: new Date(2024, 1, 15).toISOString() }),
      ],
      [envelope],
      { kind: 'custom', start: new Date(2024, 0, 1), end: new Date(2024, 0, 31) },
      convert
    );

    expect(result.expenses).toBe(100);
    expect(result.expenseCount).toBe(1);
  });

  it('returns zeros and a null average for an empty period', () => {
    expect(getSummary([], [envelope], 'all-time', convert)).toEqual({
      income: 0,
      expenses: 0,
      net: 0,
      averageExpense: null,
      expenseCount: 0,
    });
  });
});

describe('parseReportLayout', () => {
  it('returns the default for null, invalid JSON, or non-array JSON', () => {
    expect(parseReportLayout(null)).toEqual(REPORT_SECTIONS);
    expect(parseReportLayout('{oops')).toEqual(REPORT_SECTIONS);
    expect(parseReportLayout('{"a":1}')).toEqual(REPORT_SECTIONS);
  });

  it('drops unknown ids and duplicates', () => {
    const raw = JSON.stringify([
      { id: 'nope', visible: true },
      { id: 'trend', visible: false },
      { id: 'trend', visible: true },
    ]);
    const result = parseReportLayout(raw);

    expect(result.map(r => r.id)).toEqual(['trend', 'byCategory', 'byMonth', 'byEnvelope', 'byPaymentMethod', 'topTransactions']);
    expect(result[0]).toEqual({ id: 'trend', visible: false });
  });

  it('appends missing ids in default order, visible', () => {
    const result = parseReportLayout(JSON.stringify([{ id: 'topTransactions', visible: false }, { id: 'byMonth', visible: true }]));

    expect(result.map(r => r.id)).toEqual(['topTransactions', 'byMonth', 'byCategory', 'byEnvelope', 'byPaymentMethod', 'trend']);
    expect(result.slice(2).every(r => r.visible)).toBe(true);
  });

  it('does not share references with the default list', () => {
    parseReportLayout(null)[0].visible = false;
    expect(REPORT_SECTIONS[0].visible).toBe(true);
  });
});
