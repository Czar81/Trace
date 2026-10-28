import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { NestableScrollContainer, NestableDraggableFlatList, ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../../context/ExpenseContext';
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, GripVertical, SlidersHorizontal } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../../navigation/types';
import { EmptyState as SharedEmptyState } from '../../components/feedback/EmptyState';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { TranslationKey } from '../../i18n';
import { Currency } from '../../types';
import {
  ReportPeriod,
  getSpendingByCategory,
  getSpendingByMonth,
  getSpendingByEnvelope,
  getSpendingByPaymentMethod,
  getMonthlyTrend,
  getTopTransactions,
  getSummary,
  REPORT_SECTIONS,
  ReportLayoutItem,
  ReportSectionId,
} from '../../domain/reports/reports';
import { loadReportLayout, saveReportLayout, loadReportsDisplayCurrency, saveReportsDisplayCurrency } from '../../services/storage/storage';
import { formatCurrency } from '../../domain/shared/formatCurrency';
import { SPACING } from '../../theme/tokens';
import { makeStyles } from './ReportsScreen.styles';

const TREND_MONTHS = 6;
const CURRENCY_CYCLE: Currency[] = ['CRC', 'USD', 'EUR'];

const PERIOD_OPTIONS: { labelKey: TranslationKey; value: Exclude<ReportPeriod, { kind: 'custom' }> }[] = [
  { labelKey: 'reports.periodThisMonth', value: 'current-month' },
  { labelKey: 'reports.periodAll', value: 'all-time' },
];

const SECTION_LABELS: Record<ReportSectionId, TranslationKey> = {
  byCategory: 'reports.byCategory',
  byMonth: 'reports.byMonth',
  byEnvelope: 'reports.byEnvelope',
  byPaymentMethod: 'reports.byPaymentMethod',
  trend: 'reports.trend',
  topTransactions: 'reports.topTransactions',
};

