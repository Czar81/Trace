const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_PER_DAY = 5;

export type SendLimit = 'ok' | 'minute' | 'day';

/** `sentAt` are the timestamps (ms) of earlier successful sends. */
export const checkSendLimit = (sentAt: number[], now: number): SendLimit => {
  if (sentAt.some(t => now - t < MINUTE_MS)) return 'minute';
  if (sentAt.filter(t => now - t < DAY_MS).length >= MAX_PER_DAY) return 'day';
  return 'ok';
};

/** Keeps only what can still matter for the daily limit. */
export const recordSend = (sentAt: number[], now: number): number[] =>
  [...sentAt.filter(t => now - t < DAY_MS), now];
