import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DateField } from '../../components/forms/DateField';
import { useAppData } from '../../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Check from 'lucide-react-native/icons/check';
import PlusCircle from 'lucide-react-native/icons/circle-plus';
import MinusCircle from 'lucide-react-native/icons/circle-minus';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { Dropdown } from '../../components/forms/Dropdown';
import { DayGridSheet } from '../../components/forms/DayGridSheet';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { TranslationKey } from '../../i18n';
import { Envelope, RecurrenceFrequency } from '../../types';
import { sortEnvelopesByTypeAndName } from '../../domain/budget/envelopeSorting';
import { clampDayOfMonth } from '../../domain/recurring/recurrence';
import { hapticSave } from '../../services/device/haptics';
import { SPACING } from '../../theme/tokens';
import { makeStyles } from './CreateRecurringTransactionScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRecurringTransaction'>;

const FREQUENCY_OPTIONS: { labelKey: TranslationKey; value: RecurrenceFrequency }[] = [
  { labelKey: 'recurring.frequencyMonthly', value: 'monthly' },
  { labelKey: 'recurring.frequencyWeekly', value: 'weekly' },
  { labelKey: 'recurring.frequencyBiweekly', value: 'biweekly' },
  { labelKey: 'recurring.frequencyAnnual', value: 'annual' },
];

const ENVELOPE_TYPE_LABELS: Record<Envelope['type'], TranslationKey> = { gasto: 'main.tabExpenses', ahorro: 'main.tabSavings', deuda: 'main.tabDebts' };

/** Next date on/after today for a monthly (or, with `month`, annual) charge on `day`, clamped to short months. */
function nextChargeDate(day: number, month?: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 24; i++) {
    const y = today.getFullYear() + (month ? i : 0);
    const m = month ? month - 1 : today.getMonth() + i;
    const candidate = new Date(y, m, clampDayOfMonth(y + Math.floor(m / 12), ((m % 12) + 12) % 12, day));
    if (candidate >= today) return candidate;
  }
  return today;
}

/** Nearest date on/after today that falls on `dayOfWeek` (0=Sunday..6=Saturday). */
function nextDateForDayOfWeek(dayOfWeek: number): Date {
  const today = new Date();
  const diff = (dayOfWeek - today.getDay() + 7) % 7;
  const result = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
  return result;
}

