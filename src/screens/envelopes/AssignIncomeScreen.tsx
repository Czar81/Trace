import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useAppData } from '../../context/ExpenseContext';
import { RootStackParamList } from '../../navigation/types';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { Dropdown } from '../../components/forms/Dropdown';
import { EnvelopeAvatar } from '../../components/envelope/EnvelopeAvatar';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { Currency } from '../../types';
import { sortEnvelopesByTypeAndName } from '../../domain/budget/envelopeSorting';
import { getUnallocated, parseAmount, toInputString } from '../../domain/budget/allocation';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'AssignIncome'>;

const CURRENCY_OPTIONS = [
  { label: 'CRC', value: 'CRC' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
];

export const AssignIncomeScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { envelopes, incomeCategories, settings, addTransactions, formatAmount } = useAppData();

  const [currency, setCurrency] = useState<Currency>(settings.defaultCurrency);
  const [totalStr, setTotalStr] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(incomeCategories[0]?.id ?? '');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  // A paycheck split only feeds savings envelopes; spending and debt envelopes are excluded.
  const targets = useMemo(
    () => sortEnvelopesByTypeAndName(envelopes.filter(e => e.currency === currency && e.type === 'ahorro')),
    [envelopes, currency]
  );

  const total = parseAmount(totalStr);
  const assigned = targets.map(e => parseAmount(amounts[e.id] ?? ''));
  const unassigned = getUnallocated(total, assigned);
  const hasAnyAmount = assigned.some(a => a > 0);

  const setAmount = (id: string, value: string) => {
    setAmounts(prev => ({ ...prev, [id]: value }));
    setError('');
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value as Currency);
    setAmounts({});
  };

  const handleSave = async () => {
    if (total <= 0) { setError(t('assign.errorTotal')); return; }
    if (!hasAnyAmount) { setError(t('assign.errorNone')); return; }
    if (unassigned < 0) { setError(t('assign.errorOver')); return; }

    const date = new Date().toISOString();
    await addTransactions(
      targets
        .map((e, i) => ({ envelope: e, amount: assigned[i] }))
        .filter(x => x.amount > 0)
        .map(({ envelope, amount }) => ({
          envelopeId: envelope.id,
          type: 'income' as const,
          amount,
          description: description.trim() || t('assign.defaultDescription'),
          date,
          categoryId: categoryId || undefined,
        }))
    );
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('assign.title')}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Check color={colors.green} size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={1}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>{t('assign.hint')}</Text>

          <Dropdown label={t('envelope.currency')} options={CURRENCY_OPTIONS} value={currency} onSelect={handleCurrencyChange} />

          <CurrencyInput
            label={t('assign.total')}
            currency={currency}
            value={totalStr}
            onChangeText={(v) => { setTotalStr(v); setError(''); }}
            style={{ fontSize: 30, color: colors.white }}
          />

          <Text style={styles.label}>{t('common.description')}</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder={t('assign.descriptionPlaceholder')}
            placeholderTextColor={colors.secondaryText}
          />

          <Dropdown
            label={t('common.category')}
            options={incomeCategories.map(c => ({ label: c.name, value: c.id }))}
            value={categoryId}
            onSelect={setCategoryId}
            placeholder={t('tx.selectCategory')}
          />

          <View style={[styles.remainingCard, unassigned < 0 && styles.remainingCardOver]}>
            <Text style={styles.remainingLabel}>{unassigned < 0 ? t('assign.overAssigned') : t('assign.unassigned')}</Text>
            <Text style={[styles.remainingAmount, unassigned < 0 && { color: colors.red }]}>
              {formatAmount(Math.abs(unassigned), currency)}
            </Text>
          </View>

          {targets.length === 0 ? (
            <Text style={styles.hint}>{t('assign.noEnvelopes')}</Text>
          ) : (
            targets.map((e, i) => (
              <View key={e.id} style={styles.row}>
                <EnvelopeAvatar icon={e.icon ?? 'box'} imageUri={e.imageUri} color={e.color} size={36} />
                <Text style={styles.rowName} numberOfLines={1}>{e.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const fill = assigned[i] + Math.max(0, unassigned);
                    if (fill > 0) setAmount(e.id, toInputString(fill));
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={styles.restBtn}>{t('assign.fillRest')}</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.rowInput}
                  value={amounts[e.id] ?? ''}
                  onChangeText={(v) => setAmount(e.id, v.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="numeric"
                />
              </View>
            ))
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.hint}>{t('assign.leftoverNote')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  keyboardAvoiding: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  headerBtn: { padding: SPACING.xs },
  headerTitle: { color: colors.white, fontSize: FONT_SIZE.xl, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  form: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  label: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '600', marginBottom: SPACING.sm },
  hint: { color: colors.secondaryText, fontSize: FONT_SIZE.sm, marginBottom: SPACING.lg },
  input: { backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: SPACING.lg, color: colors.white, fontSize: FONT_SIZE.lg, marginBottom: SPACING.xxl },
  remainingCard: { backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  remainingCardOver: { borderWidth: 1, borderColor: colors.red },
  remainingLabel: { color: colors.secondaryText, fontSize: FONT_SIZE.md },
  remainingAmount: { color: colors.white, fontSize: FONT_SIZE.xxl, fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.md },
  rowName: { color: colors.white, fontSize: FONT_SIZE.base, flex: 1 },
  restBtn: { color: colors.secondaryText, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  rowInput: { backgroundColor: colors.cardBg, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: 10, color: colors.white, fontSize: FONT_SIZE.lg, width: 110, textAlign: 'right' },
  errorText: { color: colors.red, fontSize: FONT_SIZE.md, marginVertical: SPACING.md },
});
