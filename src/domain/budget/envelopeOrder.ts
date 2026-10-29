import { Envelope } from '../../types';

/**
 * Reorders the envelopes of one type to follow `orderedIds`, keeping the other types where they are.
 * The stored array order is the display order, so old backups without any order keep working.
 * Ids that are missing from `orderedIds` stay after the listed ones in their current order.
 */
export function reorderEnvelopesOfType(envelopes: Envelope[], type: Envelope['type'], orderedIds: string[]): Envelope[] {
  const ofType = envelopes.filter(e => e.type === type);
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  const sorted = [...ofType].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
  let next = 0;
  return envelopes.map(e => (e.type === type ? sorted[next++] : e));
}
