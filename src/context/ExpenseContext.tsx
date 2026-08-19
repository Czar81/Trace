import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as Notifications from 'expo-notifications';
import { Envelope, Transaction, EnvelopeType, PaymentMethod, TransactionCategory, AppSettings, Currency, RecurringTransactionTemplate } from '../types';
import {
  loadEnvelopes, saveEnvelopes,
  loadTransactions, saveTransactions,
  loadPaymentMethods, savePaymentMethods,
  loadCategories, saveCategories,
  loadSettings, saveSettings, DEFAULT_SETTINGS,
  loadRecurringTemplates, saveRecurringTemplates
} from '../utils/storage';
import { pickAndImportBackup } from '../utils/importData';
import { formatCurrency } from '../utils/formatCurrency';
import {
  clampDayOfMonth, getNextDueDate, getOccurrenceKey,
  getDebtCycleDate, getDebtCycleOccurrenceKey, getPreviousDebtCycleDate, DebtCycleAnchor,
} from '../utils/recurrence';

// Re-exported for backward compatibility — other modules import clampDayOfMonth from here.
export { clampDayOfMonth };

/** Strips the time component, keeping year/month/day in local time. */
function dateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Start of the current cutoff period: this month's cutoffDay if we've reached it,
 * otherwise last month's. Clamped to the target month's last day so cutoffDay values
 * like 31 don't roll over into the next month on shorter months.
 */
export function getCutoffPeriodStart(now: Date, cutoffDay: number): Date {
  const targetMonth = now.getDate() >= cutoffDay ? now.getMonth() : now.getMonth() - 1;
  const day = clampDayOfMonth(now.getFullYear(), targetMonth, cutoffDay);
  return new Date(now.getFullYear(), targetMonth, day, 0, 0, 0, 0);
}

/**
 * Pure envelope-balance formula shared by getEnvelopeBalance (live state) and
 * computeSpentPercentage (explicit before/after snapshots for budget alerts).
 * For 'gasto' envelopes with an active cutoff, expenses dated before the current
 * cutoff period start are excluded from the balance.
 */
export function calculateEnvelopeBalance(
  envelopeId: string,
  transactions: Transaction[],
  envelopes: Envelope[],
  expenseCutoffEnabled: boolean,
  expenseCutoffDay: number | null
): number {
  const envelope = envelopes.find(e => e.id === envelopeId);
  // Explicit equality against 'gasto' (not an else-branch), so this already
  // correctly excludes 'ahorro' and 'deuda' envelopes from cutoff filtering.
  const isGastoEnvelope = envelope?.type === 'gasto';
  const hasCutoff = isGastoEnvelope && expenseCutoffEnabled && !!expenseCutoffDay;
  const periodStart = hasCutoff ? getCutoffPeriodStart(new Date(), expenseCutoffDay as number) : null;

  return transactions.reduce((sum, t) => {
    if (t.isArchived) return sum;

    if (hasCutoff && t.type === 'expense' && t.envelopeId === envelopeId && periodStart != null) {
      const transactionDate = new Date(t.date);
      if (transactionDate < periodStart) {
        return sum;
      }
    }

    if (t.envelopeId === envelopeId) {
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }
    if (t.type === 'expense' && t.sourceSavingsEnvelopeId === envelopeId) {
      return sum - t.amount;
    }
    if (t.type === 'transfer' && t.toEnvelopeId === envelopeId) {
      return sum + t.amount;
    }
    return sum;
  }, 0);
}

/**
 * Accrues interest for debt envelopes whose current cycle (per `interestFrequency`/
 * `dueDay`) has been reached and not yet charged. Posts an ordinary 'expense'
 * transaction per envelope ("Interés"), computed as `interestRate% × amount owed`
 * at cycle start — no separate balance math, same formula as any other debt
 * transaction. Pure and side-effect-free; callers persist the results. Envelopes
 * that are not `deuda`, are `isUnlimited`, or have no rate/frequency/dueDay set
 * pass through unchanged.
 */
export function accrueDebtInterest(
  envelopes: Envelope[],
  transactions: Transaction[],
  now: Date
): { updatedEnvelopes: Envelope[]; newTransactions: Transaction[] } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
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
    const cycleDate = getDebtCycleDate(anchor, now);
    if (cycleDate.getTime() > today.getTime()) return envelope;

    const occurrenceKey = getDebtCycleOccurrenceKey(anchor, cycleDate);
    if (envelope.lastInterestAccrualPeriod === occurrenceKey) return envelope;

    const balance = calculateEnvelopeBalance(envelope.id, transactions, envelopes, false, null);
    const amountOwed = envelope.limit - balance;
    // Nothing owed (paid off or overpaid) -> no interest to charge, but the
    // cycle is still marked handled so it isn't re-evaluated on every app open.
    if (amountOwed > 0) {
      const interestAmount = Math.round(amountOwed * (envelope.interestRate / 100) * 100) / 100;
      if (interestAmount > 0) {
        newTransactions.push({
          id: `${Date.now() + idOffset++}-int`,
          envelopeId: envelope.id,
          type: 'expense',
          amount: interestAmount,
          description: 'Interés',
          date: cycleDate.toISOString(),
          isArchived: false,
        });
      }
    }

    return { ...envelope, lastInterestAccrualPeriod: occurrenceKey };
  });

  return { updatedEnvelopes, newTransactions };
}

