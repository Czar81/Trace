import { useCallback, useMemo } from 'react';
import { Transaction } from '../../types';
import { Store } from '../useDataStore';
import { newId } from '../../domain/shared/helpers';
import { roundMoney, calculateEnvelopeBalance } from '../../domain/budget/balance';
import { validateTransfer } from '../../domain/transactions/transfer';
import { translateActive } from '../../i18n';
import { deleteUnreferencedReceipts } from '../../services/files/receipts';
import { isExpoGo, notifyBudgetThreshold } from '../../services/notifications/notifications';

type NewTransaction = Omit<Transaction, 'id' | 'isArchived'>;
type TransferResult = Promise<{ success: boolean; error?: string }>;
interface TransferFields {
  envelopeId: string;
  toEnvelopeId: string;
  amount: number;
  description: string;
  notes?: string;
  date?: string;
}

export function useTransactionActions({ data, runExclusive, commit }: Store) {
  /**
   * Compares an envelope's spent fraction before/after a transaction mutation
   * and notifies on the transition into the 80% or 100% band, per budget-alerts
   * spec. No-op for non-'gasto' envelopes (a growing debt balance is not
   * "overspending"), unlimited ones, or when the setting is off.
   */
  const checkBudgetAlerts = useCallback(async (envelopeId: string, beforeTxns: Transaction[], afterTxns: Transaction[]) => {
    const { envelopes: envs, settings: s } = data.current;
    if (!s.budgetAlertsEnabled || isExpoGo) return;

    const envelope = envs.find(e => e.id === envelopeId);
    if (!envelope || envelope.type !== 'gasto' || envelope.isUnlimited || !envelope.limit) return;

    const spent = (txns: Transaction[]) =>
      -calculateEnvelopeBalance(envelopeId, txns, envs, s.expenseCutoffDay) / envelope.limit;
    await notifyBudgetThreshold(envelope, spent(beforeTxns), spent(afterTxns));
  }, [data]);

  const build = (item: NewTransaction): Transaction => ({
    ...item,
    amount: roundMoney(item.amount),
    id: newId(),
    isArchived: false,
    date: item.date || new Date().toISOString(),
  });

  const addTransaction = useCallback((transactionData: NewTransaction) => runExclusive(async () => {
    const before = data.current.transactions;
    const created = build(transactionData);
    const updated = [created, ...before];
    await commit({ transactions: updated });
    if (created.type === 'expense') await checkBudgetAlerts(created.envelopeId, before, updated);
  }), [data, runExclusive, commit, checkBudgetAlerts]);

  /** Adds several transactions with a single save (avoids stale-state clobbering from looping addTransaction). */
  const addTransactions = useCallback((list: NewTransaction[]) => runExclusive(async () => {
    if (list.length === 0) return;
    const before = data.current.transactions;
    const created = list.map(build);
    const updated = [...created.slice().reverse(), ...before];
    await commit({ transactions: updated });
    const expenseEnvelopeIds = new Set(created.filter(c => c.type === 'expense').map(c => c.envelopeId));
    for (const envelopeId of expenseEnvelopeIds) {
      await checkBudgetAlerts(envelopeId, before, updated);
    }
  }), [data, runExclusive, commit, checkBudgetAlerts]);

  const updateTransaction = useCallback((id: string, updates: Partial<Omit<Transaction, 'id'>>) => runExclusive(async () => {
    const before = data.current.transactions;
    const normalized = updates.amount !== undefined ? { ...updates, amount: roundMoney(updates.amount) } : updates;
    const updated = before.map(t => (t.id === id ? { ...t, ...normalized } : t));
    await commit({ transactions: updated });
    if (updates.receiptUris !== undefined) {
      const kept = new Set(updates.receiptUris);
      await deleteUnreferencedReceipts(
        before.find(t => t.id === id)?.receiptUris?.filter(uri => !kept.has(uri)),
        updated
      );
    }
    const updatedTransaction = updated.find(t => t.id === id);
    if (updatedTransaction && updatedTransaction.type === 'expense') {
      await checkBudgetAlerts(updatedTransaction.envelopeId, before, updated);
    }
  }), [data, runExclusive, commit, checkBudgetAlerts]);

  const deleteTransaction = useCallback((id: string) => runExclusive(async () => {
    const before = data.current.transactions;
    const updated = before.filter(t => t.id !== id);
    await commit({ transactions: updated });
    await deleteUnreferencedReceipts(before.find(t => t.id === id)?.receiptUris, updated);
  }), [data, runExclusive, commit]);

  const archiveTransactions = useCallback((envelopeId?: string) => runExclusive(async () => {
    const archivedAt = new Date().toISOString();
    const updatedTransactions = data.current.transactions.map(t =>
      !t.isArchived && (envelopeId == null || t.envelopeId === envelopeId)
        ? { ...t, isArchived: true, archivedAt }
        : t
    );
    await commit({ transactions: updatedTransactions });
  }), [data, runExclusive, commit]);

  const resetEnvelope = useCallback((envelopeId: string) => archiveTransactions(envelopeId), [archiveTransactions]);
  const resetAllEnvelopes = useCallback(() => archiveTransactions(), [archiveTransactions]);

  /**
   * Creates a transfer transaction moving `amount` from `envelopeId` (source)
   * to `toEnvelopeId` (destination). Validates same-envelope and currency-match
   * defensively (the UI is expected to validate first), and never triggers
   * budget alerts since addTransaction only checks them for expenses.
   */
  const addTransfer = useCallback(async (transfer: TransferFields): TransferResult => {
    // Validate against the data as it will be once earlier queued changes land.
    await runExclusive(async () => undefined);
    const error = validateTransfer(data.current.envelopes, transfer.envelopeId, transfer.toEnvelopeId);
    if (error) return { success: false, error };

    await addTransaction({
      envelopeId: transfer.envelopeId,
      toEnvelopeId: transfer.toEnvelopeId,
      type: 'transfer',
      amount: transfer.amount,
      description: transfer.description,
      notes: transfer.notes,
      date: transfer.date ?? new Date().toISOString(),
    });
    return { success: true };
  }, [data, runExclusive, addTransaction]);

  /**
   * Updates an existing transfer transaction: merges the updates into the
   * existing one, re-validates the result with the same rules as addTransfer,
   * and only then delegates to updateTransaction.
   */
  const updateTransfer = useCallback(async (id: string, updates: Partial<TransferFields>): TransferResult => {
    await runExclusive(async () => undefined);
    const existing = data.current.transactions.find(t => t.id === id);
    if (!existing) {
      return { success: false, error: translateActive('transfer.error.notFound') };
    }
    const merged = { ...existing, ...updates };
    const error = validateTransfer(data.current.envelopes, merged.envelopeId, merged.toEnvelopeId);
    if (error) return { success: false, error };

    await updateTransaction(id, {
      envelopeId: merged.envelopeId,
      toEnvelopeId: merged.toEnvelopeId,
      amount: merged.amount,
      description: merged.description,
      date: merged.date,
    });
    return { success: true };
  }, [data, runExclusive, updateTransaction]);

  return useMemo(() => ({
    addTransaction, addTransactions, updateTransaction, deleteTransaction,
    addTransfer, updateTransfer, resetEnvelope, resetAllEnvelopes,
  }), [addTransaction, addTransactions, updateTransaction, deleteTransaction,
    addTransfer, updateTransfer, resetEnvelope, resetAllEnvelopes]);
}
