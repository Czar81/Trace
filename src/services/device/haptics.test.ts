jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

import * as Haptics from 'expo-haptics';
import { hapticSave, hapticDelete } from './haptics';

describe('haptics', () => {
  it('fires success feedback on save and an impact on delete', () => {
    (Haptics.notificationAsync as jest.Mock).mockResolvedValue(undefined);
    (Haptics.impactAsync as jest.Mock).mockResolvedValue(undefined);
    hapticSave();
    hapticDelete();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  });

  it('swallows errors when haptics are unavailable', async () => {
    (Haptics.notificationAsync as jest.Mock).mockRejectedValue(new Error('unavailable'));
    (Haptics.impactAsync as jest.Mock).mockImplementation(() => { throw new Error('unavailable'); });
    expect(() => hapticSave()).not.toThrow();
    expect(() => hapticDelete()).not.toThrow();
    await Promise.resolve();
  });
});
