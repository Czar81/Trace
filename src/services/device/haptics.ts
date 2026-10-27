import * as Haptics from 'expo-haptics';

// Haptics are a nicety: on devices or platforms without support the call
// rejects or throws, and we ignore it.
const fire = (run: () => Promise<void>) => {
  try {
    run().catch(() => {});
  } catch {
    // unavailable on this platform/device
  }
};

/** Light confirmation after something is saved. */
export const hapticSave = () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** Firmer tap when something is deleted. */
export const hapticDelete = () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
