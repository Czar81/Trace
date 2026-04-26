import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Envelope, Transaction, PaymentMethod, TransactionCategory } from '../types';

export const exportDataToCSV = async (
  envelopes: Envelope[],
  transactions: Transaction[],
  paymentMethods: PaymentMethod[],
  categories: TransactionCategory[]
) => {
  try {
    let csv = 'ID,Fecha,Descripcion,Monto,Tipo,Sobre,Categoria,Metodo_de_Pago,Archivado\n';

    for (const t of transactions) {
      const envelope = envelopes.find(e => e.id === t.envelopeId)?.name ?? 'Desconocido';
      const category = categories.find(c => c.id === t.categoryId)?.name ?? '';
      const pm = paymentMethods.find(p => p.id === t.paymentMethodId)?.name ?? '';
      const date = new Date(t.date).toLocaleDateString('es-ES');
      const archived = t.isArchived ? 'SI' : 'NO';
      const type = t.type === 'expense' ? 'Gasto' : 'Ingreso';

      // escape commas in description
      const desc = `"${t.description.replace(/"/g, '""')}"`;

      csv += `${t.id},${date},${desc},${t.amount},${type},"${envelope}","${category}","${pm}",${archived}\n`;
    }

    const filename = `spent_export_${Date.now()}.csv`;
    const uri = documentDirectory + filename;

    await writeAsStringAsync(uri, csv, { encoding: EncodingType.UTF8 });

    if (await isAvailableAsync()) {
      await shareAsync(uri, { UTI: 'public.comma-separated-values-text', mimeType: 'text/csv' });
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
  }
};
