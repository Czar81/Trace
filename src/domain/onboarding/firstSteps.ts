import { Envelope, Transaction } from '../../types';

export const FIRST_STEP_IDS = ['createEnvelope', 'assignIncome', 'firstExpense', 'transfer', 'backup'] as const;
export type FirstStepId = typeof FIRST_STEP_IDS[number];

export interface FirstStepsInput {
  envelopes: Pick<Envelope, 'id'>[];
  transactions: Pick<Transaction, 'type'>[];
  backupEnabled: boolean;
  lastBackupAt: string | null;
}

/** Which first steps the user has already done, derived from their real data (nothing is stored per step). */
export const getFirstStepsProgress = ({ envelopes, transactions, backupEnabled, lastBackupAt }: FirstStepsInput): Record<FirstStepId, boolean> => ({
  createEnvelope: envelopes.length > 0,
  assignIncome: transactions.some(tx => tx.type === 'income'),
  firstExpense: transactions.some(tx => tx.type === 'expense'),
  transfer: transactions.some(tx => tx.type === 'transfer'),
  backup: backupEnabled || lastBackupAt != null,
});

export const countCompletedSteps = (progress: Record<FirstStepId, boolean>) =>
  FIRST_STEP_IDS.filter(id => progress[id]).length;
