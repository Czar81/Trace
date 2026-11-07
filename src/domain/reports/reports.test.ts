import { Envelope, Transaction, TransactionCategory } from '../../types';
import { getSavingsRate, getMonthlyTrend, filterByCurrency, getSpendingByCategory, getTopTransactions, resolvePeriodRange, getSummary, parseReportLayout, REPORT_SECTIONS } from './reports';

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
    const result = getSpendingByCategory(transactions, expenseCategories, 'all-time');

    expect(result).toEqual([
      { categoryId: '1', name: 'Comida', total: 100, percentage: 100 },
    ]);
    expect(result.some(r => r.name === 'Salario')).toBe(false);
  });

  it('top transactions excludes income', () => {
    const result = getTopTransactions(transactions, expenseCategories, [envelope], 'all-time');

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
    const ids = getTopTransactions(transactions, [], [envelope], period).map(e => e.transaction.id);
    expect(ids.sort()).toEqual(['end', 'start']);
  });
});

describe('getSummary', () => {
  const usdEnvelope: Envelope = { ...envelope, id: 'e2', currency: 'USD' };

  it('totals income and expenses and excludes archived', () => {
    const result = getSummary(
      [
        tx({ type: 'expense', amount: 1000 }),
        tx({ type: 'expense', amount: 500 }),
        tx({ type: 'income', amount: 4000 }),
        tx({ type: 'expense', amount: 9999, isArchived: true }),
        tx({ type: 'income', amount: 9999, isArchived: true }),
      ],
      'all-time'
    );

    expect(result).toEqual({ income: 4000, expenses: 1500, net: 2500, savingsRate: 63, averageExpense: 750, expenseCount: 2 });
  });

  it('filterByCurrency keeps only transactions of envelopes in that currency', () => {
    const transactions = [tx({ id: 'crc' }), tx({ id: 'usd', envelopeId: 'e2' })];
    expect(filterByCurrency(transactions, [envelope, usdEnvelope], 'USD').map(t => t.id)).toEqual(['usd']);
    expect(filterByCurrency(transactions, [envelope, usdEnvelope], 'CRC').map(t => t.id)).toEqual(['crc']);
  });

  it('only counts transactions within the period', () => {
    const result = getSummary(
      [
        tx({ type: 'expense', amount: 100, date: new Date(2024, 0, 15).toISOString() }),
        tx({ type: 'expense', amount: 500, date: new Date(2024, 1, 15).toISOString() }),
      ],
      { kind: 'custom', start: new Date(2024, 0, 1), end: new Date(2024, 0, 31) }
    );

    expect(result.expenses).toBe(100);
    expect(result.expenseCount).toBe(1);
  });

  it('returns zeros and a null average for an empty period', () => {
    expect(getSummary([], 'all-time')).toEqual({
      income: 0,
      expenses: 0,
      net: 0,
      savingsRate: null,
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

describe('getSavingsRate', () => {
  it('returns the percentage of income left after expenses', () => {
    expect(getSavingsRate(1000, 750)).toBe(25);
  });

  it('is negative when spending exceeds income', () => {
    expect(getSavingsRate(1000, 1500)).toBe(-50);
  });

  it('is null when there is no income', () => {
    expect(getSavingsRate(0, 300)).toBeNull();
  });

  it('is computed per month in the monthly trend', () => {
    const now = new Date();
    const trend = getMonthlyTrend(
      [tx({ type: 'income', amount: 1000, date: now.toISOString() }), tx({ type: 'expense', amount: 400, date: now.toISOString() })],
      2
    );
    expect(trend[1].savingsRate).toBe(60);
    expect(trend[0].savingsRate).toBeNull();
  });
});
