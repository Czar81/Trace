import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { COLORS as SHARED } from '../theme/colors';
import {
  ReportPeriod,
  getSpendingByCategory,
  getSpendingByMonth,
  getSpendingByEnvelope,
  getSpendingByPaymentMethod,
  getMonthlyTrend,
  getTopTransactions,
} from '../utils/reports';
import { formatCurrency } from '../utils/formatCurrency';

const COLORS = {
  bg: SHARED.bg,
  cardBg: SHARED.cardBg,
  white: SHARED.white,
  secondaryText: SHARED.secondaryText,
  divider: SHARED.divider,
  green: SHARED.green,
  blue: SHARED.blue,
  red: SHARED.red,
};

const TREND_MONTHS = 6;

const PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: 'Este mes', value: 'current-month' },
  { label: '3 meses', value: 'last-3-months' },
  { label: '6 meses', value: 'last-6-months' },
  { label: 'Todo', value: 'all-time' },
];

const EmptyState = () => <Text style={styles.emptyText}>Sin datos para este período</Text>;

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

export const ReportsScreen = ({ navigation }: Props) => {
  const { transactions, categories, envelopes, paymentMethods, convertToCRC } = useAppData();
  const [period, setPeriod] = useState<ReportPeriod>('current-month');

  const byCategory = useMemo(
    () => getSpendingByCategory(transactions, categories, envelopes, period, convertToCRC),
    [transactions, categories, envelopes, period, convertToCRC]
  );
  const byMonth = useMemo(
    () => getSpendingByMonth(transactions, envelopes, period, convertToCRC),
    [transactions, envelopes, period, convertToCRC]
  );
  const byEnvelope = useMemo(
    () => getSpendingByEnvelope(transactions, envelopes, period, convertToCRC),
    [transactions, envelopes, period, convertToCRC]
  );
  const byPaymentMethod = useMemo(
    () => getSpendingByPaymentMethod(transactions, paymentMethods, envelopes, period, convertToCRC),
    [transactions, paymentMethods, envelopes, period, convertToCRC]
  );
  const trend = useMemo(
    () => getMonthlyTrend(transactions, envelopes, TREND_MONTHS, convertToCRC),
    [transactions, envelopes, convertToCRC]
  );
  const topTransactions = useMemo(
    () => getTopTransactions(transactions, categories, envelopes, period, convertToCRC),
    [transactions, categories, envelopes, period, convertToCRC]
  );

  const maxCategoryTotal = Math.max(1, ...byCategory.map(c => c.totalCRC));
  const maxMonthTotal = Math.max(1, ...byMonth.map(m => m.totalCRC));
  const maxEnvelopeTotal = Math.max(1, ...byEnvelope.map(e => e.totalCRC));
  const maxPaymentMethodTotal = Math.max(1, ...byPaymentMethod.map(p => p.totalCRC));
  const maxTrendValue = Math.max(1, ...trend.map(t => Math.max(t.incomeCRC, t.expenseCRC)));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportes</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.periodPill, period === opt.value && styles.periodPillActive]}
              onPress={() => setPeriod(opt.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodPillText, period === opt.value && styles.periodPillTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Gastos por categoría</Text>
        <View style={styles.card}>
          {byCategory.length === 0 ? (
            <EmptyState />
          ) : (
            byCategory.map(c => (
              <View key={c.categoryId} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowLabel}>{c.name}</Text>
                  <Text style={styles.rowValue}>{formatCurrency(c.totalCRC, 'CRC')} · {c.percentage.toFixed(0)}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(c.totalCRC / maxCategoryTotal) * 100}%` }]} />
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Gastos por mes</Text>
        <View style={styles.card}>
          {byMonth.length === 0 ? (
            <EmptyState />
          ) : (
            byMonth.map(m => (
              <View key={m.monthKey} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowLabel}>{m.label}</Text>
                  <Text style={styles.rowValue}>{formatCurrency(m.totalCRC, 'CRC')}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(m.totalCRC / maxMonthTotal) * 100}%` }]} />
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Gastos por sobre</Text>
        <View style={styles.card}>
          {byEnvelope.length === 0 ? (
            <EmptyState />
          ) : (
            byEnvelope.map(e => (
              <View key={e.envelopeId} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowLabel}>{e.name}</Text>
                  <Text style={styles.rowValue}>
                    {formatCurrency(e.totalCRC, 'CRC')}
                    {e.percentOfLimit != null ? ` · ${e.percentOfLimit.toFixed(0)}% del límite` : ''}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(e.totalCRC / maxEnvelopeTotal) * 100}%` }]} />
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Gastos por método de pago</Text>
        <View style={styles.card}>
          {byPaymentMethod.length === 0 ? (
            <EmptyState />
          ) : (
            byPaymentMethod.map(p => (
              <View key={p.paymentMethodId} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowLabel}>{p.name}</Text>
                  <Text style={styles.rowValue}>{formatCurrency(p.totalCRC, 'CRC')}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(p.totalCRC / maxPaymentMethodTotal) * 100}%` }]} />
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Tendencia mensual (últimos {TREND_MONTHS} meses)</Text>
        <View style={styles.card}>
          {trend.every(t => t.incomeCRC === 0 && t.expenseCRC === 0) ? (
            <EmptyState />
          ) : (
            trend.map(t => (
              <View key={t.monthKey} style={styles.row}>
                <Text style={styles.rowLabel}>{t.label}</Text>
                <View style={styles.trendLine}>
                  <Text style={styles.trendIncomeLabel}>Ingresos {formatCurrency(t.incomeCRC, 'CRC')}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { backgroundColor: COLORS.green, width: `${(t.incomeCRC / maxTrendValue) * 100}%` }]} />
                  </View>
                </View>
                <View style={styles.trendLine}>
                  <Text style={styles.trendExpenseLabel}>Gastos {formatCurrency(t.expenseCRC, 'CRC')}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { backgroundColor: COLORS.red, width: `${(t.expenseCRC / maxTrendValue) * 100}%` }]} />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Transacciones más grandes</Text>
        <View style={styles.card}>
          {topTransactions.length === 0 ? (
            <EmptyState />
          ) : (
            topTransactions.map(t => (
              <View key={t.transaction.id} style={styles.topTxRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t.transaction.description || t.envelopeName}</Text>
                  <Text style={styles.topTxSubtitle}>
                    {t.envelopeName} · {t.categoryName} · {new Date(t.transaction.date).toLocaleDateString('es-CR')}
                  </Text>
                </View>
                <Text style={styles.rowValue}>{formatCurrency(t.amountCRC, 'CRC')}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  periodPill: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.cardBg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.divider },
  periodPillActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  periodPillText: { color: COLORS.secondaryText, fontSize: 13, fontWeight: '600' },
  periodPillTextActive: { color: COLORS.bg },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.divider },
  emptyText: { color: COLORS.secondaryText, fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  row: { marginBottom: 14 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel: { color: COLORS.white, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  rowValue: { color: COLORS.secondaryText, fontSize: 13 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.divider, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.blue },
  trendLine: { marginTop: 4, marginBottom: 4 },
  trendIncomeLabel: { color: COLORS.green, fontSize: 12, marginBottom: 4 },
  trendExpenseLabel: { color: COLORS.red, fontSize: 12, marginTop: 6, marginBottom: 4 },
  topTxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  topTxSubtitle: { color: COLORS.secondaryText, fontSize: 12, marginTop: 2 },
});
