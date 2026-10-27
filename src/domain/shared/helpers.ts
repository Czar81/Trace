/** Local calendar day, used to notice the date changing while the app stays open. */
export const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

// Ids are creation timestamps; bumping past the last one keeps two records
// created in the same millisecond from sharing an id.
let lastIdTime = 0;
export const newId = (): string => {
  lastIdTime = Math.max(Date.now(), lastIdTime + 1);
  return String(lastIdTime);
};

/** True when two lists hold different items (by reference) or a different count. */
export const listChanged = <T,>(a: T[], b: T[]) => a.length !== b.length || a.some((item, i) => item !== b[i]);