const EmptyState = () => {
  const { t } = useTranslation();
  return <SharedEmptyState message={t('reports.noData')} />;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

export const ReportsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t, language, locale } = useTranslation();
  // Spanish reports keep the Costa Rican month labels they always had.
  const reportI18n = useMemo(() => ({ t, locale: language === 'en' ? locale : 'es-CR' }), [t, language, locale]);
  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { transactions, categories, envelopes, paymentMethods, convertToCRC, settings } = useAppData();
  const [currency, setCurrency] = useState<Currency>(settings.defaultCurrency);

  useEffect(() => {
    let cancelled = false;
    loadReportsDisplayCurrency().then(stored => {
      if (!cancelled && stored) setCurrency(stored);
    });
    return () => { cancelled = true; };
  }, []);

  const cycleCurrency = () => {
    const next = CURRENCY_CYCLE[(CURRENCY_CYCLE.indexOf(currency) + 1) % CURRENCY_CYCLE.length];
    setCurrency(next);
    saveReportsDisplayCurrency(next);
  };

  // Report totals are computed in CRC; convert only for display.
  const money = (crc: number) => {
    const { USD_TO_CRC, EUR_TO_CRC } = settings.exchangeRates;
    const amount = currency === 'USD' ? crc / USD_TO_CRC : currency === 'EUR' ? crc / EUR_TO_CRC : crc;
    return formatCurrency(amount, currency);
  };
  const [period, setPeriod] = useState<ReportPeriod>('current-month');
  const [customSelected, setCustomSelected] = useState(false);
  const [customStart, setCustomStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date());
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const selectPreset = (value: ReportPeriod) => {
    setCustomSelected(false);
    setPickerTarget(null);
    setRangeError(null);
    setPeriod(value);
  };

  const selectCustom = () => {
    setCustomSelected(true);
    setRangeError(null);
    setPeriod({ kind: 'custom', start: customStart, end: customEnd });
  };

  const updateCustomRange = (start: Date, end: Date) => {
    setCustomStart(start);
    setCustomEnd(end);
    if (start.getTime() > end.getTime()) {
      // Keep the previously applied period; only show the message.
      setRangeError(t('reports.rangeError'));
      return;
    }
    setRangeError(null);
    setPeriod({ kind: 'custom', start, end });
  };

  const byCategory = useMemo(
    () => getSpendingByCategory(transactions, categories, envelopes, period, convertToCRC, reportI18n),
    [transactions, categories, envelopes, period, convertToCRC, reportI18n]
  );
  const byMonth = useMemo(
    () => getSpendingByMonth(transactions, envelopes, period, convertToCRC, reportI18n),
    [transactions, envelopes, period, convertToCRC, reportI18n]
  );
  const byEnvelope = useMemo(
    () => getSpendingByEnvelope(transactions, envelopes, period, convertToCRC, reportI18n),
    [transactions, envelopes, period, convertToCRC, reportI18n]
  );
  const byPaymentMethod = useMemo(
    () => getSpendingByPaymentMethod(transactions, paymentMethods, envelopes, period, convertToCRC, reportI18n),
    [transactions, paymentMethods, envelopes, period, convertToCRC, reportI18n]
  );
  const trend = useMemo(
    () => getMonthlyTrend(transactions, envelopes, TREND_MONTHS, convertToCRC, reportI18n),
    [transactions, envelopes, convertToCRC, reportI18n]
  );
  const topTransactions = useMemo(
    () => getTopTransactions(transactions, categories, envelopes, period, convertToCRC, undefined, reportI18n),
    [transactions, categories, envelopes, period, convertToCRC, reportI18n]
  );

  const summary = useMemo(
    () => getSummary(transactions, envelopes, period, convertToCRC),
    [transactions, envelopes, period, convertToCRC]
  );

  const [layout, setLayout] = useState<ReportLayoutItem[]>(() => REPORT_SECTIONS.map(s => ({ ...s })));
  const [editingLayout, setEditingLayout] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadReportLayout().then(stored => {
      if (!cancelled) setLayout(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyLayout = (next: ReportLayoutItem[]) => {
    setLayout(next);
    saveReportLayout(next);
  };

  const toggleSection = (id: ReportSectionId) =>
    applyLayout(layout.map(item => (item.id === id ? { ...item, visible: !item.visible } : item)));

  const moveSection = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= layout.length) return;
    const next = [...layout];
    [next[index], next[target]] = [next[target], next[index]];
    applyLayout(next);
  };

  const resetLayout = () => applyLayout(REPORT_SECTIONS.map(s => ({ ...s })));

  const maxCategoryTotal = Math.max(1, ...byCategory.map(c => c.totalCRC));
  const maxMonthTotal = Math.max(1, ...byMonth.map(m => m.totalCRC));
  const maxEnvelopeTotal = Math.max(1, ...byEnvelope.map(e => e.totalCRC));
  const maxPaymentMethodTotal = Math.max(1, ...byPaymentMethod.map(p => p.totalCRC));
  const maxTrendValue = Math.max(1, ...trend.map(entry => Math.max(entry.incomeCRC, entry.expenseCRC)));

  const sectionNodes: Record<ReportSectionId, React.ReactNode> = {
    byCategory: (
      <>
          <Text style={styles.sectionTitle}>{t('reports.byCategory')}</Text>
          <View style={styles.card}>
            {byCategory.length === 0 ? (
              <EmptyState />
            ) : (
              byCategory.map(c => (
                <View key={c.categoryId} style={styles.row}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowLabel}>{c.name}</Text>
                    <Text style={styles.rowValue}>{money(c.totalCRC)} · {c.percentage.toFixed(0)}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(c.totalCRC / maxCategoryTotal) * 100}%` }]} />
                  </View>
                </View>
              ))
            )}
          </View>
      </>
    ),
    byMonth: (
      <>
          <Text style={styles.sectionTitle}>{t('reports.byMonth')}</Text>
          <View style={styles.card}>
            {byMonth.length === 0 ? (
              <EmptyState />
            ) : (
              byMonth.map(m => (
                <View key={m.monthKey} style={styles.row}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowLabel}>{m.label}</Text>
                    <Text style={styles.rowValue}>{money(m.totalCRC)}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(m.totalCRC / maxMonthTotal) * 100}%` }]} />
                  </View>
                </View>
              ))
            )}
          </View>
      </>
    ),
    byEnvelope: (
      <>
          <Text style={styles.sectionTitle}>{t('reports.byEnvelope')}</Text>
          <View style={styles.card}>
            {byEnvelope.length === 0 ? (
              <EmptyState />
            ) : (
              byEnvelope.map(e => (
                <View key={e.envelopeId} style={styles.row}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowLabel}>{e.name}</Text>
                    <Text style={styles.rowValue}>
                      {money(e.totalCRC)}
                      {e.percentOfLimit != null ? t('reports.percentOfLimit', { percent: e.percentOfLimit.toFixed(0) }) : ''}
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(e.totalCRC / maxEnvelopeTotal) * 100}%` }]} />
                  </View>
                </View>
              ))
            )}
          </View>
      </>
    ),
    byPaymentMethod: (
      <>
          <Text style={styles.sectionTitle}>{t('reports.byPaymentMethod')}</Text>
          <View style={styles.card}>
            {byPaymentMethod.length === 0 ? (
              <EmptyState />
            ) : (
              byPaymentMethod.map(p => (
                <View key={p.paymentMethodId} style={styles.row}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowLabel}>{p.name}</Text>
                    <Text style={styles.rowValue}>{money(p.totalCRC)}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(p.totalCRC / maxPaymentMethodTotal) * 100}%` }]} />
                  </View>
                </View>
              ))
            )}
          </View>
      </>
    ),
    trend: (
      <>
          <Text style={styles.sectionTitle}>{t('reports.trendTitle', { months: TREND_MONTHS })}</Text>
          <View style={styles.card}>
            {trend.every(entry => entry.incomeCRC === 0 && entry.expenseCRC === 0) ? (
              <EmptyState />
            ) : (
              trend.map(entry => (
                <View key={entry.monthKey} style={styles.row}>
                  <Text style={styles.rowLabel}>{entry.label}</Text>
                  <View style={styles.trendLine}>
                    <Text style={styles.trendIncomeLabel}>{t('reports.incomeAmount', { amount: money(entry.incomeCRC) })}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { backgroundColor: colors.green, width: `${(entry.incomeCRC / maxTrendValue) * 100}%` }]} />
                    </View>
                  </View>
                  <View style={styles.trendLine}>
                    <Text style={styles.trendExpenseLabel}>{t('reports.expenseAmount', { amount: money(entry.expenseCRC) })}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { backgroundColor: colors.red, width: `${(entry.expenseCRC / maxTrendValue) * 100}%` }]} />
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
      </>
    ),
    topTransactions: (
      <>
          <Text style={styles.sectionTitle}>{t('reports.topTransactions')}</Text>
          <View style={styles.card}>
            {topTransactions.length === 0 ? (
              <EmptyState />
            ) : (
              topTransactions.map(entry => (
                <View key={entry.transaction.id} style={styles.topTxRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{entry.transaction.description || entry.envelopeName}</Text>
                    <Text style={styles.topTxSubtitle}>
                      {entry.envelopeName} · {entry.categoryName} · {new Date(entry.transaction.date).toLocaleDateString(reportI18n.locale)}
                    </Text>
                  </View>
                  <Text style={styles.rowValue}>{money(entry.amountCRC)}</Text>
                </View>
              ))
            )}
          </View>
      </>
    ),
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('reports.title')}</Text>
        <TouchableOpacity
          onPress={cycleCurrency}
          style={styles.currencyBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.changeReportsCurrency', { currency })}
        >
          <Text style={styles.currencyText}>{currency}</Text>
        </TouchableOpacity>
      </View>

      <NestableScrollContainer contentContainerStyle={styles.scroll}>
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.periodPill, !customSelected && period === opt.value && styles.periodPillActive]}
              onPress={() => selectPreset(opt.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodPillText, !customSelected && period === opt.value && styles.periodPillTextActive]} numberOfLines={1}>
                {t(opt.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.periodPill, customSelected && styles.periodPillActive]}
            onPress={selectCustom}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodPillText, customSelected && styles.periodPillTextActive]} numberOfLines={1}>{t('reports.periodCustom')}</Text>
          </TouchableOpacity>
        </View>

        {customSelected && (
          <View style={styles.customRange}>
            <View style={styles.customRangeRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerTarget('start')} activeOpacity={0.8}>
                <Calendar color={colors.secondaryText} size={16} />
                <Text style={styles.dateBtnText}>{t('reports.fromDate', { date: formatDate(customStart) })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerTarget('end')} activeOpacity={0.8}>
                <Calendar color={colors.secondaryText} size={16} />
                <Text style={styles.dateBtnText}>{t('reports.toDate', { date: formatDate(customEnd) })}</Text>
              </TouchableOpacity>
            </View>
            {rangeError && <Text style={styles.rangeError}>{rangeError}</Text>}
          </View>
        )}

        {pickerTarget && (
          <DateTimePicker
            value={pickerTarget === 'start' ? customStart : customEnd}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(_event, selectedDate) => {
              const target = pickerTarget;
              setPickerTarget(null);
              if (!selectedDate) return;
              if (target === 'start') updateCustomRange(selectedDate, customEnd);
              else updateCustomRange(customStart, selectedDate);
            }}
          />
        )}

        <View style={styles.summaryGrid}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>{t('reports.summaryIncome')}</Text>
            <Text style={[styles.summaryValue, { color: colors.green }]}>{money(summary.income)}</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>{t('reports.summaryExpenses')}</Text>
            <Text style={[styles.summaryValue, { color: colors.red }]}>{money(summary.expenses)}</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>{t('reports.summaryNet')}</Text>
            <Text style={[styles.summaryValue, { color: summary.net >= 0 ? colors.green : colors.red }]}>
              {money(summary.net)}
            </Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>{t('reports.summaryAverage')}</Text>
            <Text style={styles.summaryValue}>
              {summary.averageExpense == null ? '—' : money(summary.averageExpense)}
            </Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>{t('reports.summaryCount')}</Text>
            <Text style={styles.summaryValue}>{summary.expenseCount}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.layoutToggle} onPress={() => setEditingLayout(v => !v)} activeOpacity={0.8}>
          <SlidersHorizontal color={colors.secondaryText} size={16} />
          <Text style={styles.layoutToggleText}>{editingLayout ? t('reports.customizeClose') : t('reports.customizeOpen')}</Text>
        </TouchableOpacity>

        {editingLayout && (
          <View style={styles.card}>
            <Text style={styles.dragHint}>{t('reports.dragHint')}</Text>
            <NestableDraggableFlatList
              data={layout}
              keyExtractor={item => item.id}
              onDragEnd={({ data }) => applyLayout(data)}
              renderItem={({ item, drag, isActive, getIndex }: RenderItemParams<ReportLayoutItem>) => {
                const index = getIndex() ?? 0;
                return (
                  <ScaleDecorator>
                    <View style={[styles.layoutRow, isActive && styles.layoutRowActive]}>
                      <TouchableOpacity
                        onLongPress={drag}
                        delayLongPress={150}
                        disabled={isActive}
                        style={styles.dragHandle}
                        accessibilityLabel={t('reports.dragHandle', { section: t(SECTION_LABELS[item.id]) })}
                      >
                        <GripVertical color={colors.secondaryText} size={20} />
                      </TouchableOpacity>
                      <Switch
                        value={item.visible}
                        onValueChange={() => toggleSection(item.id)}
                        trackColor={{ false: colors.divider, true: colors.green }}
                      />
                      <Text style={[styles.rowLabel, styles.layoutLabel]}>{t(SECTION_LABELS[item.id])}</Text>
                      <TouchableOpacity
                        onPress={() => moveSection(index, -1)}
                        disabled={index === 0}
                        style={[styles.moveBtn, index === 0 && styles.moveBtnDisabled]}
                        accessibilityLabel={t('reports.moveUp', { section: t(SECTION_LABELS[item.id]) })}
                      >
                        <ChevronUp color={colors.white} size={20} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moveSection(index, 1)}
                        disabled={index === layout.length - 1}
                        style={[styles.moveBtn, index === layout.length - 1 && styles.moveBtnDisabled]}
                        accessibilityLabel={t('reports.moveDown', { section: t(SECTION_LABELS[item.id]) })}
                      >
                        <ChevronDown color={colors.white} size={20} />
                      </TouchableOpacity>
                    </View>
                  </ScaleDecorator>
                );
              }}
            />
            <TouchableOpacity style={styles.resetBtn} onPress={resetLayout} activeOpacity={0.8}>
              <Text style={styles.resetBtnText}>{t('reports.reset')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {layout.filter(item => item.visible).map(item => (
          <React.Fragment key={item.id}>{sectionNodes[item.id]}</React.Fragment>
        ))}
      </NestableScrollContainer>
    </SafeAreaView>
  );
};
