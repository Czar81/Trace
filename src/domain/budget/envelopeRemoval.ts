import { RecurringTransactionTemplate, Transaction } from '../../types';

/**
 * Removes every reference to a deleted envelope while leaving the balances of
 * the envelopes that remain exactly as they were:
 * - its own transactions are removed;
 * - a transfer into it becomes an expense of the source envelope, and a
 *   transfer out of it becomes an income of the destination envelope;
 * - an expense of it funded from savings becomes an expense of that savings
 *   envelope, and an expense elsewhere funded from it stops naming it as source;
 * - its recurring templates are removed (returned so their reminders can be
 *   cancelled), and other templates stop using it as a savings source.
 */
export function removeEnvelopeReferences(
  envelopeId: string,
  transactions: Transaction[],
  templates: RecurringTransactionTemplate[]
): {
  transactions: Transaction[];
  templates: RecurringTransactionTemplate[];
  removedTemplates: RecurringTransactionTemplate[];
} {
  const keptTransactions: Transaction[] = [];
  for (const t of transactions) {
    if (t.type === 'transfer' && t.toEnvelopeId === envelopeId) {
      if (t.envelopeId !== envelopeId) {
        keptTransactions.push(withoutKeys({ ...t, type: 'expense' }, ['toEnvelopeId']));
      }
      continue;
    }
    if (t.type === 'transfer' && t.envelopeId === envelopeId) {
      if (t.toEnvelopeId) {
        keptTransactions.push(withoutKeys({ ...t, type: 'income', envelopeId: t.toEnvelopeId }, ['toEnvelopeId']));
      }
      continue;
    }
    if (t.envelopeId === envelopeId) {
      if (t.type === 'expense' && t.sourceSavingsEnvelopeId && t.sourceSavingsEnvelopeId !== envelopeId) {
        keptTransactions.push(withoutKeys({ ...t, envelopeId: t.sourceSavingsEnvelopeId }, ['sourceSavingsEnvelopeId']));
      }
      continue;
    }
    if (t.sourceSavingsEnvelopeId === envelopeId) {
      keptTransactions.push(withoutKeys(t, ['sourceSavingsEnvelopeId']));
      continue;
    }
    keptTransactions.push(t);
  }

  const removedTemplates = templates.filter(t => t.envelopeId === envelopeId);
  const keptTemplates = templates
    .filter(t => t.envelopeId !== envelopeId)
    .map(t => (t.sourceSavingsEnvelopeId === envelopeId ? withoutKeys(t, ['sourceSavingsEnvelopeId']) : t));

  return { transactions: keptTransactions, templates: keptTemplates, removedTemplates };
}

function withoutKeys<T extends object>(value: T, keys: (keyof T)[]): T {
  const copy = { ...value };
  for (const key of keys) delete copy[key];
  return copy;
}
