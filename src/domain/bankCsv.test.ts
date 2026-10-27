import { guessMapping, isDuplicate, mapRows, parseBankAmount, parseBankDate, parseCsv } from './bankCsv';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes and semicolon delimiters', () => {
    const t = parseCsv('Fecha;Descripción;Monto\n01/10/2026;"Super; ""Mas"""; -1.234,50\n');
    expect(t.headers).toEqual(['Fecha', 'Descripción', 'Monto']);
    expect(t.rows[0]).toEqual(['01/10/2026', 'Super; "Mas"', ' -1.234,50']);
  });

  it('strips BOM, CRLF and blank lines', () => {
    const t = parseCsv('﻿date,amount\r\n2026-10-01,5\r\n\r\n');
    expect(t.headers).toEqual(['date', 'amount']);
    expect(t.rows).toEqual([['2026-10-01', '5']]);
  });
});

describe('parseBankAmount', () => {
  it.each([
    ['1,234.56', 1234.56],
    ['1.234,56', 1234.56],
    ['-₡1 000,00', -1000],
    ['(500)', -500],
    ['1,234', 1234],
    ['12,5', 12.5],
    ['0.500', 0.5],
    ['1.234.567,89', 1234567.89],
  ])('parses %s', (raw, expected) => {
    expect(parseBankAmount(raw)).toBeCloseTo(expected);
  });

  it('returns null for empty or non-numeric', () => {
    expect(parseBankAmount('')).toBeNull();
    expect(parseBankAmount('abc')).toBeNull();
  });
});

describe('parseBankDate', () => {
  it('parses day-first and ISO dates', () => {
    expect(parseBankDate('05/10/2026')?.getMonth()).toBe(9);
    expect(parseBankDate('05/10/2026')?.getDate()).toBe(5);
    expect(parseBankDate('2026-10-05')?.getDate()).toBe(5);
    expect(parseBankDate('5-10-26')?.getFullYear()).toBe(2026);
  });

  it('rejects impossible dates', () => {
    expect(parseBankDate('31/02/2026')).toBeNull();
    expect(parseBankDate('hola')).toBeNull();
  });
});

describe('mapRows / guessMapping', () => {
  it('maps by header names and skips unparseable rows', () => {
    const t = parseCsv('Fecha,Detalle,Monto\n01/10/2026,Cafe,-2500\nbad,Nada,10\n02/10/2026,Salario,500000');
    const mapping = guessMapping(t.headers);
    expect(mapping).toEqual({ date: 0, description: 1, amount: 2 });
    const { rows, skipped } = mapRows(t, mapping);
    expect(rows.map(r => r.amount)).toEqual([-2500, 500000]);
    expect(skipped).toBe(1);
  });
});

describe('isDuplicate', () => {
  it('matches same envelope, day, amount and description', () => {
    const date = new Date(2026, 9, 1, 8).toISOString();
    const existing = [{ envelopeId: 'e1', type: 'expense', date, description: 'Cafe', amount: 2500 }];
    const row = { date: new Date(2026, 9, 1, 12).toISOString(), description: 'cafe', amount: -2500 };
    expect(isDuplicate(row, 'expense', 'e1', existing)).toBe(true);
    expect(isDuplicate(row, 'expense', 'e2', existing)).toBe(false);
    expect(isDuplicate({ ...row, amount: -2600 }, 'expense', 'e1', existing)).toBe(false);
  });
});
