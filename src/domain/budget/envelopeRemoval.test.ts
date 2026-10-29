import { removeEnvelopeReferences } from './envelopeRemoval';
import { computeEnvelopeBalances } from './balance';
import { Envelope, RecurringTransactionTemplate, Transaction } from '../../types';

const env = (id: string, type: Envelope['type'] = 'gasto'): Envelope => ({
  id, name: id, type, currency: 'CRC', limit: 0, isUnlimited: false, icon: 'x', color: '#000',
});
const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 't', envelopeId: 'g', type: 'expense', amount: 10, description: 'd', date: '2026-01-01T00:00:00.000Z', isArchived: false,
  ...overrides,
});
const tpl = (overrides: Partial<RecurringTransactionTemplate>): RecurringTransactionTemplate => ({
  id: 'r', envelopeId: 'g', type: 'expense', amount: 10, description: 'd', frequency: 'monthly', dayOfMonth: 1,
  isActive: true, lastGeneratedPeriod: null, reminderNotificationId: null, lastReminderScheduledPeriod: null,
  ...overrides,
});

describe('removeEnvelopeReferences', () => {
  const envelopes = [env('g'), env('s', 'ahorro'), env('x')];
  const transactions = [
    tx({ id: 'own', envelopeId: 's', type: 'income', amount: 500 }),
    tx({ id: 'in', envelopeId: 'g', toEnvelopeId: 's', type: 'transfer', amount: 100 }),
    tx({ id: 'out', envelopeId: 's', toEnvelopeId: 'x', type: 'transfer', amount: 30 }),
    tx({ id: 'funded', envelopeId: 'g', sourceSavingsEnvelopeId: 's', amount: 20 }),
    tx({ id: 'fundedOnDeleted', envelopeId: 'x', sourceSavingsEnvelopeId: 'g', amount: 5 }),
  ];

  it('leaves the remaining envelopes balances unchanged when deleting a savings envelope', () => {
    const before = computeEnvelopeBalances(transactions, envelopes, new Date(2026, 0, 15));
    const result = removeEnvelopeReferences('s', transactions, []);
    const after = computeEnvelopeBalances(result.transactions, envelopes, new Date(2026, 0, 15));

    expect(after.get('g')).toBe(before.get('g'));
    expect(after.get('x')).toBe(before.get('x'));
    expect(after.has('s')).toBe(false);
    expect(result.transactions.find(t => t.id === 'own')).toBeUndefined();
  });

  it('moves an expense funded from savings onto the savings envelope when its own envelope is deleted', () => {
    const before = computeEnvelopeBalances(transactions, envelopes, new Date(2026, 0, 15));
    const result = removeEnvelopeReferences('g', transactions, []);
    const after = computeEnvelopeBalances(result.transactions, envelopes, new Date(2026, 0, 15));

    expect(after.get('s')).toBe(before.get('s'));
    expect(after.get('x')).toBe(before.get('x'));
  });

  it('removes its templates and unlinks it as a savings source elsewhere', () => {
    const result = removeEnvelopeReferences('s', [], [tpl({ id: 'own', envelopeId: 's' }), tpl({ id: 'other', sourceSavingsEnvelopeId: 's' })]);
    expect(result.removedTemplates.map(t => t.id)).toEqual(['own']);
    expect(result.templates).toEqual([tpl({ id: 'other' })]);
  });
});
