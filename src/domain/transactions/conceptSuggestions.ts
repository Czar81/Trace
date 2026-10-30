import { Transaction } from '../../types';

export interface ConceptSuggestion {
  description: string;
  count: number;
  /** Most recent transaction with this description, used to prefill amount, category and payment method. */
  latest: Transaction;
}

interface SuggestionOptions {
  envelopeId: string;
  type: 'expense' | 'income';
  /** Text typed so far. Empty returns the most repeated concepts. */
  query?: string;
  limit?: number;
}

export const SUGGESTION_LIMIT = 5;

/**
 * Concepts previously used in this envelope for this transaction type, most repeated first.
 * With no query only concepts used at least twice are "frequent"; with a query any prefix or
 * substring match qualifies, prefix matches first. A concept equal to the query is left out.
 */
export const suggestConcepts = (
  transactions: Transaction[],
  { envelopeId, type, query = '', limit = SUGGESTION_LIMIT }: SuggestionOptions
): ConceptSuggestion[] => {
  const needle = query.trim().toLowerCase();
  const groups = new Map<string, ConceptSuggestion>();

  for (const tx of transactions) {
    if (tx.isArchived || tx.envelopeId !== envelopeId || tx.type !== type) continue;
    const description = tx.description.trim();
    if (description === '') continue;
    const key = description.toLowerCase();
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { description, count: 1, latest: tx });
    } else {
      group.count += 1;
      if (new Date(tx.date).getTime() > new Date(group.latest.date).getTime()) {
        group.latest = tx;
        group.description = description;
      }
    }
  }

  const rank = (s: ConceptSuggestion) => (s.description.toLowerCase().startsWith(needle) ? 0 : 1);

  return Array.from(groups.entries())
    .filter(([key, s]) => (needle === '' ? s.count >= 2 : key.includes(needle) && key !== needle))
    .map(([, s]) => s)
    .sort((a, b) => rank(a) - rank(b) || b.count - a.count || new Date(b.latest.date).getTime() - new Date(a.latest.date).getTime())
    .slice(0, limit);
};
