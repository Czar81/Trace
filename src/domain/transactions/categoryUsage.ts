import { Transaction, TransactionCategory } from '../../types';

/**
 * Returns up to `limit` categories from `catalog` ranked by how many
 * transactions of `type` use them (archived ones included, since they still
 * reflect the user's habits). Ties go to the most recently used category.
 * Categories that were never used are left out.
 */
export const mostUsedCategories = (
  transactions: Transaction[],
  catalog: TransactionCategory[],
  type: 'expense' | 'income',
  limit = 4
): TransactionCategory[] => {
  const usage = new Map<string, { count: number; lastUsed: number }>();
  for (const t of transactions) {
    if (t.type !== type || !t.categoryId) continue;
    const time = new Date(t.date).getTime();
    const entry = usage.get(t.categoryId) ?? { count: 0, lastUsed: 0 };
    entry.count += 1;
    entry.lastUsed = Math.max(entry.lastUsed, time);
    usage.set(t.categoryId, entry);
  }

  return catalog
    .filter(c => usage.has(c.id))
    .sort((a, b) => {
      const ua = usage.get(a.id)!;
      const ub = usage.get(b.id)!;
      return ub.count - ua.count || ub.lastUsed - ua.lastUsed;
    })
    .slice(0, limit);
};
