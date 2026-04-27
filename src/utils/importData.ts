import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Envelope, Transaction, PaymentMethod, TransactionCategory, EnvelopeType, Currency } from '../types';

export interface ImportResult {
  envelopes: Omit<Envelope, 'id'>[];
  transactions: Omit<Transaction, 'id' | 'isArchived'>[];
  paymentMethods: PaymentMethod[];
  categories: TransactionCategory[];
  errors: string[];
}

export const pickAndParseCSV = async (): Promise<ImportResult | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/csv',
    });

    if (result.canceled) return null;

    const uri = result.assets[0].uri;
    const content = await readAsStringAsync(uri);
    
    return parseCSV(content);
  } catch (error) {
    console.error('Error picking CSV:', error);
    return null;
  }
};

export const parseCSV = (csvContent: string): ImportResult => {
  const result: ImportResult = {
    envelopes: [],
    transactions: [],
    paymentMethods: [],
    categories: [],
    errors: [],
  };

  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  
  // Verify headers
  const expectedHeaders = ['ID', 'Fecha', 'Descripcion', 'Monto', 'Tipo', 'Sobre', 'Categoria', 'Metodo_de_Pago', 'Archivado'];
  if (!expectedHeaders.every(h => headers.includes(h))) {
    result.errors.push('Formato de CSV inválido. Se esperan columnas: ' + expectedHeaders.join(', '));
    return result;
  }

  // Map headers to indices
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    headerMap[h.trim()] = i;
  });

  const envelopeMap = new Map<string, Omit<Envelope, 'id'>>();
  const categorySet = new Set<string>();
  const paymentMethodSet = new Set<string>();

  // Parse lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      // Parse CSV line respecting quoted fields
      const fields = parseCSVLine(line);
      
      const id = fields[headerMap['ID']]?.trim();
      const fecha = fields[headerMap['Fecha']]?.trim();
      const descripcion = fields[headerMap['Descripcion']]?.trim() || '';
      const monto = parseFloat(fields[headerMap['Monto']]?.trim() || '0');
      const tipo = fields[headerMap['Tipo']]?.trim().toLowerCase();
      const sobreName = fields[headerMap['Sobre']]?.trim() || '';
      const categoriaName = fields[headerMap['Categoria']]?.trim();
      const metodoName = fields[headerMap['Metodo_de_Pago']]?.trim();
      const archivado = fields[headerMap['Archivado']]?.trim().toUpperCase() === 'SI';

      if (!id || !sobreName || !descripcion) {
        result.errors.push(`Línea ${i + 1}: Faltan campos requeridos (ID, Sobre, Descripción)`);
        continue;
      }

      // Determine envelope type and create if needed
      const isGasto = tipo === 'gasto' || tipo === 'expense';
      const envelopeType: EnvelopeType = isGasto ? 'gasto' : 'ahorro';

      if (!envelopeMap.has(sobreName)) {
        envelopeMap.set(sobreName, {
          name: sobreName,
          type: envelopeType,
          currency: 'CRC',
          limit: 0,
          isUnlimited: true,
          icon: 'box',
          color: '#52A8D9',
        });
      }

      // Add category if present
      if (categoriaName && categoriaName !== '') {
        categorySet.add(categoriaName);
      }

      // Add payment method if present
      if (metodoName && metodoName !== '') {
        paymentMethodSet.add(metodoName);
      }

      // Parse date
      let transactionDate: string;
      if (fecha) {
        // Try to parse date (format: DD/MM/YYYY from export)
        const dateParts = fecha.split('/');
        if (dateParts.length === 3) {
          const d = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
          transactionDate = d.toISOString();
        } else {
          transactionDate = new Date().toISOString();
        }
      } else {
        transactionDate = new Date().toISOString();
      }

      // Create transaction
      const transaction: Omit<Transaction, 'id' | 'isArchived'> = {
        envelopeId: '', // Will be set after envelopes are created
        type: isGasto ? 'expense' : 'income',
        amount: Math.abs(monto),
        description: descripcion,
        date: transactionDate,
        paymentMethodId: metodoName ? metodoName : undefined,
        categoryId: categoriaName ? categoriaName : undefined,
      };

      // Store with envelope name reference
      (transaction as any)._envelopeName = sobreName;
      result.transactions.push(transaction);
    } catch (error) {
      result.errors.push(`Línea ${i + 1}: Error al procesar - ${error}`);
    }
  }

  // Convert sets to arrays with generated IDs
  result.envelopes = Array.from(envelopeMap.values());
  result.categories = Array.from(categorySet).map(name => ({
    id: Date.now().toString() + Math.random(),
    name,
  }));
  result.paymentMethods = Array.from(paymentMethodSet).map(name => ({
    id: Date.now().toString() + Math.random(),
    name,
  }));

  return result;
};

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}
