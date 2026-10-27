export interface CsvTable {
  headers: string[];
  rows: string[][];
}

export interface ColumnMapping {
  date: number;
  description: number;
  amount: number;
}

export interface BankRow {
  date: string; // ISO
  description: string;
  /** Positive = money in, negative = money out (before any sign inversion). */
  amount: number;
}

const detectDelimiter = (firstLine: string): string => {
  const counts = [',', ';', '\t'].map(d => ({ d, n: firstLine.split(d).length - 1 }));
  return counts.sort((a, b) => b.n - a.n)[0].d;
};

/** Minimal RFC-4180 style parser: quoted fields, escaped quotes, comma/semicolon/tab delimiters. */
export const parseCsv = (text: string): CsvTable => {
  const clean = text.replace(/^﻿/, '');
  const delimiter = detectDelimiter(clean.split(/\r?\n/, 1)[0] ?? '');
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"' && clean[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(field); field = '';
      records.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); records.push(row); }

  const nonEmpty = records.filter(r => r.some(f => f.trim() !== ''));
  const [headers = [], ...rows] = nonEmpty;
  return { headers: headers.map(h => h.trim()), rows };
};

const DATE_HINTS = ['fecha', 'date', 'dia', 'día'];
const DESCRIPTION_HINTS = ['descripcion', 'descripción', 'detalle', 'concepto', 'description', 'memo', 'payee', 'referencia'];
const AMOUNT_HINTS = ['monto', 'importe', 'amount', 'valor', 'total'];

const findHeader = (headers: string[], hints: string[]): number =>
  headers.findIndex(h => hints.some(hint => h.toLowerCase().includes(hint)));

/** Best-effort guess of which column holds what, from header names. -1 when not found. */
export const guessMapping = (headers: string[]): ColumnMapping => ({
  date: findHeader(headers, DATE_HINTS),
  description: findHeader(headers, DESCRIPTION_HINTS),
  amount: findHeader(headers, AMOUNT_HINTS),
});

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY (day first, as Costa Rican banks export) and 2-digit years. */
export const parseBankDate = (raw: string): Date | null => {
  const s = raw.trim().split(/[ T]/)[0];
  let y: number, m: number, d: number;
  let match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; }
  else if ((match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s))) {
    d = +match[1]; m = +match[2]; y = +match[3];
    if (y < 100) y += 2000;
  } else return null;
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
};

/** Parses "1.234,56", "1,234.56", "(500)", "-₡1 000,00" and similar into a signed number. */
export const parseBankAmount = (raw: string): number | null => {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (s.includes('-')) { negative = true; s = s.replace(/-/g, ''); }
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return null;

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let decimalSep: '.' | ',' | null = lastDot > lastComma ? '.' : lastComma > lastDot ? ',' : null;
  if (decimalSep) {
    const digitsAfter = s.length - 1 - s.lastIndexOf(decimalSep);
    const occurrences = s.split(decimalSep).length - 1;
    // A repeated separator, or a lone one followed by exactly 3 digits after a non-zero lead ("1,234"), is thousands grouping.
    if (occurrences > 1 || (digitsAfter === 3 && !/^0[.,]/.test(s) && !(lastDot >= 0 && lastComma >= 0))) decimalSep = null;
  }
  if (decimalSep) {
    const thousandsSep = decimalSep === '.' ? ',' : '.';
    s = s.split(thousandsSep).join('').replace(decimalSep, '.');
  } else {
    s = s.replace(/[.,]/g, '');
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -n : n;
};

export interface MappedCsv {
  rows: BankRow[];
  skipped: number;
}

export const mapRows = (table: CsvTable, mapping: ColumnMapping): MappedCsv => {
  const rows: BankRow[] = [];
  let skipped = 0;
  for (const record of table.rows) {
    const date = parseBankDate(record[mapping.date] ?? '');
    const amount = parseBankAmount(record[mapping.amount] ?? '');
    if (!date || amount === null || amount === 0) { skipped++; continue; }
    rows.push({
      date: date.toISOString(),
      description: (record[mapping.description] ?? '').trim(),
      amount,
    });
  }
  return { rows, skipped };
};

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** True when `existing` already holds a transaction with the same envelope, day, amount and description. */
export const isDuplicate = (
  row: { date: string; description: string; amount: number },
  type: 'expense' | 'income',
  envelopeId: string,
  existing: { envelopeId: string; type: string; date: string; description: string; amount: number }[]
): boolean =>
  existing.some(
    e =>
      e.envelopeId === envelopeId &&
      e.type === type &&
      Math.abs(e.amount - Math.abs(row.amount)) < 0.005 &&
      e.description.trim().toLowerCase() === row.description.trim().toLowerCase() &&
      dayKey(e.date) === dayKey(row.date)
  );
