import { filterTransactions, hasActiveSearch, SearchFilters } from './transactionSearch';
import { Transaction } from '../types';

const makeTx = (overrides: Partial<Transaction>): Transaction => ({
  id: overrides.id ?? Math.random().toString(36),
  envelopeId: 'env-1',
  type: 'expense',
  amount: 100,
  description: 'Test',
  date: '2026-08-06T12:00:00.000Z',
  isArchived: false,
  ...overrides,
});

const noFilters: SearchFilters = { text: '' };

describe('filterTransactions', () => {
  it('returns all non-archived transactions when text is empty and no filters are set', () => {
    const txs = [makeTx({ id: 'a' }), makeTx({ id: 'b' })];
    expect(filterTransactions(txs, noFilters).map(t => t.id)).toEqual(['a', 'b']);
  });

  it('matches description case-insensitively as a substring', () => {
    const txs = [
      makeTx({ id: 'a', description: 'Supermercado Auto Mercado' }),
      makeTx({ id: 'b', description: 'Gasolina' }),
    ];
    expect(filterTransactions(txs, { text: 'mercado' }).map(t => t.id)).toEqual(['a']);
  });

  it('excludes archived transactions regardless of filters', () => {
    const txs = [
      makeTx({ id: 'a', isArchived: true, description: 'Match me' }),
      makeTx({ id: 'b', isArchived: false, description: 'Match me' }),
    ];
    expect(filterTransactions(txs, { text: 'match' }).map(t => t.id)).toEqual(['b']);
  });

  it('filters by categoryId', () => {
    const txs = [
      makeTx({ id: 'a', categoryId: 'cat-1' }),
      makeTx({ id: 'b', categoryId: 'cat-2' }),
    ];
    expect(filterTransactions(txs, { text: '', categoryId: 'cat-1' }).map(t => t.id)).toEqual(['a']);
  });

  it('filters by paymentMethodId', () => {
    const txs = [
      makeTx({ id: 'a', paymentMethodId: 'pm-1' }),
      makeTx({ id: 'b', paymentMethodId: 'pm-2' }),
    ];
    expect(filterTransactions(txs, { text: '', paymentMethodId: 'pm-1' }).map(t => t.id)).toEqual(['a']);
  });

  it('filters by inclusive date range, normalizing to whole days', () => {
    const txs = [
      makeTx({ id: 'a', date: '2026-08-01T23:59:00.000Z' }),
      makeTx({ id: 'b', date: '2026-08-05T00:00:00.000Z' }),
      makeTx({ id: 'c', date: '2026-08-10T12:00:00.000Z' }),
    ];
    const result = filterTransactions(txs, {
      text: '',
      dateFrom: new Date('2026-08-05T00:00:00.000Z'),
      dateTo: new Date('2026-08-05T00:00:00.000Z'),
    });
    expect(result.map(t => t.id)).toEqual(['b']);
  });

  it('filters by inclusive amount range', () => {
    const txs = [
      makeTx({ id: 'a', amount: 50 }),
      makeTx({ id: 'b', amount: 100 }),
      makeTx({ id: 'c', amount: 150 }),
    ];
    const result = filterTransactions(txs, { text: '', minAmount: 50, maxAmount: 100 });
    expect(result.map(t => t.id)).toEqual(['a', 'b']);
  });

  it('combines text and filters with AND semantics', () => {
    const txs = [
      makeTx({ id: 'a', description: 'Cafe', categoryId: 'cat-1' }),
      makeTx({ id: 'b', description: 'Cafe', categoryId: 'cat-2' }),
      makeTx({ id: 'c', description: 'Otro', categoryId: 'cat-1' }),
    ];
    const result = filterTransactions(txs, { text: 'cafe', categoryId: 'cat-1' });
    expect(result.map(t => t.id)).toEqual(['a']);
  });

  it('sorts results most-recent-first', () => {
    const txs = [
      makeTx({ id: 'a', date: '2026-08-01T00:00:00.000Z' }),
      makeTx({ id: 'c', date: '2026-08-10T00:00:00.000Z' }),
      makeTx({ id: 'b', date: '2026-08-05T00:00:00.000Z' }),
    ];
    expect(filterTransactions(txs, noFilters).map(t => t.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('hasActiveSearch', () => {
  it('is false for the initial empty filters', () => {
    expect(hasActiveSearch({ text: '' })).toBe(false);
  });

  it('is true when text is non-empty', () => {
    expect(hasActiveSearch({ text: 'cafe' })).toBe(true);
  });

  it('is true when any single filter is set, even with empty text', () => {
    expect(hasActiveSearch({ text: '', categoryId: 'cat-1' })).toBe(true);
    expect(hasActiveSearch({ text: '', paymentMethodId: 'pm-1' })).toBe(true);
    expect(hasActiveSearch({ text: '', dateFrom: new Date() })).toBe(true);
    expect(hasActiveSearch({ text: '', dateTo: new Date() })).toBe(true);
    expect(hasActiveSearch({ text: '', minAmount: 0 })).toBe(true);
    expect(hasActiveSearch({ text: '', maxAmount: 0 })).toBe(true);
  });
});
