import { getGoalDeadlineInfo } from './savingsGoal';

const now = new Date(2026, 9, 27, 15, 0);

describe('getGoalDeadlineInfo', () => {
  it('computes days left and monthly amount', () => {
    const info = getGoalDeadlineInfo(new Date(2026, 11, 26).toISOString(), 1000, 400, now);
    expect(info.daysLeft).toBe(60);
    expect(info.missing).toBe(600);
    expect(info.perMonth).toBeCloseTo(300);
    expect(info.isOverdue).toBe(false);
  });

  it('never suggests less than one month of time', () => {
    const info = getGoalDeadlineInfo(new Date(2026, 9, 30).toISOString(), 1000, 0, now);
    expect(info.perMonth).toBe(1000);
  });

  it('flags overdue goals that are not met', () => {
    const info = getGoalDeadlineInfo(new Date(2026, 9, 1).toISOString(), 1000, 100, now);
    expect(info.isOverdue).toBe(true);
    expect(info.perMonth).toBeNull();
  });

  it('is not overdue once the goal is met', () => {
    const info = getGoalDeadlineInfo(new Date(2026, 9, 1).toISOString(), 1000, 1200, now);
    expect(info.isOverdue).toBe(false);
    expect(info.missing).toBe(0);
    expect(info.perMonth).toBeNull();
  });
});
