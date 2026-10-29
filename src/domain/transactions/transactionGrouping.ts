import { Transaction } from '../../types';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Reused across calls so grouping doesn't allocate a Date per transaction.
const scratch = new Date(0);

const dayKey = (dateStr: string) => {
  const d = scratch;
  d.setTime(Date.parse(dateStr));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Building an Intl formatter is the expensive part of toLocaleDateString, so keep one per locale.
const formatters = new Map<string, Intl.DateTimeFormat>();
const formatDay = (ms: number, locale: string) => {
  let format = formatters.get(locale);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' });
    formatters.set(locale, format);
  }
  return format.format(ms);
};

export interface TransactionDaySection {
  title: string;
  data: Transaction[];
}

export const groupTransactionsByDay = (transactions: Transaction[], locale: string = 'es-ES'): TransactionDaySection[] => {
  const sections: TransactionDaySection[] = [];
  const sectionByKey = new Map<string, TransactionDaySection>();

  transactions.forEach(t => {
    const key = dayKey(t.date);
    let section = sectionByKey.get(key);
    if (!section) {
      const title = capitalize(formatDay(Date.parse(t.date), locale));
      section = { title, data: [] };
      sectionByKey.set(key, section);
      sections.push(section);
    }
    section.data.push(t);
  });

  return sections;
};