export const CreateRecurringTransactionScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { t, locale } = useTranslation();
  const frequencyOptions = FREQUENCY_OPTIONS.map(o => ({ label: t(o.labelKey), value: o.value }));
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const name = t(`month.${i + 1}` as TranslationKey);
    return { label: name.charAt(0).toUpperCase() + name.slice(1), value: String(i + 1) };
  });
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { template } = route.params;
  const { envelopes, paymentMethods, categories, incomeCategories, addRecurringTemplate, updateRecurringTemplate } = useAppData();

  const isEditing = !!template;

  const [envelopeId, setEnvelopeId] = useState(template?.envelopeId ?? (envelopes[0]?.id ?? ''));
  const [type, setType] = useState<'expense' | 'income'>(template?.type ?? 'expense');
  const [amountStr, setAmountStr] = useState(template ? String(template.amount) : '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(template?.frequency ?? 'monthly');
  const [dayOfMonthStr, setDayOfMonthStr] = useState(template ? String(template.dayOfMonth) : '');
  const [month, setMonth] = useState<number>(template?.month ?? new Date().getMonth() + 1);
  const [occurrenceDate, setOccurrenceDate] = useState<Date>(() => {
    if (template?.frequency === 'biweekly' && template.anchorDate) return new Date(template.anchorDate);
    if (template?.frequency === 'weekly' && template.dayOfWeek !== undefined) return nextDateForDayOfWeek(template.dayOfWeek);
    return new Date();
  });
  const [paymentMethodId, setPaymentMethodId] = useState(
    template?.paymentMethodId ?? (paymentMethods[0]?.id ?? '')
  );
  const [categoryId, setCategoryId] = useState(
    template?.categoryId ?? (categories[0]?.id ?? '')
  );
  const [useSavingsEnvelope, setUseSavingsEnvelope] = useState(!!template?.sourceSavingsEnvelopeId);
  const [sourceSavingsEnvelopeId, setSourceSavingsEnvelopeId] = useState(template?.sourceSavingsEnvelopeId ?? '');
  const [dayError, setDayError] = useState('');
  const [showDaySheet, setShowDaySheet] = useState(false);

  const envelope = envelopes.find(e => e.id === envelopeId);
  const selectedDay = parseInt(dayOfMonthStr, 10) || null;
  const nextCharge = selectedDay ? nextChargeDate(selectedDay, frequency === 'annual' ? month : undefined) : null;
  const envelopeOptions = sortEnvelopesByTypeAndName(envelopes).map(e => ({
    label: `${e.name} (${e.currency})`,
    value: e.id,
    group: t(ENVELOPE_TYPE_LABELS[e.type]),
  }));
  const pmOptions = paymentMethods.map(pm => ({ label: pm.name, value: pm.id }));
  const catOptions = categories.map(c => ({ label: c.name, value: c.id }));
  const incomeCatOptions = incomeCategories.map(c => ({ label: c.name, value: c.id }));
  // Explicit 'ahorro' check — already excludes 'deuda' envelopes as a funding source.
  const savingsEnvelopes = sortEnvelopesByTypeAndName(envelopes.filter(e => e.type === 'ahorro'));
  const savingsOptions = savingsEnvelopes.map(e => ({ label: e.name, value: e.id }));

  useEffect(() => {
    if (type !== 'expense' || envelope?.type !== 'gasto') {
      setUseSavingsEnvelope(false);
      return;
    }

    if (useSavingsEnvelope && !sourceSavingsEnvelopeId && savingsEnvelopes.length > 0) {
      setSourceSavingsEnvelopeId(savingsEnvelopes[0].id);
    }
  }, [type, envelope?.type, useSavingsEnvelope, sourceSavingsEnvelopeId, savingsEnvelopes]);

  // Category options come from the catalog matching the active type, mirroring
  // the regular transaction form; a selection is re-seeded when the type flips.
  const activeCategories = type === 'income' ? incomeCategories : categories;
  useEffect(() => {
    if (categoryId && activeCategories.some(c => c.id === categoryId)) return;
    setCategoryId(activeCategories[0]?.id ?? '');
  }, [activeCategories, categoryId]);

  const handleSave = async () => {
    const amount = parseFloat(amountStr);
    if (!amountStr || isNaN(amount) || amount <= 0) return;
    if (!envelopeId) return;

    let dayOfMonth = 1;
    if (frequency === 'monthly' || frequency === 'annual') {
      const parsedDay = parseInt(dayOfMonthStr, 10);
      if (!dayOfMonthStr || isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        setDayError(t('recurring.invalidDay'));
        return;
      }
      dayOfMonth = parsedDay;
    }
    setDayError('');

    const data = {
      envelopeId,
      type,
      amount,
      description: description.trim() || (type === 'income' ? t('tx.income') : t('tx.expense')),
      paymentMethodId: type === 'expense' ? paymentMethodId : undefined,
      categoryId,
      sourceSavingsEnvelopeId:
        type === 'expense' && envelope?.type === 'gasto' && useSavingsEnvelope && sourceSavingsEnvelopeId
          ? sourceSavingsEnvelopeId
          : undefined,
      frequency,
      dayOfMonth,
      month: frequency === 'annual' ? month : undefined,
      dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? occurrenceDate.getDay() : undefined,
      anchorDate: frequency === 'biweekly' ? occurrenceDate.toISOString() : undefined,
      isActive: template?.isActive ?? true,
    };

    if (isEditing && template) {
      await updateRecurringTemplate(template.id, data);
    } else {
      await addRecurringTemplate(data);
    }
    hapticSave();
    navigation.goBack();
  };

  if (!envelope) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? t('recurring.edit') : t('recurring.new')}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('common.save')}>
          <Check color={colors.green} size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={1}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Dropdown
            label={t('recurring.envelope')}
            options={envelopeOptions}
            value={envelopeId}
            onSelect={setEnvelopeId}
            placeholder={envelopes.length === 0 ? t('recurring.createEnvelopeFirst') : t('recurring.selectEnvelope')}
          />

          {/* ── Expense / Income toggle ── */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
              onPress={() => setType('expense')}
            >
              <MinusCircle color={type === 'expense' ? colors.white : colors.secondaryText} size={18} />
              <Text style={[styles.typeText, type === 'expense' && { color: colors.white }]}>{t('tx.expense')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
              onPress={() => setType('income')}
            >
              <PlusCircle color={type === 'income' ? colors.white : colors.secondaryText} size={18} />
              <Text style={[styles.typeText, type === 'income' && { color: colors.white }]}>{t('tx.income')}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Formatted amount ── */}
          <CurrencyInput
            label={t('common.amount')}
            currency={envelope.currency}
            value={amountStr}
            onChangeText={setAmountStr}
            style={{
              fontSize: 30,
              color: colors.white,
            }}
          />

          {/* ── Frequency ── */}
          <Dropdown
            label={t('recurring.frequency')}
            options={frequencyOptions}
            value={frequency}
            onSelect={(value) => { setFrequency(value as RecurrenceFrequency); setDayError(''); }}
          />

          {/* ── Month (annual only) ── */}
          {frequency === 'annual' && (
            <Dropdown
              label={t('recurring.month')}
              options={monthOptions}
              value={String(month)}
              onSelect={(value) => setMonth(parseInt(value, 10))}
            />
          )}

          {/* ── Day of month (monthly & annual) ── */}
          {(frequency === 'monthly' || frequency === 'annual') && (
            <>
              <Text style={styles.fieldLabel}>{t('recurring.dayOfMonth')}</Text>
              <TouchableOpacity style={styles.dayField} onPress={() => setShowDaySheet(true)} activeOpacity={0.8}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dayFieldText, !selectedDay && { color: colors.secondaryText }]}>
                    {selectedDay ? t('cadence.monthly', { day: selectedDay }) : t('recurring.selectDay')}
                  </Text>
                  {nextCharge ? (
                    <Text style={styles.dayFieldHint}>
                      {t('recurring.nextCharge', { date: nextCharge.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })}
                    </Text>
                  ) : null}
                </View>
                <ChevronDown color={colors.secondaryText} size={18} />
              </TouchableOpacity>
              <DayGridSheet
                visible={showDaySheet}
                title={t('recurring.dayOfMonth')}
                hint={t('recurring.dayTailHint')}
                value={selectedDay}
                onSelect={day => { setDayOfMonthStr(String(day)); setDayError(''); }}
                onClose={() => setShowDaySheet(false)}
              />
              {dayError ? <Text style={styles.errorText}>{dayError}</Text> : null}
            </>
          )}

          {/* ── First occurrence date (weekly & biweekly — derives day of week automatically) ── */}
          {(frequency === 'weekly' || frequency === 'biweekly') && (
            <>
              <Text style={styles.label}>{t('recurring.firstOccurrence')}</Text>
              <View style={{ marginBottom: SPACING.lg }}>
                <DateField value={occurrenceDate} onChange={setOccurrenceDate} showWeekday />
              </View>
            </>
          )}

          {/* ── Description ── */}
          <Text style={styles.label}>{t('common.description')}</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder={type === 'expense' ? t('recurring.descriptionPlaceholderExpense') : t('recurring.descriptionPlaceholderIncome')}
            placeholderTextColor={colors.secondaryText}
          />

          {/* ── Income category (income only) ── */}
          {type === 'income' && (
            <Dropdown
              label={t('common.category')}
              options={incomeCatOptions}
              value={categoryId}
              onSelect={setCategoryId}
              placeholder={incomeCategories.length === 0 ? t('tx.addIncomeCategoriesHint') : t('tx.selectCategory')}
            />
          )}

          {/* ── Category & Payment method (expense only) ── */}
          {type === 'expense' && (
            <>
              <Dropdown
                label={t('common.category')}
                options={catOptions}
                value={categoryId}
                onSelect={setCategoryId}
                placeholder={categories.length === 0 ? t('tx.addCategoriesHint') : t('tx.selectCategory')}
              />
              <Dropdown
                label={t('common.paymentMethod')}
                options={pmOptions}
                value={paymentMethodId}
                onSelect={setPaymentMethodId}
                placeholder={paymentMethods.length === 0 ? t('tx.addMethodsHint') : t('tx.selectMethod')}
              />
              {/* Explicit 'gasto' check — the funding-from-savings toggle is not offered for 'deuda' envelopes either. */}
              {envelope.type === 'gasto' && (
                <>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => setUseSavingsEnvelope(prev => !prev)}
                      activeOpacity={0.8}
                    >
                      {useSavingsEnvelope && <Check color={colors.green} size={16} />}
                    </TouchableOpacity>
                    <Text style={styles.toggleLabel}>{t('tx.fromSavings')}</Text>
                  </View>
                  {useSavingsEnvelope && (
                    <Dropdown
                      label={t('tx.savingsEnvelope')}
                      options={savingsOptions}
                      value={sourceSavingsEnvelopeId}
                      onSelect={setSourceSavingsEnvelopeId}
                      placeholder={savingsEnvelopes.length === 0 ? t('tx.createSavingsFirst') : t('tx.selectSavings')}
                    />
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
