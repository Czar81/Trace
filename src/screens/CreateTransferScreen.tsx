import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Check } from 'lucide-react-native';
import { CurrencyInput } from '../components/CurrencyInput';
import { Dropdown } from '../components/Dropdown';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { TranslationKey } from '../i18n';
import { EnvelopeType } from '../types';
import { sortEnvelopesByTypeAndName } from '../utils/envelopeSorting';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTransfer'>;

const TYPE_GROUP_LABELS: Record<EnvelopeType, TranslationKey> = { gasto: 'main.tabExpenses', ahorro: 'main.tabSavings', deuda: 'main.tabDebts' };

export const CreateTransferScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { envelopeId, transaction } = route.params ?? {};
  const { envelopes, addTransfer, updateTransfer, getEnvelopeBalance, formatAmount } = useAppData();
  const isEditing = !!transaction;

  const [sourceId, setSourceId] = useState(transaction?.envelopeId ?? envelopeId ?? '');
  const [destinationId, setDestinationId] = useState(transaction?.toEnvelopeId ?? '');
  const [amountStr, setAmountStr] = useState(transaction ? String(transaction.amount) : '');
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [notes, setNotes] = useState(transaction?.notes ?? '');
  const [error, setError] = useState('');

  const source = envelopes.find(e => e.id === sourceId);
  const destination = envelopes.find(e => e.id === destinationId);

  const toGroupedOptions = (list: typeof envelopes) =>
    sortEnvelopesByTypeAndName(list).map(e => ({
      label: `${e.name} (${e.currency})`,
      value: e.id,
      group: t(TYPE_GROUP_LABELS[e.type]),
    }));

  const sourceOptions = toGroupedOptions(envelopes);
  const destinationOptions = toGroupedOptions(envelopes.filter(e => e.id !== sourceId));

  const parsedAmount = parseFloat(amountStr);
  const hasValidAmount = amountStr !== '' && !isNaN(parsedAmount) && parsedAmount > 0;

  const handleSave = async () => {
    setError('');
    if (!hasValidAmount) {
      setError(t('transfer.invalidAmount'));
      return;
    }
    if (!sourceId || !destinationId) {
      setError(t('transfer.selectBoth'));
      return;
    }
    if (sourceId === destinationId) {
      setError(t('transfer.mustDiffer'));
      return;
    }
    if (source && destination && source.currency !== destination.currency) {
      setError(t('transfer.sameCurrency'));
      return;
    }

    const result = isEditing
      ? await updateTransfer(transaction!.id, {
          envelopeId: sourceId,
          toEnvelopeId: destinationId,
          amount: parsedAmount,
          description: description.trim() || t('transfer.defaultDescription'),
          notes: notes.trim() || undefined,
        })
      : await addTransfer({
          envelopeId: sourceId,
          toEnvelopeId: destinationId,
          amount: parsedAmount,
          description: description.trim() || t('transfer.defaultDescription'),
          notes: notes.trim() || undefined,
        });

    if (!result.success) {
      setError(result.error ?? (isEditing ? t('transfer.updateFailed') : t('transfer.createFailed')));
      return;
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? t('transfer.edit') : t('transfer.new')}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
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
            label={t('transfer.from')}
            options={sourceOptions}
            value={sourceId}
            onSelect={(val) => {
              setSourceId(val);
              if (val === destinationId) setDestinationId('');
            }}
            placeholder={t('transfer.sourcePlaceholder')}
          />

          <Dropdown
            label={t('transfer.to')}
            options={destinationOptions}
            value={destinationId}
            onSelect={setDestinationId}
            placeholder={sourceId ? t('transfer.destinationPlaceholder') : t('transfer.selectSourceFirst')}
          />

          <CurrencyInput
            label={t('common.amount')}
            currency={source?.currency ?? 'CRC'}
            value={amountStr}
            onChangeText={setAmountStr}
            style={{ fontSize: 30, color: colors.white }}
          />

          <Text style={styles.label}>{t('transfer.note')}</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder={t('transfer.notePlaceholder')}
            placeholderTextColor={colors.secondaryText}
          />

          <Text style={styles.label}>{t('common.notes')}</Text>
          <TextInput
            style={[styles.input, { minHeight: 96 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('common.notesPlaceholder')}
            placeholderTextColor={colors.secondaryText}
            multiline
            textAlignVertical="top"
          />

          {source && destination && source.currency === destination.currency && (
            <View style={styles.preview}>
              <Text style={styles.previewText}>
                {source.name}:{' '}
                {formatAmount(
                  getEnvelopeBalance(source.id) - (hasValidAmount ? parsedAmount : 0),
                  source.currency
                )}
              </Text>
              <Text style={styles.previewText}>
                {destination.name}:{' '}
                {formatAmount(
                  getEnvelopeBalance(destination.id) + (hasValidAmount ? parsedAmount : 0),
                  destination.currency
                )}
              </Text>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  keyboardAvoiding: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  headerBtn: { padding: 4 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  form: { paddingHorizontal: 20, paddingBottom: 60 },
  label: { color: colors.white, fontSize: 16, fontWeight: '600', marginTop: 0, marginBottom: 8 },
  input: {
    backgroundColor: colors.cardBg, borderRadius: 12, padding: 16,
    color: colors.white, fontSize: 16, marginBottom: 24,
  },
  preview: {
    backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, marginBottom: 24, gap: 6,
  },
  previewText: { color: colors.secondaryText, fontSize: 14 },
  errorText: { color: colors.red, fontSize: 14, marginBottom: 16 },
});
