/**
 * Rough timings of the heavy list/domain functions on synthetic data.
 * Run with `npm run bench` (Node/V8; Hermes on a phone is several times slower).
 */
import * as fs from 'fs';
import * as path from 'path';
import { filterTransactions } from '../src/domain/transactions/transactionSearch';
import { groupTransactionsByDay } from '../src/domain/transactions/transactionGrouping';
import { computeEnvelopeBalances } from '../src/domain/budget/balance';

const median = (fn: () => void, runs = 7) => {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) { const s = process.hrtime.bigint(); fn(); times.push(Number(process.hrtime.bigint() - s) / 1e6); }
  return times.sort((a, b) => a - b)[Math.floor(runs / 2)];
};

it('benchmark', () => {
  const rows: string[] = [];
  for (const count of [1200, 12000]) {
    const file = path.join(__dirname, '..', 'benchmarks', `trace_backup_${count}.json`);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    rows.push(`${count} movimientos:`);
    rows.push(`  parse JSON      ${median(() => JSON.parse(JSON.stringify(data))).toFixed(1)} ms`);
    rows.push(`  búsqueda "super" ${median(() => filterTransactions(data.transactions, { text: 'super' })).toFixed(1)} ms`);
    rows.push(`  búsqueda vacía+filtro ${median(() => filterTransactions(data.transactions, { text: '', minAmount: 1 })).toFixed(1)} ms`);
    const all = filterTransactions(data.transactions, { text: '', minAmount: 1 });
    rows.push(`  agrupar por día  ${median(() => groupTransactionsByDay(all, 'es-ES')).toFixed(1)} ms`);
    rows.push(`  saldos           ${median(() => computeEnvelopeBalances(data.transactions, data.envelopes, false, null)).toFixed(1)} ms`);
  }
  console.log(rows.join('\n'));
});
