import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Bookmark, X } from 'lucide-react-native';
import { useAppData } from '../../context/ExpenseContext';
import { RootStackParamList } from '../../navigation/types';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { CurrencySelector } from '../../components/forms/CurrencySelector';
import { Dropdown } from '../../components/forms/Dropdown';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { Currency, SavedDebtPlan } from '../../types';
import { loadDebtPlans, saveDebtPlans } from '../../services/storage/storage';
import { PayoffDebt, PayoffStrategy, simulatePayoff } from '../../domain/budget/debtPayoff';
import { parseAmount } from '../../domain/budget/allocation';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'DebtPayoffPlan'>;

export const DebtPayoffPlanScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t, locale } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { envelopes, settings, getEnvelopeBalance, formatAmount } = useAppData();

  const [currency, setCurrency] = useState<Currency>(settings.defaultCurrency);
  const [strategy, setStrategy] = useState<PayoffStrategy>('avalanche');
  const [budgetStr, setBudgetStr] = useState('');

  const [savedPlans, setSavedPlans] = useState<SavedDebtPlan[]>([]);
  const [planName, setPlanName] = useState('');
  const [naming, setNaming] = useState(false);

  useEffect(() => {
    void loadDebtPlans().then(setSavedPlans);
  }, []);

  const persistPlans = (plans: SavedDebtPlan[]) => {
    setSavedPlans(plans);
    void saveDebtPlans(plans);
  };

  const handleSavePlan = () => {
    const name = planName.trim();
    if (!name) return;
    persistPlans([
      { id: Date.now().toString(), name, currency, strategy, monthlyBudget: parseAmount(budgetStr) || null, createdAt: new Date().toISOString() },
      ...savedPlans,
    ]);
    setPlanName('');
    setNaming(false);
  };

  const handleLoadPlan = (plan: SavedDebtPlan) => {
    setCurrency(plan.currency);
    setStrategy(plan.strategy);
    setBudgetStr(plan.monthlyBudget ? String(plan.monthlyBudget) : '');
  };

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
          {savedPlans.length > 0 && (
            <View style={styles.savedSection}>
              <Text style={styles.sectionTitle}>{t('payoff.savedPlans')}</Text>
              {savedPlans.map(plan => (
                <TouchableOpacity key={plan.id} style={styles.savedRow} onPress={() => handleLoadPlan(plan)} activeOpacity={0.8}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.debtName}>{plan.name}</Text>
                    <Text style={styles.debtMeta}>
                      {t(plan.strategy === 'avalanche' ? 'payoff.avalanche' : 'payoff.snowball')} · {plan.currency} · {plan.monthlyBudget ? formatAmount(plan.monthlyBudget, plan.currency) : t('payoff.minimumsOnly')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => persistPlans(savedPlans.filter(p => p.id !== plan.id))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={t('common.delete')}>
                    <X color={colors.secondaryText} size={18} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <Text style={styles.hint}>{t('payoff.savedHint')}</Text>
            </View>
          )}

          <CurrencySelector label={t('envelope.currency')} value={currency} onSelect={setCurrency} />

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

              {naming ? (
                <View style={styles.nameRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={planName}
                    onChangeText={setPlanName}
                    placeholder={t('payoff.planNamePlaceholder')}
                    placeholderTextColor={colors.secondaryText}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.nameSave} onPress={handleSavePlan}>
                    <Text style={styles.nameSaveText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.saveBtn} onPress={() => setNaming(true)} activeOpacity={0.8}>
                  <Bookmark color={colors.white} size={16} />
                  <Text style={styles.saveBtnText}>{t('payoff.savePlan')}</Text>
                </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  headerBtn: { padding: SPACING.xs },
  headerTitle: { color: colors.white, fontSize: FONT_SIZE.xl, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  form: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  hint: { color: colors.secondaryText, fontSize: FONT_SIZE.sm, marginBottom: SPACING.lg },
  warning: { color: colors.red, fontSize: FONT_SIZE.md, marginBottom: SPACING.xl },
  strategyRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.xl },
  strategyBtn: { flex: 1, backgroundColor: colors.cardBg, borderRadius: RADIUS.lg, padding: 14 },
  strategyBtnActive: { backgroundColor: colors.white },
  strategyTitle: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '700', marginBottom: SPACING.xs },
  strategyDesc: { color: colors.secondaryText, fontSize: FONT_SIZE.xs },
  summary: { backgroundColor: colors.cardBg, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xxl },
  summaryLabel: { color: colors.secondaryText, fontSize: FONT_SIZE.sm },
  summaryValue: { color: colors.white, fontSize: 24, fontWeight: 'bold', marginVertical: SPACING.xs },
  summaryLine: { color: colors.secondaryText, fontSize: FONT_SIZE.md, marginTop: SPACING.xxs },
  summaryNote: { color: colors.green, fontSize: FONT_SIZE.sm, marginTop: 10 },
  savedSection: { marginBottom: SPACING.sm },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: 14, marginBottom: SPACING.xxl },
  saveBtnText: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '600' },
  nameRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.xxl },
  nameInput: { flex: 1, backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: 14, color: colors.white, fontSize: FONT_SIZE.base },
  nameSave: { backgroundColor: colors.green, borderRadius: RADIUS.md, paddingHorizontal: 18, justifyContent: 'center' },
  nameSaveText: { color: colors.bg, fontSize: FONT_SIZE.base, fontWeight: '700' },
  sectionTitle: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '700', marginBottom: SPACING.md },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  debtIndex: { color: colors.secondaryText, fontSize: FONT_SIZE.lg, fontWeight: 'bold', width: 20 },
  debtName: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '600' },
  debtMeta: { color: colors.secondaryText, fontSize: FONT_SIZE.xs, marginTop: SPACING.xxs },
});
