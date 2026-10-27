import { Envelope, RecurringTransactionTemplate, Transaction } from '../types';
import { translateActive } from '../i18n';
import { DebtCycleAnchor, getDebtCycleOccurrenceKey, getOccurrenceKey, getPendingDebtCycles, getPendingOccurrences } from './recurrence';
import { computeEnvelopeBalances, roundMoney } from './balance';

/**
 * Generates the transactions of every due occurrence of each active template,
 * including periods missed while the app was closed, and advances
 * `lastGeneratedPeriod` to the newest one. Pure; callers persist the results.
 * New transactions are returned newest first, matching the stored order.
 */
export function generateRecurringTransactions(
  templates: RecurringTransactionTemplate[],
  now: Date
): { updatedTemplates: RecurringTransactionTemplate[]; newTransactions: Transaction[] } {
  const generated: Transaction[] = [];
  let idOffset = 0;
  const base = now.getTime();

  const updatedTemplates = templates.map(template => {
    const dueDates = getPendingOccurrences(template, now);
    if (dueDates.length === 0) return template;

    for (const dueDate of dueDates) {
      generated.push({
        id: (base + idOffset++).toString(),
        envelopeId: template.envelopeId,
        type: template.type,
        amount: template.amount,
        description: template.description,
        date: dueDate.toISOString(),
        paymentMethodId: template.paymentMethodId,
        categoryId: template.categoryId,
        sourceSavingsEnvelopeId: template.sourceSavingsEnvelopeId,
        isArchived: false,
      });
    }

    return { ...template, lastGeneratedPeriod: getOccurrenceKey(template, dueDates[dueDates.length - 1]) };
  });

  return { updatedTemplates, newTransactions: generated.reverse() };
}

/**
 * Accrues interest for debt envelopes for every cycle (per `interestFrequency`/
 * `dueDay`) reached and not yet charged, oldest first, so cycles missed while
 * the app was closed are charged too and compound. Each charge is an ordinary
 * 'expense' transaction ("Interés") of `interestRate% × amount owed` as of that
 * cycle's date. Pure and side-effect-free; callers persist the results.
 * Envelopes that are not `deuda`, are `isUnlimited`, or have no
 * rate/frequency/dueDay set pass through unchanged.
 */
export function accrueDebtInterest(
  envelopes: Envelope[],
  transactions: Transaction[],
  now: Date
): { updatedEnvelopes: Envelope[]; newTransactions: Transaction[] } {
  const newTransactions: Transaction[] = [];
  let idOffset = 0;

  const updatedEnvelopes = envelopes.map(envelope => {
    if (
      envelope.type !== 'deuda' || envelope.isUnlimited ||
      !envelope.interestRate || envelope.interestRate <= 0 ||
      !envelope.interestFrequency || !envelope.dueDay
    ) {
      return envelope;
    }

    const anchor: DebtCycleAnchor = {
      interestFrequency: envelope.interestFrequency,
      dueDay: envelope.dueDay,
      dueAnchorMonth: envelope.dueAnchorMonth,
    };
    const cycles = getPendingDebtCycles(anchor, envelope.lastInterestAccrualPeriod, now);
    if (cycles.length === 0) return envelope;

    const charged: Transaction[] = [];
    for (const cycleDate of cycles) {
      const endOfCycleDay = new Date(cycleDate.getFullYear(), cycleDate.getMonth(), cycleDate.getDate() + 1);
      const asOfCycle = [...charged, ...transactions].filter(t => new Date(t.date) < endOfCycleDay);
      const balance = computeEnvelopeBalances(asOfCycle, [envelope], false, null).get(envelope.id) ?? 0;
      const amountOwed = envelope.limit - balance;
      // Nothing owed (paid off or overpaid) -> no interest to charge, but the
      // cycle is still marked handled so it isn't re-evaluated on every app open.
      if (amountOwed <= 0) continue;
      const interestAmount = roundMoney(amountOwed * (envelope.interestRate / 100));
      if (interestAmount <= 0) continue;
      charged.push({
        id: `${now.getTime() + idOffset++}-int`,
        envelopeId: envelope.id,
        type: 'expense',
        amount: interestAmount,
        description: translateActive('debt.interestDescription'),
        date: cycleDate.toISOString(),
        isArchived: false,
      });
    }

    newTransactions.unshift(...charged.reverse());
    return { ...envelope, lastInterestAccrualPeriod: getDebtCycleOccurrenceKey(anchor, cycles[cycles.length - 1]) };
  });

  return { updatedEnvelopes, newTransactions };
}
