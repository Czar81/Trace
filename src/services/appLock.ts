/** Seconds the app may stay in the background before it asks to unlock again. */
export const RELOCK_GRACE_MS = 30_000;

/** Whether returning to the foreground must lock the app, given when it went to the background. */
export const shouldRelock = (backgroundedAt: number | null, now: number, graceMs: number = RELOCK_GRACE_MS): boolean =>
  backgroundedAt !== null && now - backgroundedAt >= graceMs;
