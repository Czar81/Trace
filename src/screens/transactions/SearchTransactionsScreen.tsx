import React, { useMemo, useState } from 'react';
import { HelpButton } from '../../components/feedback/HelpButton';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SectionList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../../context/ExpenseContext';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Search from 'lucide-react-native/icons/search';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import X from 'lucide-react-native/icons/x';
import { Dropdown } from '../../components/forms/Dropdown';
import { EmptyState } from '../../components/feedback/EmptyState';
import { DateField } from '../../components/forms/DateField';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { filterTransactions, hasActiveSearch, SearchFilters } from '../../domain/transactions/transactionSearch';
import { groupTransactionsByDay } from '../../domain/transactions/transactionGrouping';
import { Transaction, Currency } from '../../types';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

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
  const [showFilters, setShowFilters] = useState(false);

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
  const activeFilterCount = [
    filters.categoryId,
    filters.paymentMethodId,
    filters.dateFrom,
    filters.dateTo,
    filters.minAmount,
    filters.maxAmount,
  ].filter(v => v !== undefined).length;
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

  const envelopeNameOf = (id?: string) => envelopes.find(e => e.id === id)?.name ?? t('common.deletedEnvelope');
  // Transfers show "source → destination" so both sides are visible in results.
  const envelopeLabelOf = (item: Transaction) =>
    item.type === 'transfer'
      ? `${envelopeNameOf(item.envelopeId)} → ${envelopeNameOf(item.toEnvelopeId)}`
      : envelopeNameOf(item.envelopeId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('search.title')}</Text>
        <HelpButton title="help.search.title" body="help.search.body" />
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
          <TouchableOpacity onPress={() => setText('')} accessibilityRole="button" accessibilityLabel={t('a11y.clearSearch')}>
            <X color={colors.secondaryText} size={18} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setShowFilters(v => !v)}
          style={styles.filterToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: showFilters }}
          accessibilityLabel={showFilters ? t('search.hideFilters') : t('search.showFilters')}
        >
          <SlidersHorizontal color={showFilters || activeFilterCount > 0 ? colors.green : colors.secondaryText} size={18} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {showFilters && (
        <>
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
        </>
      )}

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
            envelopeName={envelopeLabelOf(item)}
            categoryName={categoryNameOf(item)}
            paymentMethodName={item.paymentMethodId ? paymentMethods.find(p => p.id === item.paymentMethodId)?.name ?? t('common.noMethod') : t('common.noMethod')}
            currency={envelopes.find(e => e.id === item.envelopeId)?.currency ?? 'CRC'}
            formatAmount={formatAmount}
            locale={locale}
            onPress={() => (
              item.type === 'transfer'
                ? navigation.navigate('CreateTransfer', { envelopeId: item.envelopeId, transaction: item })
                : navigation.navigate('CreateTransaction', { envelopeId: item.envelopeId, transaction: item })
            )}
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
  currency: Currency;
  formatAmount: (amount: number, currency: Currency) => string;
  locale: string;
  onPress: () => void;
}> = ({ item, envelopeName, categoryName, paymentMethodName, currency, formatAmount, locale, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isTransfer = item.type === 'transfer';
  const color = isTransfer ? colors.blue : item.type === 'expense' ? colors.red : colors.green;

  return (
    <TouchableOpacity style={styles.resultItem} onPress={onPress} activeOpacity={0.7}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: FONT_SIZE.xxl, fontWeight: 'bold' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.cardBg, borderRadius: RADIUS.md, marginHorizontal: SPACING.xl,
    paddingHorizontal: 14, paddingVertical: SPACING.md, marginBottom: SPACING.md,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: FONT_SIZE.base, padding: 0 },
  filterToggle: { paddingLeft: SPACING.xs, flexDirection: 'row', alignItems: 'center' },
  filterBadge: {
    minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center', marginLeft: SPACING.xs, paddingHorizontal: SPACING.xs,
  },
  filterBadgeText: { color: colors.onAccent, fontSize: FONT_SIZE.xs, fontWeight: '700' },
  filtersRow: { flexDirection: 'row', gap: 10, marginHorizontal: SPACING.xl, marginBottom: SPACING.md },
  filterHalf: { flex: 1 },
  amountInput: {
    backgroundColor: colors.cardBg, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 14,
    color: colors.white, fontSize: FONT_SIZE.md,
  },
  clearBtn: { alignSelf: 'flex-start', marginHorizontal: SPACING.xl, marginBottom: SPACING.md },
  clearBtnText: { color: colors.green, fontSize: FONT_SIZE.md, fontWeight: '600' },
  resultsList: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  sectionHeader: { color: colors.secondaryText, fontSize: FONT_SIZE.sm, fontWeight: '700', marginTop: SPACING.lg, marginBottom: 6 },
  resultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.md },
  resultLeft: { flex: 1, paddingRight: SPACING.md },
  resultDesc: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '600', marginBottom: SPACING.xxs },
  resultMeta: { color: colors.secondaryText, fontSize: FONT_SIZE.xs, marginBottom: SPACING.xxs },
  resultDate: { color: colors.secondaryText, fontSize: FONT_SIZE.xs },
  resultAmount: { fontSize: FONT_SIZE.base, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.divider },
});
