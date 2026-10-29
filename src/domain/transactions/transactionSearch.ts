import { Transaction } from '../../types';

export interface SearchFilters {
  text: string;
  categoryId?: string;
  paymentMethodId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Filters non-archived transactions by case-insensitive description substring
 * match plus every active optional filter (AND semantics), returning results
 * sorted most-recent-first so callers can group them (e.g. via
 * groupTransactionsByDay) without re-sorting.
 */
export const filterTransactions = (
  transactions: Transaction[],
  filters: SearchFilters
): Transaction[] => {
  const text = filters.text.trim().toLowerCase();

  // Normalize the range to whole calendar days so "from"/"to" are inclusive
  // regardless of the time-of-day component on the picked Date or on t.date.
  const startOfDay = filters.dateFrom
    ? new Date(filters.dateFrom.getFullYear(), filters.dateFrom.getMonth(), filters.dateFrom.getDate(), 0, 0, 0, 0)
    : undefined;
  const endOfDay = filters.dateTo
    ? new Date(filters.dateTo.getFullYear(), filters.dateTo.getMonth(), filters.dateTo.getDate(), 23, 59, 59, 999)
    : undefined;

  const fromMs = startOfDay?.getTime();
  const toMs = endOfDay?.getTime();

  // Parse each date once; the sort below compares plain numbers instead of
  // building Date objects on every comparison.
  const matches: { t: Transaction; ms: number }[] = [];
  for (const t of transactions) {
    if (t.isArchived) continue;
    if (text !== '' && !t.description.toLowerCase().includes(text)) continue;
    if (filters.categoryId && t.categoryId !== filters.categoryId) continue;
    if (filters.paymentMethodId && t.paymentMethodId !== filters.paymentMethodId) continue;
    if (filters.minAmount !== undefined && t.amount < filters.minAmount) continue;
    if (filters.maxAmount !== undefined && t.amount > filters.maxAmount) continue;
    const ms = new Date(t.date).getTime();
    if (fromMs !== undefined && !(ms >= fromMs)) continue;
    if (toMs !== undefined && !(ms <= toMs)) continue;
    matches.push({ t, ms });
  }

  return matches.sort((a, b) => b.ms - a.ms).map(m => m.t);
};

/** Whether any search text or filter is active (vs. the screen's initial empty state). */
export const hasActiveSearch = (filters: SearchFilters): boolean =>
  filters.text.trim() !== '' ||
  !!filters.categoryId ||
  !!filters.paymentMethodId ||
  !!filters.dateFrom ||
  !!filters.dateTo ||
  filters.minAmount !== undefined ||
  filters.maxAmount !== undefined;
