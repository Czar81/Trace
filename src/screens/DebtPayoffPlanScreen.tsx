import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft } from 'lucide-react-native';
import { useAppData } from '../context/ExpenseContext';
import { RootStackParamList } from '../navigation/types';
import { CurrencyInput } from '../components/CurrencyInput';
import { Dropdown } from '../components/Dropdown';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { Currency } from '../types';
import { PayoffDebt, PayoffStrategy, simulatePayoff } from '../utils/debtPayoff';
import { parseAmount } from '../utils/allocation';

type Props = NativeStackScreenProps<RootStackParamList, 'DebtPayoffPlan'>;

const CURRENCY_OPTIONS = [
  { label: 'CRC', value: 'CRC' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
];

export const DebtPayoffPlanScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t, locale } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { envelopes, settings, getEnvelopeBalance, formatAmount } = useAppData();

  const [currency, setCurrency] = useState<Currency>(settings.defaultCurrency);
  const [strategy, setStrategy] = useState<PayoffStrategy>('avalanche');
  const [budgetStr, setBudgetStr] = useState('');

  const debts = useMemo(
    () =>
      envelopes
        .filter(e => e.type === 'deuda' && !e.isUnlimited && e.currency === currency)
        .map(e => ({
          envelope: e,
          debt: {
            id: e.id,
            owed: e.limit - getEnvelopeBalance(e.id),
            interestRate: e.interestRate ?? 0,
            interestFrequency: e.interestFrequency ?? 'mensual',
            minimumPayment: e.minimumPayment ?? 0,
          } as PayoffDebt,
        }))
        .filter(x => x.debt.owed > 0),
    [envelopes, currency, getEnvelopeBalance]
  );

  const totalMinimums = debts.reduce((sum, x) => sum + x.debt.minimumPayment, 0);
  const budget = parseAmount(budgetStr) || totalMinimums;

  const results = useMemo(() => {
    const list = debts.map(x => x.debt);
    return {
      snowball: simulatePayoff(list, budget, 'snowball'),
      avalanche: simulatePayoff(list, budget, 'avalanche'),
    };
  }, [debts, budget]);
  const result = results[strategy];

  const payoffDate = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  };

  const nameOf = (id: string) => debts.find(x => x.envelope.id === id)?.envelope.name ?? '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payoff.title')}</Text>
        <View style={styles.headerBtn}><View style={{ width: 24 }} /></View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={1}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Dropdown label={t('envelope.currency')} options={CURRENCY_OPTIONS} value={currency} onSelect={(v) => setCurrency(v as Currency)} />

          {debts.length === 0 ? (
            <Text style={styles.hint}>{t('payoff.noDebts')}</Text>
          ) : (
            <>
              <CurrencyInput
                label={t('payoff.budget')}
                currency={currency}
                value={budgetStr}
                onChangeText={setBudgetStr}
                placeholder={String(totalMinimums || 0)}
              />
              <Text style={styles.hint}>{t('payoff.budgetHint', { amount: formatAmount(totalMinimums, currency) })}</Text>

              <View style={styles.strategyRow}>
                {(['avalanche', 'snowball'] as PayoffStrategy[]).map(s => (
                  <TouchableOpacity key={s} style={[styles.strategyBtn, strategy === s && styles.strategyBtnActive]} onPress={() => setStrategy(s)}>
                    <Text style={[styles.strategyTitle, strategy === s && { color: colors.bg }]}>{t(s === 'avalanche' ? 'payoff.avalanche' : 'payoff.snowball')}</Text>
                    <Text style={[styles.strategyDesc, strategy === s && { color: colors.bg }]}>{t(s === 'avalanche' ? 'payoff.avalancheDesc' : 'payoff.snowballDesc')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {budget <= 0 ? (
                <Text style={styles.warning}>{t('payoff.needBudget')}</Text>
              ) : !result.feasible ? (
                <Text style={styles.warning}>{t('payoff.notFeasible')}</Text>
              ) : (
                <View style={styles.summary}>
                  <Text style={styles.summaryLabel}>{t('payoff.debtFree')}</Text>
                  <Text style={styles.summaryValue}>{payoffDate(result.months)}</Text>
                  <Text style={styles.summaryLine}>{t('payoff.months', { months: result.months })}</Text>
                  <Text style={styles.summaryLine}>{t('payoff.totalInterest', { amount: formatAmount(result.totalInterest, currency) })}</Text>
                  {results.avalanche.feasible && results.snowball.feasible && results.avalanche.totalInterest !== results.snowball.totalInterest ? (
                    <Text style={styles.summaryNote}>
                      {t('payoff.compare', {
                        amount: formatAmount(Math.abs(results.snowball.totalInterest - results.avalanche.totalInterest), currency),
                      })}
                    </Text>
                  ) : null}
                </View>
              )}

              <Text style={styles.sectionTitle}>{t('payoff.order')}</Text>
              {result.order.map((id, i) => {
                const x = debts.find(d => d.envelope.id === id)!;
                const m = result.payoffMonthById[id];
                return (
                  <View key={id} style={styles.debtRow}>
                    <Text style={styles.debtIndex}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.debtName}>{nameOf(id)}</Text>
                      <Text style={styles.debtMeta}>
                        {formatAmount(x.debt.owed, currency)}
                        {x.debt.interestRate > 0 ? ` · ${x.debt.interestRate}%` : ''}
                      </Text>
                    </View>
                    {m ? <Text style={styles.debtMeta}>{payoffDate(m)}</Text> : null}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerBtn: { padding: 4 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  form: { paddingHorizontal: 20, paddingBottom: 60 },
  hint: { color: colors.secondaryText, fontSize: 13, marginBottom: 16 },
  warning: { color: colors.red, fontSize: 14, marginBottom: 20 },
  strategyRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  strategyBtn: { flex: 1, backgroundColor: colors.cardBg, borderRadius: 14, padding: 14 },
  strategyBtnActive: { backgroundColor: colors.white },
  strategyTitle: { color: colors.white, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  strategyDesc: { color: colors.secondaryText, fontSize: 12 },
  summary: { backgroundColor: colors.cardBg, borderRadius: 14, padding: 16, marginBottom: 24 },
  summaryLabel: { color: colors.secondaryText, fontSize: 13 },
  summaryValue: { color: colors.white, fontSize: 24, fontWeight: 'bold', marginVertical: 4 },
  summaryLine: { color: colors.secondaryText, fontSize: 14, marginTop: 2 },
  summaryNote: { color: colors.green, fontSize: 13, marginTop: 10 },
  sectionTitle: { color: colors.white, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cardBg, borderRadius: 12, padding: 14, marginBottom: 10 },
  debtIndex: { color: colors.secondaryText, fontSize: 16, fontWeight: 'bold', width: 20 },
  debtName: { color: colors.white, fontSize: 15, fontWeight: '600' },
  debtMeta: { color: colors.secondaryText, fontSize: 12, marginTop: 2 },
});
