import { reorderEnvelopesOfType } from './envelopeOrder';
import { Envelope } from '../../types';

const env = (id: string, type: Envelope['type']): Envelope => ({
  id, name: id, type, currency: 'CRC', limit: 0, isUnlimited: true, icon: 'x', color: '#000',
});

describe('reorderEnvelopesOfType', () => {
  const list = [env('g1', 'gasto'), env('a1', 'ahorro'), env('g2', 'gasto'), env('g3', 'gasto'), env('d1', 'deuda')];

  it('reorders one type and leaves the other types in their slots', () => {
    const result = reorderEnvelopesOfType(list, 'gasto', ['g3', 'g1', 'g2']);
    expect(result.map(e => e.id)).toEqual(['g3', 'a1', 'g1', 'g2', 'd1']);
  });

  it('keeps ids missing from the new order after the listed ones', () => {
    const result = reorderEnvelopesOfType(list, 'gasto', ['g3']);
    expect(result.map(e => e.id)).toEqual(['g3', 'a1', 'g1', 'g2', 'd1']);
  });

  it('does not mutate the input and ignores unknown ids', () => {
    const result = reorderEnvelopesOfType(list, 'ahorro', ['zzz', 'a1']);
    expect(result.map(e => e.id)).toEqual(['g1', 'a1', 'g2', 'g3', 'd1']);
    expect(list.map(e => e.id)).toEqual(['g1', 'a1', 'g2', 'g3', 'd1']);
  });
});
