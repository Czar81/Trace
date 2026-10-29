import { countCompletedSteps, getFirstStepsProgress } from './firstSteps';

const empty = { envelopes: [], transactions: [], backupEnabled: false, lastBackupAt: null };

describe('getFirstStepsProgress', () => {
  it('starts with nothing done', () => {
    const progress = getFirstStepsProgress(empty);
    expect(countCompletedSteps(progress)).toBe(0);
  });

  it('marks each step from the matching data', () => {
    const progress = getFirstStepsProgress({
      envelopes: [{ id: 'e1' }],
      transactions: [{ type: 'income' }, { type: 'expense' }],
      backupEnabled: false,
      lastBackupAt: null,
    });
    expect(progress).toEqual({ createEnvelope: true, assignIncome: true, firstExpense: true, transfer: false, backup: false });
    expect(countCompletedSteps(progress)).toBe(3);
  });

  it('counts a transfer and either kind of backup', () => {
    expect(getFirstStepsProgress({ ...empty, transactions: [{ type: 'transfer' }] }).transfer).toBe(true);
    expect(getFirstStepsProgress({ ...empty, backupEnabled: true }).backup).toBe(true);
    expect(getFirstStepsProgress({ ...empty, lastBackupAt: '2026-10-29T00:00:00.000Z' }).backup).toBe(true);
  });
});
