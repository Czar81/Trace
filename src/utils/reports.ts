import { Currency, Envelope, PaymentMethod, Transaction, TransactionCategory } from '../types';

export type ReportPeriod = 'current-month' | 'last-3-months' | 'last-6-months' | 'all-time';

const NONE_BUCKET_ID = '__none__';

/** Resolves a ReportPeriod into an inclusive [start, end] date range, or null for 'all-time'. */
export const resolvePeriodRange = (period: ReportPeriod, now: Date = new Date()): { start: Date; end: Date } | null => {
  if (period === 'all-time') return null;

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

/** Non-archived expense transactions within the given period, converted to a common currency. */
const getExpensesInPeriod = (
  transactions: Transaction[],
  period: ReportPeriod,
  convertToCRC: (amount: number, from: Currency) => number,
  envelopeById: Map<string, Envelope>
): Array<{ transaction: Transaction; amountCRC: number }> => {
  const range = resolvePeriodRange(period);
  return transactions
    .filter(t => !t.isArchived && t.type === 'expense' && inRange(new Date(t.date), range))
    .map(t => {
      const currency = envelopeById.get(t.envelopeId)?.currency ?? 'CRC';
      return { transaction: t, amountCRC: convertToCRC(t.amount, currency) };
    });
};

export interface CategoryTotal {
  categoryId: string;
  name: string;
  totalCRC: number;
  percentage: number;
}

export const getSpendingByCategory = (
  transactions: Transaction[],
  categories: TransactionCategory[],
  envelopes: Envelope[],
  period: ReportPeriod,
  convertToCRC: (amount: number, from: Currency) => number
): CategoryTotal[] => {
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  const categoryById = new Map(categories.map(c => [c.id, c]));
  const expenses = getExpensesInPeriod(transactions, period, convertToCRC, envelopeById);

  const totals = new Map<string, number>();
  for (const { transaction, amountCRC } of expenses) {
    const id = transaction.categoryId ?? NONE_BUCKET_ID;
    totals.set(id, (totals.get(id) ?? 0) + amountCRC);
  }

  const grandTotal = expenses.reduce((sum, e) => sum + e.amountCRC, 0);

  return Array.from(totals.entries())
    .map(([categoryId, totalCRC]) => ({
      categoryId,
      name: categoryId === NONE_BUCKET_ID ? 'Sin categoría' : categoryById.get(categoryId)?.name ?? 'Sin categoría',
      totalCRC,
      percentage: grandTotal > 0 ? (totalCRC / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.totalCRC - a.totalCRC);
};

export interface MonthTotal {
  monthKey: string; // 'YYYY-MM'
  label: string;
  totalCRC: number;
}

const monthKeyOf = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLabelOf = (date: Date): string =>
  date.toLocaleDateString('es-CR', { month: 'short', year: 'numeric' });

export const getSpendingByMonth = (
  transactions: Transaction[],
  envelopes: Envelope[],
  period: ReportPeriod,
  convertToCRC: (amount: number, from: Currency) => number
): MonthTotal[] => {
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  const expenses = getExpensesInPeriod(transactions, period, convertToCRC, envelopeById);

  const totals = new Map<string, { totalCRC: number; date: Date }>();
  for (const { transaction, amountCRC } of expenses) {
    const date = new Date(transaction.date);
    const key = monthKeyOf(date);
    const existing = totals.get(key);
    totals.set(key, { totalCRC: (existing?.totalCRC ?? 0) + amountCRC, date });
  }

  return Array.from(totals.entries())
    .map(([monthKey, { totalCRC, date }]) => ({ monthKey, label: monthLabelOf(date), totalCRC }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
};

export interface EnvelopeTotal {
  envelopeId: string;
  name: string;
  totalCRC: number;
  percentOfLimit: number | null;
}

export const getSpendingByEnvelope = (
  transactions: Transaction[],
  envelopes: Envelope[],
  period: ReportPeriod,
  convertToCRC: (amount: number, from: Currency) => number
): EnvelopeTotal[] => {
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  const expenses = getExpensesInPeriod(transactions, period, convertToCRC, envelopeById);

  const totals = new Map<string, number>();
  for (const { transaction, amountCRC } of expenses) {
    totals.set(transaction.envelopeId, (totals.get(transaction.envelopeId) ?? 0) + amountCRC);
  }

  return Array.from(totals.entries())
    .map(([envelopeId, totalCRC]) => {
      const envelope = envelopeById.get(envelopeId);
      const percentOfLimit =
        envelope && !envelope.isUnlimited && envelope.limit > 0
          ? (convertToCRC(envelope.limit, envelope.currency) > 0
              ? (totalCRC / convertToCRC(envelope.limit, envelope.currency)) * 100
              : null)
          : null;
      return {
        envelopeId,
        name: envelope?.name ?? 'Sobre eliminado',
        totalCRC,
        percentOfLimit,
      };
    })
    .sort((a, b) => b.totalCRC - a.totalCRC);
};

export interface PaymentMethodTotal {
  paymentMethodId: string;
  name: string;
  totalCRC: number;
}

export const getSpendingByPaymentMethod = (
  transactions: Transaction[],
  paymentMethods: PaymentMethod[],
  envelopes: Envelope[],
  period: ReportPeriod,
  convertToCRC: (amount: number, from: Currency) => number
): PaymentMethodTotal[] => {
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  const paymentMethodById = new Map(paymentMethods.map(pm => [pm.id, pm]));
  const expenses = getExpensesInPeriod(transactions, period, convertToCRC, envelopeById);

  const totals = new Map<string, number>();
  for (const { transaction, amountCRC } of expenses) {
    const id = transaction.paymentMethodId ?? NONE_BUCKET_ID;
    totals.set(id, (totals.get(id) ?? 0) + amountCRC);
  }

  return Array.from(totals.entries())
    .map(([paymentMethodId, totalCRC]) => ({
      paymentMethodId,
      name: paymentMethodId === NONE_BUCKET_ID ? 'Sin método' : paymentMethodById.get(paymentMethodId)?.name ?? 'Sin método',
      totalCRC,
    }))
    .sort((a, b) => b.totalCRC - a.totalCRC);
};

export interface MonthlyTrendEntry {
  monthKey: string;
  label: string;
  incomeCRC: number;
  expenseCRC: number;
}

export const getMonthlyTrend = (
  transactions: Transaction[],
  envelopes: Envelope[],
  months: number,
  convertToCRC: (amount: number, from: Currency) => number
): MonthlyTrendEntry[] => {
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  const now = new Date();

  const buckets: MonthlyTrendEntry[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ monthKey: monthKeyOf(date), label: monthLabelOf(date), incomeCRC: 0, expenseCRC: 0 });
  }
  const bucketByKey = new Map(buckets.map(b => [b.monthKey, b]));

  for (const t of transactions) {
    if (t.isArchived) continue;
    const key = monthKeyOf(new Date(t.date));
    const bucket = bucketByKey.get(key);
    if (!bucket) continue;
    const currency = envelopeById.get(t.envelopeId)?.currency ?? 'CRC';
    const amountCRC = convertToCRC(t.amount, currency);
    if (t.type === 'income') bucket.incomeCRC += amountCRC;
    else if (t.type === 'expense') bucket.expenseCRC += amountCRC;
  }

  return buckets;
};

export const TOP_TRANSACTIONS_LIMIT = 10;

export interface TopTransactionEntry {
  transaction: Transaction;
  amountCRC: number;
  envelopeName: string;
  categoryName: string;
}

export const getTopTransactions = (
  transactions: Transaction[],
  categories: TransactionCategory[],
  envelopes: Envelope[],
  period: ReportPeriod,
  convertToCRC: (amount: number, from: Currency) => number,
  limit: number = TOP_TRANSACTIONS_LIMIT
): TopTransactionEntry[] => {
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  const categoryById = new Map(categories.map(c => [c.id, c]));
  const expenses = getExpensesInPeriod(transactions, period, convertToCRC, envelopeById);

  return expenses
    .sort((a, b) => b.amountCRC - a.amountCRC)
    .slice(0, limit)
    .map(({ transaction, amountCRC }) => ({
      transaction,
      amountCRC,
      envelopeName: envelopeById.get(transaction.envelopeId)?.name ?? 'Sobre eliminado',
      categoryName: transaction.categoryId ? categoryById.get(transaction.categoryId)?.name ?? 'Sin categoría' : 'Sin categoría',
    }));
};
