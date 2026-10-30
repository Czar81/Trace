import { Envelope, PaymentMethod, Transaction, TransactionCategory } from '../../types';
import { TranslateFn } from '../../i18n';

const BOM = '﻿';

/** Quotes a field when needed and neutralises spreadsheet formulas (=, +, -, @) in text. */
const csvField = (value: string | number, isText = true): string => {
  let text = String(value);
  if (isText && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const dayOf = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface CsvCatalogs {
  envelopes: Envelope[];
  categories: TransactionCategory[];
  incomeCategories: TransactionCategory[];
  paymentMethods: PaymentMethod[];
  t: TranslateFn;
}

/**
 * Builds a UTF-8 CSV (with BOM, so Excel reads accents) of the given transactions in the order
 * received. Amounts are plain positive numbers; `type` says whether they are expense, income or transfer.
 */
export const buildTransactionsCsv = (
  transactions: Transaction[],
  { envelopes, categories, incomeCategories, paymentMethods, t }: CsvCatalogs
): string => {
  const envelopeById = new Map(envelopes.map(e => [e.id, e]));
  const categoryById = new Map([...categories, ...incomeCategories].map(c => [c.id, c]));
  const methodById = new Map(paymentMethods.map(pm => [pm.id, pm]));

  const header = ['date', 'type', 'amount', 'currency', 'envelope', 'category', 'payment_method', 'description', 'notes'];
  const rows = transactions.map(tx => {
    const envelope = envelopeById.get(tx.envelopeId);
    const envelopeName =
      tx.type === 'transfer'
        ? `${envelope?.name ?? t('common.deletedEnvelope')} → ${envelopeById.get(tx.toEnvelopeId ?? '')?.name ?? t('common.deletedEnvelope')}`
        : envelope?.name ?? t('common.deletedEnvelope');
    return [
      csvField(dayOf(tx.date), false),
      csvField(tx.type, false),
      csvField(tx.amount, false),
      csvField(envelope?.currency ?? 'CRC', false),
      csvField(envelopeName),
      csvField(tx.categoryId ? categoryById.get(tx.categoryId)?.name ?? '' : ''),
      csvField(tx.paymentMethodId ? methodById.get(tx.paymentMethodId)?.name ?? '' : ''),
      csvField(tx.description),
      csvField(tx.notes ?? ''),
    ].join(',');
  });

  return BOM + [header.join(','), ...rows].join('\r\n') + '\r\n';
};
