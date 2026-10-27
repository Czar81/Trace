export interface GoalDeadlineInfo {
  /** Whole days from today until the deadline; negative once it has passed. */
  daysLeft: number;
  isOverdue: boolean;
  /** Amount still missing to reach the goal (never negative). */
  missing: number;
  /** Suggested saving per month to hit the deadline; null when already met or overdue. */
  perMonth: number | null;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const getGoalDeadlineInfo = (
  deadlineIso: string,
  goal: number,
  saved: number,
  now: Date = new Date()
): GoalDeadlineInfo => {
  const deadline = startOfDay(new Date(deadlineIso));
  const today = startOfDay(now);
  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
  const missing = Math.max(0, goal - saved);
  const isOverdue = daysLeft < 0 && missing > 0;
  const perMonth = missing > 0 && daysLeft >= 0 ? missing / Math.max(1, daysLeft / 30) : null;
  return { daysLeft, isOverdue, missing, perMonth };
};
