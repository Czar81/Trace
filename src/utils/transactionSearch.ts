import { Transaction } from '../types';

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

  return transactions
    .filter(t => !t.isArchived)
    .filter(t => text === '' || t.description.toLowerCase().includes(text))
    .filter(t => !filters.categoryId || t.categoryId === filters.categoryId)
    .filter(t => !filters.paymentMethodId || t.paymentMethodId === filters.paymentMethodId)
    .filter(t => !startOfDay || new Date(t.date) >= startOfDay)
    .filter(t => !endOfDay || new Date(t.date) <= endOfDay)
    .filter(t => filters.minAmount === undefined || t.amount >= filters.minAmount)
    .filter(t => filters.maxAmount === undefined || t.amount <= filters.maxAmount)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
