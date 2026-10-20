import { Envelope } from '../types';

const TYPE_ORDER: Envelope['type'][] = ['gasto', 'ahorro', 'deuda'];

export function sortEnvelopesByTypeAndName(envelopes: Envelope[]): Envelope[] {
  return [...envelopes].sort((a, b) => {
    const typeDifference = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
    return typeDifference || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });
}