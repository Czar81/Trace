import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SectionList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import { Dropdown } from '../components/Dropdown';
import { EmptyState } from '../components/EmptyState';
import { DateField } from '../components/DateField';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { filterTransactions, hasActiveSearch, SearchFilters } from '../utils/transactionSearch';
import { groupTransactionsByDay } from '../utils/transactionGrouping';
import { Transaction } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

export const SearchTransactionsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t, locale } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { transactions, envelopes, categories, incomeCategories, paymentMethods, formatAmount } = useAppData();

  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [minAmountStr, setMinAmountStr] = useState('');
  const [maxAmountStr, setMaxAmountStr] = useState('');

  const categoryOptions = [
    { label: t('search.allCategories'), value: '' },
    ...categories.map(c => ({ label: c.name, value: c.id })),
    ...incomeCategories.map(c => ({ label: c.name, value: c.id })),
  ];
  const paymentMethodOptions = [
    { label: t('search.allMethods'), value: '' },
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
  const sections = useMemo(() => groupTransactionsByDay(results, locale), [results, locale]);

  const clearFilters = () => {
    setText('');
    setCategoryId('');
    setPaymentMethodId('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setMinAmountStr('');
    setMaxAmountStr('');
  };

  // Resolve a category name from the catalog that matches the transaction's
  // type: income categories for income, expense categories otherwise.
  const categoryNameOf = (item: Transaction) => {
    if (!item.categoryId) return t('common.noCategory');
    const catalog = item.type === 'income' ? incomeCategories : categories;
    return catalog.find(c => c.id === item.categoryId)?.name ?? t('common.noCategory');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('search.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchRow}>
        <Search color={colors.secondaryText} size={18} />
        <TextInput
          style={styles.searchInput}
          value={text}
          onChangeText={setText}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.secondaryText}
        />
        {text !== '' && (
          <TouchableOpacity onPress={() => setText('')}>
            <X color={colors.secondaryText} size={18} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.filterHalf}>
          <Dropdown options={categoryOptions} value={categoryId} onSelect={setCategoryId} placeholder={t('search.all')} />
        </View>
        <View style={styles.filterHalf}>
          <Dropdown options={paymentMethodOptions} value={paymentMethodId} onSelect={setPaymentMethodId} placeholder={t('search.all')} />
        </View>
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.filterHalf}>
          <DateField
            compact
            value={dateFrom}
            placeholder={t('search.from')}
            onChange={setDateFrom}
          />
        </View>
        <View style={styles.filterHalf}>
          <DateField compact value={dateTo} placeholder={t('search.to')} onChange={setDateTo} />
        </View>
      </View>

      <View style={styles.filtersRow}>
        <TextInput
          style={[styles.amountInput, styles.filterHalf]}
          value={minAmountStr}
          onChangeText={setMinAmountStr}
          placeholder={t('search.minAmount')}
          placeholderTextColor={colors.secondaryText}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.amountInput, styles.filterHalf]}
          value={maxAmountStr}
          onChangeText={setMaxAmountStr}
          placeholder={t('search.maxAmount')}
          placeholderTextColor={colors.secondaryText}
          keyboardType="numeric"
        />
      </View>

      {active && (
        <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>{t('search.clearFilters')}</Text>
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
            <EmptyState message={t('search.noResults')} />
          ) : (
            <EmptyState message={t('search.hint')} />
          )
        }
        renderItem={({ item }) => (
          <TransactionResultRow
            item={item}
            envelopeName={envelopes.find(e => e.id === item.envelopeId)?.name ?? t('common.deletedEnvelope')}
            categoryName={categoryNameOf(item)}
            paymentMethodName={item.paymentMethodId ? paymentMethods.find(p => p.id === item.paymentMethodId)?.name ?? t('common.noMethod') : t('common.noMethod')}
            currency={envelopes.find(e => e.id === item.envelopeId)?.currency ?? 'CRC'}
            formatAmount={formatAmount}
            locale={locale}
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
  locale: string;
  onPress: () => void;
}> = ({ item, envelopeName, categoryName, paymentMethodName, currency, formatAmount, locale, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isTransfer = item.type === 'transfer';
  const color = isTransfer ? colors.blue : item.type === 'expense' ? colors.red : colors.green;

  return (
    <TouchableOpacity style={styles.resultItem} onPress={onPress} disabled={isTransfer} activeOpacity={0.7}>
      <View style={styles.resultLeft}>
        <Text style={styles.resultDesc}>{item.description}</Text>
        <Text style={styles.resultMeta}>
          {envelopeName}
          {!isTransfer ? ` · ${categoryName} · ${paymentMethodName}` : ''}
        </Text>
        <Text style={styles.resultDate}>
          {new Date(item.date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Text style={[styles.resultAmount, { color }]}>{formatAmount(item.amount, currency)}</Text>
    </TouchableOpacity>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.cardBg, borderRadius: 12, marginHorizontal: 20,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 15, padding: 0 },
  filtersRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 12 },
  filterHalf: { flex: 1 },
  amountInput: {
    backgroundColor: colors.cardBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    color: colors.white, fontSize: 14,
  },
  clearBtn: { alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 12 },
  clearBtnText: { color: colors.green, fontSize: 14, fontWeight: '600' },
  resultsList: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionHeader: { color: colors.secondaryText, fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  resultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  resultLeft: { flex: 1, paddingRight: 12 },
  resultDesc: { color: colors.white, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  resultMeta: { color: colors.secondaryText, fontSize: 12, marginBottom: 2 },
  resultDate: { color: colors.secondaryText, fontSize: 12 },
  resultAmount: { fontSize: 15, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.divider },
});
