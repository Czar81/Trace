import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SectionList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft, Search, X, Calendar } from 'lucide-react-native';
import { Dropdown } from '../components/Dropdown';
import { EmptyState } from '../components/EmptyState';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../theme/colors';
import { filterTransactions, hasActiveSearch, SearchFilters } from '../utils/transactionSearch';
import { groupTransactionsByDay } from '../utils/transactionGrouping';
import { Transaction } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

const NONE_OPTION = { label: 'Todas', value: '' };

export const SearchTransactionsScreen = ({ navigation }: Props) => {
  const { transactions, envelopes, categories, paymentMethods, formatAmount } = useAppData();

  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [minAmountStr, setMinAmountStr] = useState('');
  const [maxAmountStr, setMaxAmountStr] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const categoryOptions = [
    { label: 'Todas las categorías', value: '' },
    ...categories.map(c => ({ label: c.name, value: c.id })),
  ];
  const paymentMethodOptions = [
    { label: 'Todos los métodos', value: '' },
    ...paymentMethods.map(pm => ({ label: pm.name, value: pm.id })),
  ];

  const filters: SearchFilters = useMemo(() => {
    const minAmount = minAmountStr !== '' && !isNaN(parseFloat(minAmountStr)) ? parseFloat(minAmountStr) : undefined;
    const maxAmount = maxAmountStr !== '' && !isNaN(parseFloat(maxAmountStr)) ? parseFloat(maxAmountStr) : undefined;
    return {
      text,
      categoryId: categoryId || undefined,
      paymentMethodId: paymentMethodId || undefined,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
    };
  }, [text, categoryId, paymentMethodId, dateFrom, dateTo, minAmountStr, maxAmountStr]);

  const active = hasActiveSearch(filters);
  const results = useMemo(() => (active ? filterTransactions(transactions, filters) : []), [active, transactions, filters]);
  const sections = useMemo(() => groupTransactionsByDay(results), [results]);

  const clearFilters = () => {
    setText('');
    setCategoryId('');
    setPaymentMethodId('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setMinAmountStr('');
    setMaxAmountStr('');
  };

  const dateLabel = (d?: Date) =>
    d ? d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buscar</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchRow}>
        <Search color={COLORS.secondaryText} size={18} />
        <TextInput
          style={styles.searchInput}
          value={text}
          onChangeText={setText}
          placeholder="Buscar por descripción..."
          placeholderTextColor={COLORS.secondaryText}
        />
        {text !== '' && (
          <TouchableOpacity onPress={() => setText('')}>
            <X color={COLORS.secondaryText} size={18} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.filterHalf}>
          <Dropdown options={categoryOptions} value={categoryId} onSelect={setCategoryId} placeholder={NONE_OPTION.label} />
        </View>
        <View style={styles.filterHalf}>
          <Dropdown options={paymentMethodOptions} value={paymentMethodId} onSelect={setPaymentMethodId} placeholder={NONE_OPTION.label} />
        </View>
      </View>

      <View style={styles.filtersRow}>
        <TouchableOpacity style={[styles.dateBtn, styles.filterHalf]} onPress={() => setShowFromPicker(true)}>
          <Calendar color={COLORS.secondaryText} size={16} />
          <Text style={styles.dateBtnText}>{dateLabel(dateFrom) ?? 'Desde'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.dateBtn, styles.filterHalf]} onPress={() => setShowToPicker(true)}>
          <Calendar color={COLORS.secondaryText} size={16} />
          <Text style={styles.dateBtnText}>{dateLabel(dateTo) ?? 'Hasta'}</Text>
        </TouchableOpacity>
      </View>

      {showFromPicker && (
        <DateTimePicker
          value={dateFrom ?? new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowFromPicker(false);
            if (selectedDate) setDateFrom(selectedDate);
          }}
        />
      )}
      {showToPicker && (
        <DateTimePicker
          value={dateTo ?? new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowToPicker(false);
            if (selectedDate) setDateTo(selectedDate);
          }}
        />
      )}

      <View style={styles.filtersRow}>
        <TextInput
          style={[styles.amountInput, styles.filterHalf]}
          value={minAmountStr}
          onChangeText={setMinAmountStr}
          placeholder="Monto mín."
          placeholderTextColor={COLORS.secondaryText}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.amountInput, styles.filterHalf]}
          value={maxAmountStr}
          onChangeText={setMaxAmountStr}
          placeholder="Monto máx."
          placeholderTextColor={COLORS.secondaryText}
          keyboardType="numeric"
        />
      </View>

      {active && (
        <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Limpiar filtros</Text>
        </TouchableOpacity>
      )}

      <SectionList
        style={{ flex: 1 }}
        contentContainerStyle={styles.resultsList}
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        ListEmptyComponent={
          active ? (
            <EmptyState message="No se encontraron transacciones." />
          ) : (
            <EmptyState message="Busca por descripción o usa los filtros para encontrar una transacción." />
          )
        }
        renderItem={({ item }) => (
          <TransactionResultRow
            item={item}
            envelopeName={envelopes.find(e => e.id === item.envelopeId)?.name ?? 'Sobre eliminado'}
            categoryName={item.categoryId ? categories.find(c => c.id === item.categoryId)?.name ?? 'Sin categoría' : 'Sin categoría'}
            paymentMethodName={item.paymentMethodId ? paymentMethods.find(p => p.id === item.paymentMethodId)?.name ?? 'Sin método' : 'Sin método'}
            currency={envelopes.find(e => e.id === item.envelopeId)?.currency ?? 'CRC'}
            formatAmount={formatAmount}
            onPress={() => {
              if (item.type === 'transfer') return;
              navigation.navigate('CreateTransaction', { envelopeId: item.envelopeId, transaction: item });
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

const TransactionResultRow: React.FC<{
  item: Transaction;
  envelopeName: string;
  categoryName: string;
  paymentMethodName: string;
  currency: 'CRC' | 'USD' | 'EUR';
  formatAmount: (amount: number, currency: 'CRC' | 'USD' | 'EUR') => string;
  onPress: () => void;
}> = ({ item, envelopeName, categoryName, paymentMethodName, currency, formatAmount, onPress }) => {
  const isTransfer = item.type === 'transfer';
  const color = isTransfer ? COLORS.blue : item.type === 'expense' ? COLORS.red : COLORS.green;

  return (
    <TouchableOpacity style={styles.resultItem} onPress={onPress} disabled={isTransfer} activeOpacity={0.7}>
      <View style={styles.resultLeft}>
        <Text style={styles.resultDesc}>{item.description}</Text>
        <Text style={styles.resultMeta}>
          {envelopeName}
          {!isTransfer ? ` · ${categoryName} · ${paymentMethodName}` : ''}
        </Text>
        <Text style={styles.resultDate}>
          {new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Text style={[styles.resultAmount, { color }]}>{formatAmount(item.amount, currency)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.cardBg, borderRadius: 12, marginHorizontal: 20,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 15, padding: 0 },
  filtersRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 12 },
  filterHalf: { flex: 1 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.cardBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  dateBtnText: { color: COLORS.white, fontSize: 14 },
  amountInput: {
    backgroundColor: COLORS.cardBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    color: COLORS.white, fontSize: 14,
  },
  clearBtn: { alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 12 },
  clearBtnText: { color: COLORS.green, fontSize: 14, fontWeight: '600' },
  resultsList: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionHeader: { color: COLORS.secondaryText, fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  resultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  resultLeft: { flex: 1, paddingRight: 12 },
  resultDesc: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  resultMeta: { color: COLORS.secondaryText, fontSize: 12, marginBottom: 2 },
  resultDate: { color: COLORS.secondaryText, fontSize: 12 },
  resultAmount: { fontSize: 15, fontWeight: '700' },
  separator: { height: 1, backgroundColor: COLORS.divider },
});
