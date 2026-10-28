import { Currency, Envelope, PaymentMethod, Transaction, TransactionCategory } from '../../types';
import { roundMoney } from '../budget/balance';
import { TranslateFn, translateDefault } from '../../i18n';

/** Language-dependent pieces of a report: fallback names and month labels. */
export interface ReportI18n {
  t: TranslateFn;
  locale: string;
}

/** Spanish, matching the labels reports produced before localization. */
export const DEFAULT_REPORT_I18N: ReportI18n = { t: translateDefault, locale: 'es-CR' };

export type ReportPeriod =
  | 'current-month'
  | 'last-3-months'
  | 'last-6-months'
  | 'all-time'
  | { kind: 'custom'; start: Date; end: Date };

const NONE_BUCKET_ID = '__none__';

/** Resolves a ReportPeriod into an inclusive [start, end] date range, or null for 'all-time'. */
export const resolvePeriodRange = (period: ReportPeriod, now: Date = new Date()): { start: Date; end: Date } | null => {
  if (period === 'all-time') return null;
  if (typeof period === 'object') {
    const start = new Date(period.start.getFullYear(), period.start.getMonth(), period.start.getDate(), 0, 0, 0, 0);
    const end = new Date(period.end.getFullYear(), period.end.getMonth(), period.end.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  const end = now;
  if (period === 'current-month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { start, end };
  }
  const monthsBack = period === 'last-3-months' ? 2 : 5;
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1, 0, 0, 0, 0);
  return { start, end };
};

const inRange = (date: Date, range: { start: Date; end: Date } | null): boolean => {
  if (!range) return true;
  return date >= range.start && date <= range.end;
};

/** Currencies are never mixed in a report: keep only the transactions of envelopes in `currency`. */
export const filterByCurrency = (
  transactions: Transaction[],
  envelopes: Envelope[],
  currency: Currency
): Transaction[] => {
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  return transactions.filter(t => (envelopeById.get(t.envelopeId)?.currency ?? 'CRC') === currency);
};

/** Non-archived expense transactions within the given period. */
const getExpensesInPeriod = (
  transactions: Transaction[],
  period: ReportPeriod
): Array<{ transaction: Transaction; amount: number }> => {
  const range = resolvePeriodRange(period);
  return transactions
    .filter(t => !t.isArchived && t.type === 'expense' && inRange(new Date(t.date), range))
    .map(t => ({ transaction: t, amount: t.amount }));
};

export interface CategoryTotal {
  categoryId: string;
  name: string;
  total: number;
  percentage: number;
}

export const getSpendingByCategory = (
  transactions: Transaction[],
  categories: TransactionCategory[],
  period: ReportPeriod,
  { t }: ReportI18n = DEFAULT_REPORT_I18N
): CategoryTotal[] => {
  const categoryById = new Map(categories.map(c => [c.id, c]));
  const expenses = getExpensesInPeriod(transactions, period);

  const totals = new Map<string, number>();
  for (const { transaction, amount } of expenses) {
    const id = transaction.categoryId ?? NONE_BUCKET_ID;
    totals.set(id, (totals.get(id) ?? 0) + amount);
  }

  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return Array.from(totals.entries())
    .map(([categoryId, total]) => ({
      categoryId,
      name: categoryId === NONE_BUCKET_ID ? t('common.noCategory') : categoryById.get(categoryId)?.name ?? t('common.noCategory'),
      total: roundMoney(total),
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
};

export interface MonthTotal {
  monthKey: string; // 'YYYY-MM'
  label: string;
  total: number;
}

const monthKeyOf = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLabelOf = (date: Date, locale: string): string =>
  date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });

export const getSpendingByMonth = (
  transactions: Transaction[],
  period: ReportPeriod,
  { locale }: ReportI18n = DEFAULT_REPORT_I18N
): MonthTotal[] => {
  const expenses = getExpensesInPeriod(transactions, period);

  const totals = new Map<string, { total: number; date: Date }>();
  for (const { transaction, amount } of expenses) {
    const date = new Date(transaction.date);
    const key = monthKeyOf(date);
    const existing = totals.get(key);
    totals.set(key, { total: (existing?.total ?? 0) + amount, date });
  }

  return Array.from(totals.entries())
    .map(([monthKey, { total, date }]) => ({ monthKey, label: monthLabelOf(date, locale), total: roundMoney(total) }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
};

export interface EnvelopeTotal {
  envelopeId: string;
  name: string;
  total: number;
  percentOfLimit: number | null;
}

export const getSpendingByEnvelope = (
  transactions: Transaction[],
  envelopes: Envelope[],
  period: ReportPeriod,
  { t }: ReportI18n = DEFAULT_REPORT_I18N
): EnvelopeTotal[] => {
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  const expenses = getExpensesInPeriod(transactions, period);

  const totals = new Map<string, number>();
  for (const { transaction, amount } of expenses) {
    totals.set(transaction.envelopeId, (totals.get(transaction.envelopeId) ?? 0) + amount);
  }

  return Array.from(totals.entries())
    .map(([envelopeId, total]) => {
      const envelope = envelopeById.get(envelopeId);
      const percentOfLimit =
        envelope && !envelope.isUnlimited && envelope.limit > 0
          ? (total / envelope.limit) * 100
          : null;
      return {
        envelopeId,
        name: envelope?.name ?? t('common.deletedEnvelope'),
        total: roundMoney(total),
        percentOfLimit,
      };
    })
    .sort((a, b) => b.total - a.total);
};

export interface PaymentMethodTotal {
  paymentMethodId: string;
  name: string;
  total: number;
}

export const getSpendingByPaymentMethod = (
  transactions: Transaction[],
  paymentMethods: PaymentMethod[],
  period: ReportPeriod,
  { t }: ReportI18n = DEFAULT_REPORT_I18N
): PaymentMethodTotal[] => {
  const paymentMethodById = new Map(paymentMethods.map(pm => [pm.id, pm]));
  const expenses = getExpensesInPeriod(transactions, period);

  const totals = new Map<string, number>();
  for (const { transaction, amount } of expenses) {
    const id = transaction.paymentMethodId ?? NONE_BUCKET_ID;
    totals.set(id, (totals.get(id) ?? 0) + amount);
  }

  return Array.from(totals.entries())
    .map(([paymentMethodId, total]) => ({
      paymentMethodId,
      name: paymentMethodId === NONE_BUCKET_ID ? t('common.noMethod') : paymentMethodById.get(paymentMethodId)?.name ?? t('common.noMethod'),
      total: roundMoney(total),
    }))
    .sort((a, b) => b.total - a.total);
};

export interface MonthlyTrendEntry {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
}

export const getMonthlyTrend = (
  transactions: Transaction[],
  months: number,
  { locale }: ReportI18n = DEFAULT_REPORT_I18N
): MonthlyTrendEntry[] => {
  const now = new Date();

  const buckets: MonthlyTrendEntry[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ monthKey: monthKeyOf(date), label: monthLabelOf(date, locale), income: 0, expense: 0 });
  }
  const bucketByKey = new Map(buckets.map(b => [b.monthKey, b]));

  for (const t of transactions) {
    if (t.isArchived) continue;
    const key = monthKeyOf(new Date(t.date));
    const bucket = bucketByKey.get(key);
    if (!bucket) continue;
    if (t.type === 'income') bucket.income += t.amount;
    else if (t.type === 'expense') bucket.expense += t.amount;
  }

  return buckets.map(b => ({ ...b, income: roundMoney(b.income), expense: roundMoney(b.expense) }));
};

export const TOP_TRANSACTIONS_LIMIT = 10;

export interface TopTransactionEntry {
  transaction: Transaction;
  amount: number;
  envelopeName: string;
  categoryName: string;
}

export const getTopTransactions = (
  transactions: Transaction[],
  categories: TransactionCategory[],
  envelopes: Envelope[],
  period: ReportPeriod,
  limit: number = TOP_TRANSACTIONS_LIMIT,
  { t }: ReportI18n = DEFAULT_REPORT_I18N
): TopTransactionEntry[] => {
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  const categoryById = new Map(categories.map(c => [c.id, c]));
  const expenses = getExpensesInPeriod(transactions, period);

  return expenses
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map(({ transaction, amount }) => ({
      transaction,
      amount,
      envelopeName: envelopeById.get(transaction.envelopeId)?.name ?? t('common.deletedEnvelope'),
      categoryName: transaction.categoryId ? categoryById.get(transaction.categoryId)?.name ?? t('common.noCategory') : t('common.noCategory'),
    }));
};

export interface ReportSummary {
  income: number;
  expenses: number;
  net: number;
  averageExpense: number | null;
  expenseCount: number;
}

/** Income/expense totals for the period, converted to a common currency. Archived transactions are excluded. */
export const getSummary = (
  transactions: Transaction[],
  period: ReportPeriod,
): ReportSummary => {
  const range = resolvePeriodRange(period);

  let income = 0;
  let expenses = 0;
  let expenseCount = 0;
  for (const t of transactions) {
    if (t.isArchived || !inRange(new Date(t.date), range)) continue;
    if (t.type === 'income') {
      income += t.amount;
    } else if (t.type === 'expense') {
      expenses += t.amount;
      expenseCount += 1;
    }
  }

  return {
    income: roundMoney(income),
    expenses: roundMoney(expenses),
    net: roundMoney(income - expenses),
    averageExpense: expenseCount > 0 ? roundMoney(expenses / expenseCount) : null,
    expenseCount,
  };
};

export type ReportSectionId = 'byCategory' | 'byMonth' | 'byEnvelope' | 'byPaymentMethod' | 'trend' | 'topTransactions';

export interface ReportLayoutItem {
  id: ReportSectionId;
  visible: boolean;
}

/** Default section order and visibility. Add new sections here so saved layouts pick them up. */
export const REPORT_SECTIONS: ReportLayoutItem[] = [
  { id: 'byCategory', visible: true },
  { id: 'byMonth', visible: true },
  { id: 'byEnvelope', visible: true },
  { id: 'byPaymentMethod', visible: true },
  { id: 'trend', visible: true },
  { id: 'topTransactions', visible: true },
];

const defaultLayout = (): ReportLayoutItem[] => REPORT_SECTIONS.map(s => ({ ...s }));

/** Parses a stored layout: drops unknown IDs and duplicates, appends missing IDs in default order, falls back to default on invalid input. */
export const parseReportLayout = (raw: string | null | undefined): ReportLayoutItem[] => {
  if (!raw) return defaultLayout();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultLayout();
  }
  if (!Array.isArray(parsed)) return defaultLayout();

  const defaults = new Map(REPORT_SECTIONS.map(s => [s.id as string, s]));
  const seen = new Set<string>();
  const result: ReportLayoutItem[] = [];
  for (const entry of parsed) {
    const id = entry && typeof entry === 'object' ? (entry as { id?: unknown }).id : undefined;
    if (typeof id !== 'string' || !defaults.has(id) || seen.has(id)) continue;
    seen.add(id);
    const visible = (entry as { visible?: unknown }).visible;
    result.push({ id: id as ReportSectionId, visible: typeof visible === 'boolean' ? visible : true });
  }
  for (const s of REPORT_SECTIONS) {
    if (!seen.has(s.id)) result.push({ ...s });
  }
  return result;
};