interface AppContextType {
  envelopes: Envelope[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  categories: TransactionCategory[];
  settings: AppSettings;
  recurringTemplates: RecurringTransactionTemplate[];

  // Envelope CRUD
  addEnvelope: (envelope: Omit<Envelope, 'id'>) => Promise<void>;
  updateEnvelope: (id: string, updates: Partial<Omit<Envelope, 'id'>>) => Promise<void>;
  deleteEnvelope: (id: string) => Promise<void>;
  resetEnvelope: (envelopeId: string) => Promise<void>;
  resetAllEnvelopes: () => Promise<void>;

  // Transaction CRUD
  addTransaction: (transaction: Omit<Transaction, 'id' | 'isArchived'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addTransfer: (transfer: {
    envelopeId: string;
    toEnvelopeId: string;
    amount: number;
    description: string;
    date?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateTransfer: (id: string, updates: {
    envelopeId?: string;
    toEnvelopeId?: string;
    amount?: number;
    description?: string;
    date?: string;
  }) => Promise<{ success: boolean; error?: string }>;

  // Recurring Transaction Template CRUD
  addRecurringTemplate: (template: Omit<RecurringTransactionTemplate, 'id' | 'lastGeneratedPeriod' | 'reminderNotificationId' | 'lastReminderScheduledPeriod'>) => Promise<void>;
  updateRecurringTemplate: (id: string, updates: Partial<Omit<RecurringTransactionTemplate, 'id'>>) => Promise<void>;
  deleteRecurringTemplate: (id: string) => Promise<void>;

  // Payment Methods & Categories CRUD
  addPaymentMethod: (name: string) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;

  // Import/Export
  importFromBackup: () => Promise<{ success: boolean; message: string; errors?: string[] }>;

  // Computed helpers
  getEnvelopeBalance: (envelopeId: string) => number;
  /** Returns total in settings.defaultCurrency */
  getTotalByType: (type: EnvelopeType) => number;
  convertToCRC: (amount: number, from: Currency) => number;
  formatAmount: (amount: number, currency: Currency) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTransactionTemplate[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const initData = async () => {
      const loadedEnvelopes = await loadEnvelopes();
      setEnvelopes(loadedEnvelopes);
      const loadedTransactions = await loadTransactions();
      const loadedTemplates = await loadRecurringTemplates();
      setPaymentMethods(await loadPaymentMethods());
      setCategories(await loadCategories());
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);

      // ─── Automatic generation of due recurring transactions ──────────────
      const now = new Date();
      const today = dateOnly(now);

      const newTransactions: Transaction[] = [];
      let idOffset = 0;
      const finalTemplates = loadedTemplates.map(template => {
        if (!template.isActive) return template;

        const dueDate = getNextDueDate(template, now);
        if (dueDate.getTime() > today.getTime()) return template;

        const occurrenceKey = getOccurrenceKey(template, dueDate);
        if (template.lastGeneratedPeriod === occurrenceKey) return template;

        newTransactions.push({
          id: (Date.now() + idOffset++).toString(),
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

        return { ...template, lastGeneratedPeriod: occurrenceKey };
      });

      // ─── Debt envelope interest accrual ────────────────────────────────────
      const transactionsBeforeDebtProcessing = [...newTransactions, ...loadedTransactions];
      const { updatedEnvelopes: envelopesAfterAccrual, newTransactions: interestTransactions } =
        accrueDebtInterest(loadedEnvelopes, transactionsBeforeDebtProcessing, now);
      const allNewTransactions = [...interestTransactions, ...newTransactions];
      const transactionsAfterAccrual = [...interestTransactions, ...transactionsBeforeDebtProcessing];

      // ─── Debt envelope minimum-payment shortfall check ─────────────────────
      const envelopesAfterMinCheck = await checkMinimumPayments(
        envelopesAfterAccrual,
        transactionsAfterAccrual,
        loadedSettings.billRemindersEnabled,
        now
      );

      // ─── Debt envelope due-date reminder scheduling ─────────────────────────
      const envelopesWithDebtReminders = await scheduleDebtReminders(
        envelopesAfterMinCheck,
        transactionsAfterAccrual,
        loadedSettings.billRemindersEnabled,
        loadedSettings.billReminderLeadDays
      );
      await saveEnvelopes(envelopesWithDebtReminders);
      setEnvelopes(envelopesWithDebtReminders);

      // ─── Bill reminder scheduling for active templates ────────────────────
      const templatesWithReminders = await scheduleBillReminders(
        finalTemplates,
        envelopesWithDebtReminders,
        loadedSettings.billRemindersEnabled,
        loadedSettings.billReminderLeadDays
      );
      await saveRecurringTemplates(templatesWithReminders);
      setRecurringTemplates(templatesWithReminders);

      if (allNewTransactions.length > 0) {
        const finalTransactions = [...allNewTransactions, ...loadedTransactions];
        await saveTransactions(finalTransactions);
        setTransactions(finalTransactions);
      } else {
        setTransactions(loadedTransactions);
      }
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Currency helpers ──────────────────────────────────────────────────────
  const convertToCRC = useCallback((amount: number, from: Currency): number => {
    if (from === 'CRC') return amount;
    if (from === 'USD') return amount * settings.exchangeRates.USD_TO_CRC;
    if (from === 'EUR') return amount * settings.exchangeRates.EUR_TO_CRC;
    return amount;
  }, [settings.exchangeRates]);

  const formatAmount = useCallback((amount: number, currency: Currency): string => {
    return formatCurrency(amount, currency);
  }, []);

  // ─── Balance computation ───────────────────────────────────────────────────
  /**
   * Envelope id -> balance, computed in a single pass over `transactions` so
   * per-envelope lookups (e.g. rendering the envelope list) are O(1) instead of
   * each doing its own O(n) reduce. Mirrors calculateEnvelopeBalance's formula:
   * a transaction affects at most two envelopes (its own envelopeId, and, for
   * expenses funded from savings, sourceSavingsEnvelopeId; or for transfers,
   * toEnvelopeId), so both effects are applied per transaction as the map is built.
   */
  const envelopeBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const envelopeById = new Map(envelopes.map(e => [e.id, e]));
    const cutoffPeriodStart = settings.expenseCutoffEnabled && settings.expenseCutoffDay
      ? getCutoffPeriodStart(new Date(), settings.expenseCutoffDay)
      : null;

    for (const t of transactions) {
      if (t.isArchived) continue;

      if (t.envelopeId) {
        const envelope = envelopeById.get(t.envelopeId);
        // Explicit 'gasto' check — 'ahorro' and 'deuda' envelopes are never cutoff-filtered.
        const hasCutoff = envelope?.type === 'gasto' && cutoffPeriodStart != null;
        const skip = hasCutoff && t.type === 'expense' && new Date(t.date) < (cutoffPeriodStart as Date);
        if (!skip) {
          const delta = t.type === 'income' ? t.amount : -t.amount;
          map.set(t.envelopeId, (map.get(t.envelopeId) ?? 0) + delta);
        }
      }
      if (t.type === 'expense' && t.sourceSavingsEnvelopeId) {
        const sourceId = t.sourceSavingsEnvelopeId;
        map.set(sourceId, (map.get(sourceId) ?? 0) - t.amount);
      }
      if (t.type === 'transfer' && t.toEnvelopeId) {
        const destId = t.toEnvelopeId;
        map.set(destId, (map.get(destId) ?? 0) + t.amount);
      }
    }

    return map;
  }, [transactions, envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay]);

  const getEnvelopeBalance = useCallback((envelopeId: string): number => {
    const cached = envelopeBalanceMap.get(envelopeId);
    if (cached !== undefined) return cached;
    // Fallback for ids not present in the map (e.g. a brand-new envelope with
    // zero transactions) — never hit in practice, but keeps this correct.
    return calculateEnvelopeBalance(envelopeId, transactions, envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay);
  }, [envelopeBalanceMap, transactions, envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay]);

  /**
   * getTotalByType computes the sum of all envelope *available balances*
   * converted to CRC for display in the summary card.
   * For 'gasto': sum of (limit + balance) per envelope — total disponible.
   * For 'ahorro': sum of balances — total ahorrado.
   * For 'deuda': sum of (limit - balance) per non-unlimited envelope — total por pagar.
   */
  const getTotalByType = useCallback((type: EnvelopeType): number => {
    return envelopes
      .filter(e => e.type === type)
      .reduce((total, env) => {
        // Exclude unlimited envelopes from the 'Total Disponible' / 'Total por pagar' totals
        if ((type === 'gasto' || type === 'deuda') && env.isUnlimited) return total;

        const balance = getEnvelopeBalance(env.id);
        const displayValue = type === 'gasto'
          ? env.limit + balance
          : type === 'deuda'
          ? env.limit - balance
          : balance;
        return total + convertToCRC(displayValue, env.currency);
      }, 0);
  }, [envelopes, getEnvelopeBalance, convertToCRC]);

  // ─── Budget alerts (spent-percentage transition detection) ─────────────────
  /**
   * Same formula as getEnvelopeBalance/spent, but takes an explicit transactions
   * array so it can be computed for a "before" and "after" snapshot of a mutation
   * without touching state.
   */
  const computeSpentPercentage = useCallback((envelopeId: string, txns: Transaction[]): number => {
    const envelope = envelopes.find(e => e.id === envelopeId);
    if (!envelope || !envelope.limit) return 0;

    const balance = calculateEnvelopeBalance(envelopeId, txns, envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay);

    const spent = -balance;
    return spent / envelope.limit;
  }, [envelopes, settings.expenseCutoffEnabled, settings.expenseCutoffDay]);

  /**
   * Compares an envelope's spent-percentage before/after a transaction mutation
   * and fires a local notification only on the transition into the 80% or 100%
   * band, per budget-alerts spec. No-op for ahorro envelopes, unlimited gasto
   * envelopes, or when the setting is off.
   */
  const checkBudgetAlerts = useCallback(async (
    envelopeId: string,
    beforeTxns: Transaction[],
    afterTxns: Transaction[]
  ) => {
    if (!settings.budgetAlertsEnabled) return;

    const envelope = envelopes.find(e => e.id === envelopeId);
    // Explicit 'gasto' check — already excludes 'ahorro' and 'deuda' envelopes;
    // a growing debt balance is not "overspending" in the budget-alerts sense.
    if (!envelope || envelope.type !== 'gasto' || envelope.isUnlimited) return;

    const before = computeSpentPercentage(envelopeId, beforeTxns);
    const after = computeSpentPercentage(envelopeId, afterTxns);

    try {
      if (before < 0.8 && after >= 0.8) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Presupuesto al 80%',
            body: `Tu sobre "${envelope.name}" llegó al ${Math.round(after * 100)}% de su presupuesto.`,
          },
          trigger: null,
        });
      }

      if (before < 1.0 && after >= 1.0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Presupuesto excedido',
            body: `Tu sobre "${envelope.name}" superó su presupuesto (${Math.round(after * 100)}%).`,
          },
          trigger: null,
        });
      }
    } catch (e) {
      console.error('Error scheduling budget alert notification', e);
    }
  }, [envelopes, settings.budgetAlertsEnabled, computeSpentPercentage]);

  // ─── Bill reminders (scheduled ahead of a recurring template's due date) ───
  /**
   * Cancels a template's pending scheduled reminder, if any, and clears the
   * bookkeeping fields so the next scheduling pass treats it as unscheduled.
   * Safe to call on a template with no pending reminder (no-op).
   */
  const cancelTemplateReminder = useCallback(async (
    template: RecurringTransactionTemplate
  ): Promise<RecurringTransactionTemplate> => {
    if (!template.reminderNotificationId) return template;
    try {
      await Notifications.cancelScheduledNotificationAsync(template.reminderNotificationId);
    } catch (e) {
      console.error('Error cancelling bill reminder notification', e);
    }
    return { ...template, reminderNotificationId: null, lastReminderScheduledPeriod: null };
  }, []);

  /**
   * Schedules a local notification `leadDays` days before each active template's
   * clamped due date for the current period, skipping templates that already
   * have a reminder scheduled for that occurrence or whose reminder date has
   * already passed. Takes settings/envelopes explicitly (rather than reading
   * component state) so it can be called from app-launch code before the
   * corresponding state has finished updating.
   */
  const scheduleBillReminders = useCallback(async (
    templates: RecurringTransactionTemplate[],
    envelopesList: Envelope[],
    billRemindersEnabled: boolean,
    leadDays: number
  ): Promise<RecurringTransactionTemplate[]> => {
    if (!billRemindersEnabled) return templates;

    const now = new Date();

    return Promise.all(templates.map(async (template) => {
      if (!template.isActive) return template;

      const dueDate = getNextDueDate(template, now);
      const occurrenceKey = getOccurrenceKey(template, dueDate);
      if (template.lastReminderScheduledPeriod === occurrenceKey) return template;

      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - leadDays);

      if (reminderDate.getTime() <= now.getTime()) return template;

      const envelope = envelopesList.find(e => e.id === template.envelopeId);
      const amountLabel = envelope ? formatCurrency(template.amount, envelope.currency) : String(template.amount);

      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Factura próxima',
            body: `"${template.description}" (${amountLabel}) se generará en ${leadDays} días.`,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
        });
        return { ...template, reminderNotificationId: notificationId, lastReminderScheduledPeriod: occurrenceKey };
      } catch (e) {
        console.error('Error scheduling bill reminder notification', e);
        return template;
      }
    }));
  }, []);

  // ─── Debt envelope minimum-payment shortfall alert ─────────────────────────
  /**
   * For each debt envelope with a set `minimumPayment` whose current cycle has
   * been reached and not yet checked, sums that cycle's income (payment)
   * transactions and sends a local notification once per cycle if they fall
   * short. Skipped entirely (tracking field left untouched) while reminders
   * are disabled, so a shortfall is still reported once they're turned back on.
   */
  const checkMinimumPayments = useCallback(async (
    envelopesList: Envelope[],
    transactionsList: Transaction[],
    billRemindersEnabled: boolean,
    now: Date
  ): Promise<Envelope[]> => {
    const today = dateOnly(now);

    return Promise.all(envelopesList.map(async (envelope) => {
      if (
        envelope.type !== 'deuda' || envelope.isUnlimited ||
        !envelope.minimumPayment || envelope.minimumPayment <= 0 ||
        !envelope.interestFrequency || !envelope.dueDay || !billRemindersEnabled
      ) {
        return envelope;
      }

      const anchor: DebtCycleAnchor = {
        interestFrequency: envelope.interestFrequency,
        dueDay: envelope.dueDay,
        dueAnchorMonth: envelope.dueAnchorMonth,
      };
      const cycleDate = getDebtCycleDate(anchor, now);
      if (cycleDate.getTime() > today.getTime()) return envelope;

      const occurrenceKey = getDebtCycleOccurrenceKey(anchor, cycleDate);
      if (envelope.lastMinPaymentCheckPeriod === occurrenceKey) return envelope;

      const windowStart = getPreviousDebtCycleDate(anchor, cycleDate);
      const totalPayments = transactionsList.reduce((sum, t) => {
        if (t.isArchived || t.envelopeId !== envelope.id || t.type !== 'income') return sum;
        const d = new Date(t.date);
        return d.getTime() >= windowStart.getTime() && d.getTime() < cycleDate.getTime() ? sum + t.amount : sum;
      }, 0);

      if (totalPayments < envelope.minimumPayment) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Pago mínimo no cubierto',
              body: `El pago mínimo de "${envelope.name}" no se cubrió este período.`,
            },
            trigger: null,
          });
        } catch (e) {
          console.error('Error scheduling minimum payment notification', e);
        }
      }

      return { ...envelope, lastMinPaymentCheckPeriod: occurrenceKey };
    }));
  }, []);

  // ─── Debt envelope due-date reminders (extends bill-reminders) ─────────────
  /**
   * Cancels a debt envelope's pending scheduled due-date reminder, if any, and
   * clears the bookkeeping fields. Mirrors cancelTemplateReminder. Safe to call
   * on an envelope with no pending reminder (no-op).
   */
  const cancelDebtReminder = useCallback(async (envelope: Envelope): Promise<Envelope> => {
    if (!envelope.dueReminderNotificationId) return envelope;
    try {
      await Notifications.cancelScheduledNotificationAsync(envelope.dueReminderNotificationId);
    } catch (e) {
      console.error('Error cancelling debt due-date reminder notification', e);
    }
    return { ...envelope, dueReminderNotificationId: null, lastDueReminderScheduledPeriod: null };
  }, []);

  /**
   * Schedules a local notification `leadDays` days before each debt envelope's
   * next cycle occurrence, naming the envelope and the amount due (its
   * `minimumPayment` if set, otherwise the amount still owed). Mirrors
   * scheduleBillReminders' shape/dedup logic exactly, applied to envelopes'
   * `dueDay` cycle instead of a recurring template's due date.
   */
  const scheduleDebtReminders = useCallback(async (
    envelopesList: Envelope[],
    transactionsList: Transaction[],
    billRemindersEnabled: boolean,
    leadDays: number
  ): Promise<Envelope[]> => {
    if (!billRemindersEnabled) return envelopesList;

    const now = new Date();

    return Promise.all(envelopesList.map(async (envelope) => {
      if (
        envelope.type !== 'deuda' || envelope.isUnlimited ||
        !envelope.interestFrequency || !envelope.dueDay
      ) {
        return envelope;
      }

      const anchor: DebtCycleAnchor = {
        interestFrequency: envelope.interestFrequency,
        dueDay: envelope.dueDay,
        dueAnchorMonth: envelope.dueAnchorMonth,
      };
      const cycleDate = getDebtCycleDate(anchor, now);
      const occurrenceKey = getDebtCycleOccurrenceKey(anchor, cycleDate);
      if (envelope.lastDueReminderScheduledPeriod === occurrenceKey) return envelope;

      const reminderDate = new Date(cycleDate);
      reminderDate.setDate(reminderDate.getDate() - leadDays);
      if (reminderDate.getTime() <= now.getTime()) return envelope;

      const amountDue = envelope.minimumPayment && envelope.minimumPayment > 0
        ? envelope.minimumPayment
        : Math.max(0, envelope.limit - calculateEnvelopeBalance(envelope.id, transactionsList, envelopesList, false, null));
      const amountLabel = formatCurrency(amountDue, envelope.currency);

      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Vencimiento de deuda próximo',
            body: `"${envelope.name}" vence en ${leadDays} días (${amountLabel}).`,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
        });
        return { ...envelope, dueReminderNotificationId: notificationId, lastDueReminderScheduledPeriod: occurrenceKey };
      } catch (e) {
        console.error('Error scheduling debt due-date reminder notification', e);
        return envelope;
      }
    }));
  }, []);

  // ─── Envelope CRUD ─────────────────────────────────────────────────────────
  const addEnvelope = useCallback(async (envelopeData: Omit<Envelope, 'id'>) => {
    const newEnvelope: Envelope = { ...envelopeData, id: Date.now().toString() };
    const updated = [newEnvelope, ...envelopes];
    setEnvelopes(updated);
    await saveEnvelopes(updated);
    const withReminders = await scheduleDebtReminders(updated, transactions, settings.billRemindersEnabled, settings.billReminderLeadDays);
    setEnvelopes(withReminders);
    await saveEnvelopes(withReminders);
  }, [envelopes, transactions, settings.billRemindersEnabled, settings.billReminderLeadDays, scheduleDebtReminders]);

  const updateEnvelope = useCallback(async (id: string, updates: Partial<Omit<Envelope, 'id'>>) => {
    // Fields that change which cycle a pending debt reminder was scheduled for.
    const changesDebtCycle =
      updates.dueDay !== undefined ||
      updates.interestFrequency !== undefined ||
      updates.dueAnchorMonth !== undefined ||
      updates.isUnlimited !== undefined ||
      updates.type !== undefined;

    let workingEnvelopes = envelopes;
    if (changesDebtCycle) {
      const target = envelopes.find(e => e.id === id);
      if (target) {
        const cancelled = await cancelDebtReminder(target);
        workingEnvelopes = envelopes.map(e => (e.id === id ? cancelled : e));
      }
    }

    const updated = workingEnvelopes.map(e => (e.id === id ? { ...e, ...updates } : e));
    const withReminders = await scheduleDebtReminders(updated, transactions, settings.billRemindersEnabled, settings.billReminderLeadDays);
    setEnvelopes(withReminders);
    await saveEnvelopes(withReminders);
  }, [envelopes, transactions, settings.billRemindersEnabled, settings.billReminderLeadDays, cancelDebtReminder, scheduleDebtReminders]);

  const deleteEnvelope = useCallback(async (id: string) => {
    const target = envelopes.find(e => e.id === id);
    if (target) {
      await cancelDebtReminder(target);
    }
    const updatedEnvelopes = envelopes.filter(e => e.id !== id);
    // Also remove associated transactions
    const updatedTransactions = transactions.filter(t => t.envelopeId !== id);
    setEnvelopes(updatedEnvelopes);
    setTransactions(updatedTransactions);
    await saveEnvelopes(updatedEnvelopes);
    await saveTransactions(updatedTransactions);
  }, [envelopes, transactions, cancelDebtReminder]);

  const archiveTransactions = useCallback(async (envelopeId?: string) => {
    const updatedTransactions = transactions.map(t =>
      !t.isArchived && (envelopeId == null || t.envelopeId === envelopeId)
        ? { ...t, isArchived: true, archivedAt: new Date().toISOString() }
        : t
    );
    setTransactions(updatedTransactions);
    await saveTransactions(updatedTransactions);
  }, [transactions]);

  const resetEnvelope = useCallback((envelopeId: string) => archiveTransactions(envelopeId), [archiveTransactions]);

  const resetAllEnvelopes = useCallback(() => archiveTransactions(), [archiveTransactions]);

  // ─── Transaction CRUD ──────────────────────────────────────────────────────
  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'isArchived'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: Date.now().toString(),
      isArchived: false,
      date: transactionData.date || new Date().toISOString(),
    };
    const updated = [newTransaction, ...transactions];
    setTransactions(updated);
    await saveTransactions(updated);
    if (newTransaction.type === 'expense') {
      await checkBudgetAlerts(newTransaction.envelopeId, transactions, updated);
    }
  }, [transactions, checkBudgetAlerts]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
    const updated = transactions.map(t => (t.id === id ? { ...t, ...updates } : t));
    setTransactions(updated);
    await saveTransactions(updated);
    const updatedTransaction = updated.find(t => t.id === id);
    if (updatedTransaction && updatedTransaction.type === 'expense') {
      await checkBudgetAlerts(updatedTransaction.envelopeId, transactions, updated);
    }
  }, [transactions, checkBudgetAlerts]);

  const deleteTransaction = useCallback(async (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    await saveTransactions(updated);
  }, [transactions]);

  /**
   * Creates a transfer transaction moving `amount` from `envelopeId` (source)
   * to `toEnvelopeId` (destination). Validates same-envelope and currency-match
   * defensively (the UI is expected to validate first, but this guards against
   * any caller that skips that), and never triggers budget alerts since it
   * routes through addTransaction with type 'transfer', which addTransaction
   * only checks alerts for on type === 'expense'.
   */
  const addTransfer = useCallback(async (transfer: {
    envelopeId: string;
    toEnvelopeId: string;
    amount: number;
    description: string;
    date?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (transfer.envelopeId === transfer.toEnvelopeId) {
      return { success: false, error: 'El sobre de origen y destino deben ser diferentes.' };
    }
    const source = envelopes.find(e => e.id === transfer.envelopeId);
    const destination = envelopes.find(e => e.id === transfer.toEnvelopeId);
    if (!source || !destination) {
      return { success: false, error: 'Sobre no encontrado.' };
    }
    if (source.currency !== destination.currency) {
      return { success: false, error: 'Los sobres deben tener la misma moneda.' };
    }

    await addTransaction({
      envelopeId: transfer.envelopeId,
      toEnvelopeId: transfer.toEnvelopeId,
      type: 'transfer',
      amount: transfer.amount,
      description: transfer.description,
      date: transfer.date ?? new Date().toISOString(),
    });
    return { success: true };
  }, [envelopes, addTransaction]);

  /**
   * Updates an existing transfer transaction. Mirrors addTransfer's
   * validate-then-delegate shape: looks up the existing transaction, merges
   * the given updates, re-validates (same-envelope, currency-match) using the
   * merged result, and only then delegates to updateTransaction.
   */
  const updateTransfer = useCallback(async (id: string, updates: {
    envelopeId?: string;
    toEnvelopeId?: string;
    amount?: number;
    description?: string;
    date?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const existing = transactions.find(t => t.id === id);
    if (!existing) {
      return { success: false, error: 'Transferencia no encontrada.' };
    }
    const merged = { ...existing, ...updates };

    if (merged.envelopeId === merged.toEnvelopeId) {
      return { success: false, error: 'El sobre de origen y destino deben ser diferentes.' };
    }
    const source = envelopes.find(e => e.id === merged.envelopeId);
    const destination = envelopes.find(e => e.id === merged.toEnvelopeId);
    if (!source || !destination) {
      return { success: false, error: 'Sobre no encontrado.' };
    }
    if (source.currency !== destination.currency) {
      return { success: false, error: 'Los sobres deben tener la misma moneda.' };
    }

    await updateTransaction(id, {
      envelopeId: merged.envelopeId,
      toEnvelopeId: merged.toEnvelopeId,
      amount: merged.amount,
      description: merged.description,
      date: merged.date,
    });
    return { success: true };
  }, [transactions, envelopes, updateTransaction]);

  // ─── Recurring Transaction Template CRUD ───────────────────────────────────
  const addRecurringTemplate = useCallback(async (
    templateData: Omit<RecurringTransactionTemplate, 'id' | 'lastGeneratedPeriod' | 'reminderNotificationId' | 'lastReminderScheduledPeriod'>
  ) => {
    const newTemplate: RecurringTransactionTemplate = {
      ...templateData,
      id: Date.now().toString(),
      lastGeneratedPeriod: null,
      reminderNotificationId: null,
      lastReminderScheduledPeriod: null,
    };
    const updated = [newTemplate, ...recurringTemplates];
    setRecurringTemplates(updated);
    await saveRecurringTemplates(updated);
    const withReminders = await scheduleBillReminders(updated, envelopes, settings.billRemindersEnabled, settings.billReminderLeadDays);
    setRecurringTemplates(withReminders);
    await saveRecurringTemplates(withReminders);
  }, [recurringTemplates, envelopes, settings.billRemindersEnabled, settings.billReminderLeadDays, scheduleBillReminders]);

  const updateRecurringTemplate = useCallback(async (id: string, updates: Partial<Omit<RecurringTransactionTemplate, 'id'>>) => {
    const changesReminderWindow =
      updates.dayOfMonth !== undefined ||
      updates.dayOfWeek !== undefined ||
      updates.anchorDate !== undefined ||
      updates.month !== undefined ||
      updates.frequency !== undefined ||
      updates.isActive === false;

    let workingTemplates = recurringTemplates;
    if (changesReminderWindow) {
      const target = recurringTemplates.find(t => t.id === id);
      if (target) {
        const cancelled = await cancelTemplateReminder(target);
        workingTemplates = recurringTemplates.map(t => (t.id === id ? cancelled : t));
      }
    }

    const updated = workingTemplates.map(t => (t.id === id ? { ...t, ...updates } : t));
    const withReminders = await scheduleBillReminders(updated, envelopes, settings.billRemindersEnabled, settings.billReminderLeadDays);
    setRecurringTemplates(withReminders);
    await saveRecurringTemplates(withReminders);
  }, [recurringTemplates, envelopes, settings.billRemindersEnabled, settings.billReminderLeadDays, cancelTemplateReminder, scheduleBillReminders]);

  const deleteRecurringTemplate = useCallback(async (id: string) => {
    const target = recurringTemplates.find(t => t.id === id);
    if (target) {
      await cancelTemplateReminder(target);
    }
    const updated = recurringTemplates.filter(t => t.id !== id);
    setRecurringTemplates(updated);
    await saveRecurringTemplates(updated);
  }, [recurringTemplates, cancelTemplateReminder]);

  // ─── Payment Methods CRUD ──────────────────────────────────────────────────
  const addPaymentMethod = useCallback(async (name: string) => {
    const newPM: PaymentMethod = { id: Date.now().toString(), name };
    const updated = [...paymentMethods, newPM];
    setPaymentMethods(updated);
    await savePaymentMethods(updated);
  }, [paymentMethods]);

  const deletePaymentMethod = useCallback(async (id: string) => {
    const updated = paymentMethods.filter(pm => pm.id !== id);
    setPaymentMethods(updated);
    await savePaymentMethods(updated);
  }, [paymentMethods]);

  // ─── Categories CRUD ───────────────────────────────────────────────────────
  const addCategory = useCallback(async (name: string) => {
    const newCat: TransactionCategory = { id: Date.now().toString(), name };
    const updated = [...categories, newCat];
    setCategories(updated);
    await saveCategories(updated);
  }, [categories]);

  const deleteCategory = useCallback(async (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    await saveCategories(updated);
  }, [categories]);

  // ─── Settings ──────────────────────────────────────────────────────────────
  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    if (
      (updates.budgetAlertsEnabled === true && !settings.budgetAlertsEnabled) ||
      (updates.billRemindersEnabled === true && !settings.billRemindersEnabled)
    ) {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (e) {
        console.error('Error requesting notification permissions', e);
      }
    }
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await saveSettings(updated);

    const leadDaysChanged = updates.billReminderLeadDays !== undefined
      && updates.billReminderLeadDays !== settings.billReminderLeadDays;

    if (updates.billRemindersEnabled === true && !settings.billRemindersEnabled) {
      const withReminders = await scheduleBillReminders(recurringTemplates, envelopes, true, updated.billReminderLeadDays);
      setRecurringTemplates(withReminders);
      await saveRecurringTemplates(withReminders);

      const envelopesWithReminders = await scheduleDebtReminders(envelopes, transactions, true, updated.billReminderLeadDays);
      setEnvelopes(envelopesWithReminders);
      await saveEnvelopes(envelopesWithReminders);
    } else if (leadDaysChanged && updated.billRemindersEnabled) {
      // Cancel any already-scheduled reminders so they're rescheduled at the new lead time.
      const cancelled = await Promise.all(recurringTemplates.map(cancelTemplateReminder));
      const withReminders = await scheduleBillReminders(cancelled, envelopes, true, updated.billReminderLeadDays);
      setRecurringTemplates(withReminders);
      await saveRecurringTemplates(withReminders);

      const cancelledEnvelopes = await Promise.all(envelopes.map(cancelDebtReminder));
      const envelopesWithReminders = await scheduleDebtReminders(cancelledEnvelopes, transactions, true, updated.billReminderLeadDays);
      setEnvelopes(envelopesWithReminders);
      await saveEnvelopes(envelopesWithReminders);
    }
  }, [settings, recurringTemplates, envelopes, transactions, scheduleBillReminders, cancelTemplateReminder, scheduleDebtReminders, cancelDebtReminder]);

  // ─── Import/Export ─────────────────────────────────────────────────────────
  const importFromBackup = useCallback(async () => {
    try {
      const importResult = await pickAndImportBackup();
      if (!importResult) {
        return { success: false, message: 'Import cancelled' };
      }

      if (importResult.errors.length > 0) {
        return { success: false, message: 'Errors in file', errors: importResult.errors };
      }

      const backup = importResult.backup;

      // Replace all data with backup data
      setEnvelopes(backup.envelopes);
      setTransactions(backup.transactions);
      setPaymentMethods(backup.paymentMethods);
      setCategories(backup.categories);
      setSettings(backup.settings);

      // Save all
      await saveEnvelopes(backup.envelopes);
      await saveTransactions(backup.transactions);
      await savePaymentMethods(backup.paymentMethods);
      await saveCategories(backup.categories);
      await saveSettings(backup.settings);

      const message = `Backup restored: ${backup.envelopes.length} envelopes, ${backup.transactions.length} transactions, ${backup.categories.length} categories, ${backup.paymentMethods.length} payment methods`;
      return { success: true, message };
    } catch {
      return { success: false, message: 'No se pudo importar el backup. Verifica que el archivo sea válido.' };
    }
  }, []);

  const value = useMemo(() => ({
    envelopes, transactions, paymentMethods, categories, settings, recurringTemplates,
    addEnvelope, updateEnvelope, deleteEnvelope, resetEnvelope, resetAllEnvelopes,
    addTransaction, updateTransaction, deleteTransaction, addTransfer, updateTransfer,
    addRecurringTemplate, updateRecurringTemplate, deleteRecurringTemplate,
    addPaymentMethod, deletePaymentMethod,
    addCategory, deleteCategory,
    updateSettings,
    importFromBackup,
    getEnvelopeBalance, getTotalByType, convertToCRC, formatAmount,
  }), [
    envelopes, transactions, paymentMethods, categories, settings, recurringTemplates,
    addEnvelope, updateEnvelope, deleteEnvelope, resetEnvelope, resetAllEnvelopes,
    addTransaction, updateTransaction, deleteTransaction, addTransfer, updateTransfer,
    addRecurringTemplate, updateRecurringTemplate, deleteRecurringTemplate,
    addPaymentMethod, deletePaymentMethod,
    addCategory, deleteCategory,
    updateSettings,
    importFromBackup,
    getEnvelopeBalance, getTotalByType, convertToCRC, formatAmount,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppData must be used within an AppProvider');
  return context;
};
