import { Envelope } from '../types';
import { sortEnvelopesByTypeAndName } from './envelopeSorting';

const makeEnvelope = (id: string, name: string, type: Envelope['type']): Envelope => ({
  id,
  name,
  type,
  currency: 'CRC',
  limit: 0,
  isUnlimited: true,
  icon: 'box',
  color: '#000000',
});

describe('sortEnvelopesByTypeAndName', () => {
  it('orders expenses, savings, then debts, alphabetically within each type', () => {
    const envelopes = [
      makeEnvelope('debt', 'Deuda', 'deuda'),
      makeEnvelope('savings-z', 'Ocio', 'ahorro'),
      makeEnvelope('expense-z', 'Zoológico', 'gasto'),
      makeEnvelope('expense-a', 'Álquiler', 'gasto'),
      makeEnvelope('savings-a', 'Ahorros', 'ahorro'),
    ];

    expect(sortEnvelopesByTypeAndName(envelopes).map(envelope => envelope.id)).toEqual([
      'expense-a', 'expense-z', 'savings-a', 'savings-z', 'debt',
    ]);
    expect(envelopes[0].id).toBe('debt');
  });
});