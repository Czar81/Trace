import { Transaction } from '../types';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const dayKey = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface TransactionDaySection {
  title: string;
  data: Transaction[];
}

export const groupTransactionsByDay = (transactions: Transaction[]): TransactionDaySection[] => {
  const sections: TransactionDaySection[] = [];
  const sectionByKey = new Map<string, TransactionDaySection>();

  transactions.forEach(t => {
    const key = dayKey(t.date);
    let section = sectionByKey.get(key);
    if (!section) {
      const title = capitalize(
        new Date(t.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
      );
      section = { title, data: [] };
      sectionByKey.set(key, section);
      sections.push(section);
    }
    section.data.push(t);
  });

  return sections;
};
