#!/usr/bin/env node
/**
 * Generates deterministic full-backup JSON files (same shape as the app's
 * export) with many transactions, for measuring startup, search and save
 * times on a phone.
 *
 *   node scripts/generate-test-backups.js [outDir] [count ...]
 *
 * Defaults: outDir "benchmarks", counts 1200 and 12000. Import the files from
 * Settings > Import backup.
 */
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2] || 'benchmarks';
const counts = process.argv.slice(3).map(Number).filter(Boolean);

// Small seeded PRNG so every run produces identical files.
const rng = (seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)(42);
const pick = arr => arr[Math.floor(rng() * arr.length)];

const WORDS = ['Supermercado', 'Gasolina', 'Café', 'Farmacia', 'Cine', 'Restaurante', 'Taxi', 'Internet', 'Luz', 'Agua', 'Ropa', 'Libros', 'Gimnasio', 'Regalo', 'Mascota'];
const ICONS = ['home', 'car', 'coffee', 'shopping-bag', 'heart', 'zap', 'film', 'music', 'book', 'gift'];

const envelopes = Array.from({ length: 30 }, (_, i) => ({
  id: `env-${i}`, name: `Sobre ${i + 1}`, type: i % 10 === 9 ? 'deuda' : i % 5 === 4 ? 'ahorro' : 'gasto',
  currency: 'CRC', limit: 100000 + i * 5000, isUnlimited: i % 10 === 9 || i % 5 === 4, icon: ICONS[i % ICONS.length], color: '#2E86AB',
  ...(i % 10 === 9 ? { interestRate: 2, interestFrequency: 'mensual', minimumPayment: 10000, dueDay: 15 } : {}),
}));
const paymentMethods = ['Efectivo', 'Tarjeta', 'SINPE'].map((name, i) => ({ id: `pm-${i}`, name }));
const categories = Array.from({ length: 12 }, (_, i) => ({ id: `cat-${i}`, name: `Categoría ${i + 1}` }));
const incomeCategories = [{ id: 'inc-0', name: 'Salario' }, { id: 'inc-1', name: 'Otros' }];

const build = count => {
  const end = Date.UTC(2026, 9, 28);
  const span = 1000 * 60 * 60 * 24 * 365 * (count / 1200); // ~1200 movements per year
  const transactions = Array.from({ length: count }, (_, i) => {
    const income = rng() < 0.1;
    return {
      id: `tx-${i}`, envelopeId: pick(envelopes).id, type: income ? 'income' : 'expense',
      amount: Math.round(500 + rng() * 40000), description: `${pick(WORDS)} ${Math.floor(rng() * 1000)}`,
      date: new Date(end - rng() * span).toISOString(),
      paymentMethodId: pick(paymentMethods).id, categoryId: income ? 'inc-0' : pick(categories).id, isArchived: false,
    };
  });
  return {
    envelopes, transactions, paymentMethods, categories, incomeCategories, recurringTemplates: [],
    settings: { defaultCurrency: 'CRC', expenseCutoffEnabled: false, expenseCutoffDay: null, budgetAlertsEnabled: false, billRemindersEnabled: false, billReminderLeadDays: 2, themeId: 'default' },
    exportedAt: new Date(end).toISOString(), version: '1.0',
  };
};

fs.mkdirSync(outDir, { recursive: true });
for (const count of counts.length ? counts : [1200, 12000]) {
  const file = path.join(outDir, `trace_backup_${count}.json`);
  fs.writeFileSync(file, JSON.stringify(build(count), null, 2));
  console.log(`${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
}
