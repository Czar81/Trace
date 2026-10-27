jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import { buildRestoredData } from './restoreBackup';
import { EMPTY_DATA } from '../services/appData';
import { Envelope, RecurringTransactionTemplate } from '../types';

const env = (id: string): Envelope => ({
  id, name: id, type: 'gasto', currency: 'CRC', limit: 0, isUnlimited: false, icon: 'x', color: '#000',
  dueReminderNotificationId: 'n', lastDueReminderScheduledPeriod: 'p',
});
const tpl = (id: string, envelopeId: string): RecurringTransactionTemplate => ({
  id, envelopeId, type: 'expense', amount: 1, description: 'd', frequency: 'monthly', dayOfMonth: 1,
  isActive: true, lastGeneratedPeriod: null, reminderNotificationId: 'n', lastReminderScheduledPeriod: 'p',
});
const base = { envelopes: [env('a')], transactions: [], paymentMethods: [], categories: [], settings: EMPTY_DATA.settings };

describe('buildRestoredData', () => {
  it('clears notification ids carried in the file', () => {
    const r = buildRestoredData({ ...base, recurringTemplates: [tpl('t', 'a')] }, EMPTY_DATA);
    expect(r.envelopes[0].dueReminderNotificationId).toBeNull();
    expect(r.recurringTemplates[0].reminderNotificationId).toBeNull();
    expect(r.recurringTemplates[0].lastReminderScheduledPeriod).toBeNull();
  });

  it('keeps only device templates whose envelope exists when the backup has none', () => {
    const current = { ...EMPTY_DATA, recurringTemplates: [tpl('keep', 'a'), tpl('drop', 'gone')] };
    expect(buildRestoredData(base, current).recurringTemplates.map(t => t.id)).toEqual(['keep']);
  });

  it('keeps the device income categories when the backup lacks them', () => {
    const current = { ...EMPTY_DATA, incomeCategories: [{ id: 'inc-1', name: 'Salary' }] };
    expect(buildRestoredData(base, current).incomeCategories).toEqual(current.incomeCategories);
    expect(buildRestoredData({ ...base, incomeCategories: [] }, current).incomeCategories).toEqual([]);
  });
});
