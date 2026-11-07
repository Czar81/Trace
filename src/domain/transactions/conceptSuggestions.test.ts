import { suggestConcepts } from './conceptSuggestions';
import { Transaction } from '../../types';

let n = 0;
const tx = (over: Partial<Transaction>): Transaction => ({
  id: `t${n++}`, envelopeId: 'e1', type: 'expense', amount: 100, description: 'Café',
  date: new Date(2026, 9, 1).toISOString(), isArchived: false, ...over,
});

describe('suggestConcepts', () => {
  it('lists repeated concepts first and ignores single-use ones when nothing is typed', () => {
    const txs = [tx({}), tx({}), tx({ description: 'Pan' }), tx({ description: 'Pan' }), tx({ description: 'Pan' }), tx({ description: 'Raro' })];
    expect(suggestConcepts(txs, { envelopeId: 'e1', type: 'expense' }).map(s => [s.description, s.count])).toEqual([['Pan', 3], ['Café', 2]]);
  });

  it('only uses non-archived transactions of the same envelope and type', () => {
    const txs = [tx({}), tx({}), tx({ envelopeId: 'e2' }), tx({ type: 'income' }), tx({ isArchived: true })];
    expect(suggestConcepts(txs, { envelopeId: 'e1', type: 'expense' })[0].count).toBe(2);
  });

  it('matches case-insensitively, prefix matches first, and skips the exact text typed', () => {
    const txs = [tx({ description: 'Cena café' }), tx({ description: 'Café' }), tx({ description: 'Café con leche' })];
    expect(suggestConcepts(txs, { envelopeId: 'e1', type: 'expense', query: 'CAF' }).map(s => s.description)).toEqual(['Café', 'Café con leche', 'Cena café']);
    expect(suggestConcepts(txs, { envelopeId: 'e1', type: 'expense', query: 'café' }).map(s => s.description)).toEqual(['Café con leche', 'Cena café']);
  });

  it('keeps the most recent transaction as the one to prefill from', () => {
    const txs = [tx({ amount: 1, date: new Date(2026, 8, 1).toISOString() }), tx({ amount: 3, date: new Date(2026, 9, 9).toISOString() }), tx({ amount: 2, date: new Date(2026, 9, 2).toISOString() })];
    expect(suggestConcepts(txs, { envelopeId: 'e1', type: 'expense' })[0].latest.amount).toBe(3);
  });
});
