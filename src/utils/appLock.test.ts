import { RELOCK_GRACE_MS, shouldRelock } from './appLock';

describe('shouldRelock', () => {
  it('does not relock if the app never went to the background', () => {
    expect(shouldRelock(null, 1_000_000)).toBe(false);
  });

  it('does not relock for a short trip away', () => {
    expect(shouldRelock(1000, 1000 + RELOCK_GRACE_MS - 1)).toBe(false);
  });

  it('relocks once the grace period has passed', () => {
    expect(shouldRelock(1000, 1000 + RELOCK_GRACE_MS)).toBe(true);
  });
});
