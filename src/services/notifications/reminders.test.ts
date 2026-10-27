jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('./notifications', () => ({
  cancelTemplateReminder: jest.fn(async (t: unknown) => t),
  cancelDebtReminder: jest.fn(async (e: unknown) => e),
  scheduleBillReminders: jest.fn(async (t: unknown) => t),
  scheduleDebtReminders: jest.fn(async (e: unknown) => e),
  requestNotificationPermissions: jest.fn(async () => true),
}));
import { syncReminderSettings, requestPermissionsIfEnabled, anyFieldChanged } from './reminders';
import * as notifications from './notifications';
import { EMPTY_DATA } from '../storage/appData';

const s = EMPTY_DATA.settings;

describe('reminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does nothing when reminder settings did not change', async () => {
    expect(await syncReminderSettings(s, { ...s, defaultCurrency: 'USD' }, EMPTY_DATA)).toBeNull();
  });
  it('schedules on turn-on and cancels on turn-off', async () => {
    const on = { ...s, billRemindersEnabled: true };
    expect(await syncReminderSettings({ ...s, billRemindersEnabled: false }, on, EMPTY_DATA)).not.toBeNull();
    expect(notifications.scheduleBillReminders).toHaveBeenCalled();
    expect(notifications.cancelTemplateReminder).not.toHaveBeenCalled();
    jest.clearAllMocks();
    await syncReminderSettings(on, { ...on, billRemindersEnabled: false }, { ...EMPTY_DATA, envelopes: [] });
    expect(notifications.scheduleBillReminders).not.toHaveBeenCalled();
  });
  it('reschedules when only the lead time moves', async () => {
    const on = { ...s, billRemindersEnabled: true, billReminderLeadDays: 1 };
    await syncReminderSettings(on, { ...on, billReminderLeadDays: 3 }, EMPTY_DATA);
    expect(notifications.scheduleDebtReminders).toHaveBeenCalledWith([], [], true, 3);
  });
  it('asks for permission only when a feature is newly enabled', async () => {
    await requestPermissionsIfEnabled(s, s);
    expect(notifications.requestNotificationPermissions).not.toHaveBeenCalled();
    await requestPermissionsIfEnabled({ ...s, budgetAlertsEnabled: false }, { ...s, budgetAlertsEnabled: true });
    expect(notifications.requestNotificationPermissions).toHaveBeenCalledTimes(1);
  });
  it('anyFieldChanged looks only at the listed fields', () => {
    expect(anyFieldChanged(['a'], { a: 1, b: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(anyFieldChanged(['a'], { a: 2, b: 1 }, { a: 1, b: 1 })).toBe(true);
  });
});
