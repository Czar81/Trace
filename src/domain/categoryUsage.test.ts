import { mostUsedCategories } from './categoryUsage';
import { Transaction, TransactionCategory } from '../types';

const catalog: TransactionCategory[] = [
  { id: '1', name: 'Comida' },
  { id: '2', name: 'Transporte' },
  { id: '3', name: 'Servicios' },
  { id: '4', name: 'Salud' },
  { id: '5', name: 'Otros' },
];

let seq = 0;
const tx = (categoryId: string | undefined, date: string, overrides: Partial<Transaction> = {}): Transaction => ({
  id: String(++seq),
  envelopeId: 'env',
  type: 'expense',
  amount: 100,
  description: 'x',
  date,
  categoryId,
  isArchived: false,
  ...overrides,
});

describe('mostUsedCategories', () => {
  it('ranks by usage count and leaves out unused categories', () => {
    const result = mostUsedCategories(
      [tx('2', '2026-01-01'), tx('2', '2026-01-02'), tx('1', '2026-01-03'), tx('2', '2026-01-04')],
      catalog,
      'expense'
    );
    expect(result.map(c => c.id)).toEqual(['2', '1']);
  });

  it('breaks ties with the most recently used category', () => {
    const result = mostUsedCategories([tx('1', '2026-01-01'), tx('3', '2026-02-01')], catalog, 'expense');
    expect(result.map(c => c.id)).toEqual(['3', '1']);
  });

  it('only counts transactions of the requested type and respects the limit', () => {
    const result = mostUsedCategories(
      [
        tx('1', '2026-01-01', { type: 'income' }),
        tx('2', '2026-01-01'),
        tx('3', '2026-01-02'),
        tx('4', '2026-01-03'),
        tx('5', '2026-01-04'),
        tx(undefined, '2026-01-05'),
      ],
      catalog,
      'expense',
      3
    );
    expect(result.map(c => c.id)).toEqual(['5', '4', '3']);
  });

  it('includes archived transactions and ignores ids missing from the catalog', () => {
    const result = mostUsedCategories(
      [tx('1', '2026-01-01', { isArchived: true }), tx('deleted', '2026-01-02')],
      catalog,
      'expense'
    );
    expect(result.map(c => c.id)).toEqual(['1']);
  });
});
