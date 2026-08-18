import { Platform } from 'react-native';

// Serif stack used for monetary amounts and screen/section titles ("Ledger & Ink" look).
// iOS ships Georgia natively; Android's generic 'serif' alias resolves to Noto Serif.
export const SERIF_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
