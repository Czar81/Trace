import { buildTransactionsCsv } from './transactionsCsv';
import { parseCsv } from './bankCsv';
import { translateDefault } from '../../i18n';
import { Envelope, Transaction } from '../../types';

const envelope = { id: 'e1', name: 'Comida', currency: 'CRC' } as Envelope;
const base: Transaction = {
  id: 't1', envelopeId: 'e1', type: 'expense', amount: 1500.5, description: 'Café, "grande"',
  date: new Date(2026, 9, 5, 12).toISOString(), isArchived: false,
};
const catalogs = {
  envelopes: [envelope, { ...envelope, id: 'e2', name: 'Ahorro' } as Envelope],
  categories: [{ id: 'c1', name: 'Salidas' }],
  incomeCategories: [],
  paymentMethods: [{ id: 'p1', name: 'Tarjeta' }],
  t: translateDefault,
} as unknown as Parameters<typeof buildTransactionsCsv>[1];

describe('buildTransactionsCsv', () => {
  it('writes a header, escapes quotes and commas, and starts with a BOM', () => {
    const csv = buildTransactionsCsv([{ ...base, categoryId: 'c1', paymentMethodId: 'p1' }], catalogs);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const table = parseCsv(csv);
    expect(table.headers).toEqual(['date', 'type', 'amount', 'currency', 'envelope', 'category', 'payment_method', 'description', 'notes']);
    expect(table.rows[0]).toEqual(['2026-10-05', 'expense', '1500.5', 'CRC', 'Comida', 'Salidas', 'Tarjeta', 'Café, "grande"', '']);
  });

  it('neutralises spreadsheet formulas in text fields', () => {
    const csv = buildTransactionsCsv([{ ...base, description: '=HYPERLINK("x")' }], catalogs);
    expect(parseCsv(csv).rows[0][7]).toBe(`'=HYPERLINK("x")`);
  });

  it('shows both sides of a transfer', () => {
    const csv = buildTransactionsCsv([{ ...base, type: 'transfer', toEnvelopeId: 'e2' }], catalogs);
    expect(parseCsv(csv).rows[0][4]).toBe('Comida → Ahorro');
  });
});
