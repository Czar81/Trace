import { groupTransactionsByDay } from './transactionGrouping';
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

describe('groupTransactionsByDay', () => {
  it('returns no sections for empty input', () => {
    expect(groupTransactionsByDay([])).toEqual([]);
  });

  it('groups a single day into one section', () => {
    const txs = [
      makeTx({ id: 'a', date: '2026-08-06T09:00:00.000Z' }),
      makeTx({ id: 'b', date: '2026-08-06T18:00:00.000Z' }),
    ];
    const sections = groupTransactionsByDay(txs);
    expect(sections).toHaveLength(1);
    expect(sections[0].data.map(t => t.id)).toEqual(['a', 'b']);
  });

  it('creates one section per distinct day, preserving input order', () => {
    const txs = [
      makeTx({ id: 'a', date: '2026-08-06T09:00:00.000Z' }),
      makeTx({ id: 'b', date: '2026-08-03T09:00:00.000Z' }),
      makeTx({ id: 'c', date: '2026-08-02T09:00:00.000Z' }),
    ];
    const sections = groupTransactionsByDay(txs);
    expect(sections).toHaveLength(3);
    expect(sections.map(s => s.data[0].id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps same-day transactions grouped together even if interleaved is not the case, and preserves relative order within the day', () => {
    const txs = [
      makeTx({ id: 'a', date: '2026-08-06T09:00:00.000Z' }),
      makeTx({ id: 'b', date: '2026-08-06T18:00:00.000Z' }),
      makeTx({ id: 'c', date: '2026-08-03T09:00:00.000Z' }),
    ];
    const sections = groupTransactionsByDay(txs);
    expect(sections).toHaveLength(2);
    expect(sections[0].data.map(t => t.id)).toEqual(['a', 'b']);
    expect(sections[1].data.map(t => t.id)).toEqual(['c']);
  });

  it('formats the section title in Spanish long-date form', () => {
    const txs = [makeTx({ date: '2026-08-06T12:00:00.000Z' })];
    const [section] = groupTransactionsByDay(txs);
    expect(section.title).toMatch(/agosto/i);
    expect(section.title).toMatch(/2026/);
  });
});
