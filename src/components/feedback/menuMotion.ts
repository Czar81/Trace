import { Easing, Keyframe, SlideInDown } from 'react-native-reanimated';

/** Pop-in for dropdown-style menus: fades and grows slightly from the corner. Only opacity/transform. */
export const MENU_ENTERING = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }, { translateY: -6 }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
}).duration(160);

/**
 * Entrance for bottom sheets: the sheet rises from the bottom edge, where it is dismissed, while the Modal's own
 * fade handles the scrim. Decelerates without overshoot, since a tap (not a flick) opened it.
 */
export const SHEET_ENTERING = SlideInDown.duration(280).easing(Easing.out(Easing.cubic));
