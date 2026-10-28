import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Check } from 'lucide-react-native';
import { EnvelopeType, Currency, DebtInterestFrequency } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { EnvelopeIcon, IconName } from '../../components/envelope/EnvelopeIcon';
import { IconPicker } from '../../components/forms/IconPicker';
import { EnvelopeAvatar } from '../../components/envelope/EnvelopeAvatar';
import { CurrencySelector } from '../../components/forms/CurrencySelector';
import { Dropdown } from '../../components/forms/Dropdown';
import { DateField } from '../../components/forms/DateField';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { TranslationKey } from '../../i18n';
import { hapticSave } from '../../services/device/haptics';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

const INTEREST_FREQUENCY_OPTIONS: { labelKey: TranslationKey; value: string }[] = [
  { labelKey: 'envelope.freqMonthly', value: 'mensual' },
  { labelKey: 'envelope.freqBiweekly', value: 'quincenal' },
  { labelKey: 'envelope.freqAnnual', value: 'anual' },
];

const DUE_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) }));

type Props = NativeStackScreenProps<RootStackParamList, 'CreateEnvelope'>;

export const CreateEnvelopeScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { envelopeType, envelope } = route.params;
  const { addEnvelope, updateEnvelope, settings } = useAppData();

  const isEditing = !!envelope;
  const defaultColor =
    envelopeType === 'gasto' ? '#E55B5B' : envelopeType === 'deuda' ? '#F2A65A' : '#52A8D9';
  const defaultIcon: IconName = envelopeType === 'deuda' ? 'credit-card' : 'box';

  const [name, setName] = useState(envelope?.name ?? '');
  const [limitStr, setLimitStr] = useState(envelope?.limit ? String(envelope.limit) : '');
  const [isUnlimited, setIsUnlimited] = useState(envelope?.isUnlimited ?? false);
  const [icon, setIcon] = useState<IconName>((envelope?.icon as IconName) ?? defaultIcon);
  const [imageUri, setImageUri] = useState<string | undefined>(envelope?.imageUri);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [limitError, setLimitError] = useState('');
  const [currency, setCurrency] = useState<Currency>(envelope?.currency ?? settings.defaultCurrency);

  const [interestRateStr, setInterestRateStr] = useState(envelope?.interestRate ? String(envelope.interestRate) : '');
  const [interestFrequency, setInterestFrequency] = useState<DebtInterestFrequency>(envelope?.interestFrequency ?? 'mensual');
  const [minimumPaymentStr, setMinimumPaymentStr] = useState(envelope?.minimumPayment ? String(envelope.minimumPayment) : '');
  const [goalDeadline, setGoalDeadline] = useState<Date | undefined>(envelope?.goalDeadline ? new Date(envelope.goalDeadline) : undefined);
  const [dueDay, setDueDay] = useState<string>(envelope?.dueDay ? String(envelope.dueDay) : '');

  const color = envelope?.color ?? defaultColor;
  const isDeadlineVisible = envelopeType === 'ahorro' && !isUnlimited;
  const isDebtDetailsVisible = envelopeType === 'deuda' && !isUnlimited;

  const handleSave = async () => {
    if (!name.trim()) return;
    const limit = isUnlimited ? 0 : parseFloat(limitStr || '0');

    if (!isUnlimited && (isNaN(limit) || limit < 0)) {
      setLimitError(t('envelope.invalidLimit'));
      return;
    }
    setLimitError('');

    const parsedInterestRate = parseFloat(interestRateStr);
    const parsedMinimumPayment = parseFloat(minimumPaymentStr);
    const parsedDueDay = parseInt(dueDay, 10);

    const debtFields = isDebtDetailsVisible
      ? {
          interestRate: !isNaN(parsedInterestRate) && parsedInterestRate > 0 ? parsedInterestRate : undefined,
          interestFrequency,
          minimumPayment: !isNaN(parsedMinimumPayment) && parsedMinimumPayment > 0 ? parsedMinimumPayment : undefined,
          dueDay: !isNaN(parsedDueDay) ? parsedDueDay : undefined,
          dueAnchorMonth: interestFrequency === 'anual'
            ? (envelope?.dueAnchorMonth ?? new Date().getMonth() + 1)
            : undefined,
        }
      : {
          interestRate: undefined,
          interestFrequency: undefined,
          minimumPayment: undefined,
          dueDay: undefined,
          dueAnchorMonth: undefined,
        };

    const goalDeadlineIso = isDeadlineVisible && goalDeadline ? goalDeadline.toISOString() : undefined;

    if (isEditing && envelope) {
      await updateEnvelope(envelope.id, { name: name.trim(), currency, limit, isUnlimited, icon, imageUri, goalDeadline: goalDeadlineIso, ...debtFields });
    } else {
      await addEnvelope({
        name: name.trim(),
        type: envelopeType,
        currency,
        limit,
        isUnlimited,
        color,
        icon,
        imageUri,
        goalDeadline: goalDeadlineIso,
        ...debtFields,
      });
    }
    hapticSave();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <IconPicker
        visible={showIconPicker}
        selectedIcon={icon}
        selectedImageUri={imageUri}
        color={color}
        onSelectIcon={(i) => { setIcon(i); setImageUri(undefined); }}
        onSelectImage={(uri) => setImageUri(uri)}
        onClose={() => setShowIconPicker(false)}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing
            ? t('envelope.edit')
            : t(envelopeType === 'gasto' ? 'envelope.newExpense' : envelopeType === 'deuda' ? 'envelope.newDebt' : 'envelope.newSaving')}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.save')}>
          <Check color={colors.green} size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={1}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

        {/* ── Icon preview + picker trigger ── */}
        <View style={styles.iconSection}>
          <TouchableOpacity
            style={styles.iconPreviewWrap}
            onPress={() => setShowIconPicker(true)}
          >
            <EnvelopeAvatar icon={icon} imageUri={imageUri} color={color} size={80} borderRadius={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowIconPicker(true)}>
            <Text style={styles.changeIconText}>{t('envelope.changeIcon')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('envelope.name')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('envelope.namePlaceholder')}
          placeholderTextColor={colors.secondaryText}
          autoFocus={!isEditing}
        />

        <CurrencySelector label={t('envelope.currency')} value={currency} onSelect={setCurrency} />

        {!isUnlimited && (
          <>
            <CurrencyInput
              label={
                envelopeType === 'gasto'
                  ? t('envelope.budget')
                  : envelopeType === 'deuda'
                  ? t('envelope.debtTotal')
                  : t('envelope.savingsGoal')
              }
              currency={currency}
              value={limitStr}
              onChangeText={(text) => { setLimitStr(text); setLimitError(''); }}
            />
            {limitError ? <Text style={styles.errorText}>{limitError}</Text> : null}
          </>
        )}

        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: SPACING.xl }}>
            <Text style={styles.label}>
              {envelopeType === 'gasto'
                ? t('envelope.unlimitedExpense')
                : envelopeType === 'deuda'
                ? t('envelope.unlimitedDebt')
                : t('envelope.unlimitedSavings')}
            </Text>
            <Text style={styles.hint}>
              {envelopeType === 'gasto'
                ? t('envelope.unlimitedExpenseHint')
                : envelopeType === 'deuda'
                ? t('envelope.unlimitedDebtHint')
                : t('envelope.unlimitedSavingsHint')}
            </Text>
          </View>
          <Switch
            value={isUnlimited}
            onValueChange={(value) => { setIsUnlimited(value); if (value) setLimitError(''); }}
            trackColor={{ false: colors.cardBg, true: colors.green }}
            thumbColor={colors.white}
          />
        </View>

        {isDeadlineVisible && (
          <View style={styles.deadlineSection}>
            <Text style={styles.label}>{t('envelope.goalDeadline')}</Text>
            <DateField
              value={goalDeadline}
              placeholder={t('envelope.goalDeadlinePlaceholder')}
              onChange={setGoalDeadline}
            />
            {goalDeadline ? (
              <TouchableOpacity onPress={() => setGoalDeadline(undefined)}>
                <Text style={styles.clearDeadline}>{t('envelope.goalDeadlineClear')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {isDebtDetailsVisible && (
          <>
            <Text style={styles.sectionLabel}>{t('envelope.debtDetails')}</Text>

            <Text style={styles.label}>{t('envelope.interestRate')}</Text>
            <View style={styles.percentRow}>
              <TextInput
                style={[styles.input, styles.percentInput]}
                value={interestRateStr}
                onChangeText={setInterestRateStr}
                placeholder="0"
                placeholderTextColor={colors.secondaryText}
                keyboardType="numeric"
              />
              <Text style={styles.percentSign}>%</Text>
            </View>

            <Dropdown
              label={t('envelope.interestFrequency')}
              options={INTEREST_FREQUENCY_OPTIONS.map(o => ({ label: t(o.labelKey), value: o.value }))}
              value={interestFrequency}
              onSelect={(value) => setInterestFrequency(value as DebtInterestFrequency)}
            />

            <CurrencyInput
              label={t('envelope.minimumPayment')}
              currency={currency}
              value={minimumPaymentStr}
              onChangeText={setMinimumPaymentStr}
            />

            <Dropdown
              label={t('envelope.dueDay')}
              options={DUE_DAY_OPTIONS}
              value={dueDay}
              onSelect={setDueDay}
              placeholder={t('envelope.selectDay')}
            />
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  keyboardAvoiding: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.xl },
  headerBtn: { padding: SPACING.xs },
  headerTitle: { color: colors.white, fontSize: 17, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  form: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  iconSection: { alignItems: 'center', marginBottom: 28, marginTop: SPACING.sm },
  iconPreviewWrap: { marginBottom: 10 },
  changeIconText: { color: colors.secondaryText, fontSize: FONT_SIZE.md, fontWeight: '600' },
  label: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '600', marginBottom: SPACING.sm },
  hint: { color: colors.secondaryText, fontSize: FONT_SIZE.sm, marginBottom: SPACING.lg },
  input: { backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: SPACING.lg, color: colors.white, fontSize: FONT_SIZE.lg, marginBottom: SPACING.xxl },
  errorText: { color: colors.red, fontSize: FONT_SIZE.sm, marginTop: -20, marginBottom: SPACING.xl },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm },
  sectionLabel: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '700', marginTop: 28, marginBottom: SPACING.md },
  deadlineSection: { marginTop: SPACING.xxl },
  clearDeadline: { color: colors.secondaryText, fontSize: FONT_SIZE.md, fontWeight: '600', marginTop: SPACING.md },
  percentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.xxl },
  percentInput: { flex: 1, marginBottom: 0 },
  percentSign: { color: colors.secondaryText, fontSize: FONT_SIZE.xl, fontWeight: '700' },
});
