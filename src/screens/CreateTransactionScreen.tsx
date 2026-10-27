import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Check, PlusCircle, MinusCircle } from 'lucide-react-native';
import { CurrencyInput } from '../components/CurrencyInput';
import { Dropdown } from '../components/Dropdown';
import { DateField } from '../components/DateField';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { sortEnvelopesByTypeAndName } from '../utils/envelopeSorting';
import { SplitEditor, SplitPart, newSplitPart } from '../components/SplitEditor';
import { getUnallocated, parseAmount } from '../utils/allocation';
import { ReceiptField } from '../components/ReceiptField';
import { deleteReceiptImage } from '../utils/receipts';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTransaction'>;

export const CreateTransactionScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { envelopeId, transaction } = route.params;
  const { envelopes, addTransaction, addTransactions, updateTransaction, paymentMethods, categories, incomeCategories, getEnvelopeBalance, formatAmount } = useAppData();

  const envelope = envelopes.find(e => e.id === envelopeId);
  const isDebtEnvelope = envelope?.type === 'deuda';
  const isEditing = !!transaction;

  const [type, setType] = useState<'expense' | 'income'>(
    transaction
      ? transaction.type === 'income' ? 'income' : 'expense'
      : isDebtEnvelope ? 'income' : 'expense'
  );
  const [amountStr, setAmountStr] = useState(transaction ? String(transaction.amount) : '');
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState(
    transaction?.paymentMethodId ?? (paymentMethods[0]?.id ?? '')
  );
  const [categoryId, setCategoryId] = useState(
    transaction?.categoryId ?? (categories[0]?.id ?? '')
  );
  const [useSavingsEnvelope, setUseSavingsEnvelope] = useState(!!transaction?.sourceSavingsEnvelopeId);
  const [sourceSavingsEnvelopeId, setSourceSavingsEnvelopeId] = useState(transaction?.sourceSavingsEnvelopeId ?? '');
  const [notes, setNotes] = useState(transaction?.notes ?? '');
  const [receiptUris, setReceiptUris] = useState<string[]>(transaction?.receiptUris ?? []);
  // Receipts copied during this session but not saved yet; removed again if the user backs out.
  const unsavedReceipts = useRef<Set<string>>(new Set());
  const saved = useRef(false);
  useEffect(() => () => {
    if (!saved.current) unsavedReceipts.current.forEach(uri => { void deleteReceiptImage(uri); });
  }, []);
  const handleReceiptsChange = (uris: string[]) => {
    // Photos added in this session and dropped again can be deleted right away; saved ones are cleaned up by the context.
    receiptUris.filter(uri => !uris.includes(uri) && unsavedReceipts.current.has(uri)).forEach(uri => {
      unsavedReceipts.current.delete(uri);
      void deleteReceiptImage(uri);
    });
    uris.filter(uri => !receiptUris.includes(uri)).forEach(uri => unsavedReceipts.current.add(uri));
    setReceiptUris(uris);
  };
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitParts, setSplitParts] = useState<SplitPart[]>([]);
  const [splitError, setSplitError] = useState('');
  const [date, setDate] = useState(transaction ? new Date(transaction.date) : new Date());

  const handleSave = async () => {
    const amount = parseFloat(amountStr);
    if (!amountStr || isNaN(amount) || amount <= 0) return;

    if (splitEnabled && !isEditing && type === 'expense' && !isDebtEnvelope) {
      const partAmounts = splitParts.map(p => parseAmount(p.amountStr));
      if (partAmounts.some(a => a <= 0)) { setSplitError(t('split.errorAmounts')); return; }
      if (getUnallocated(amount, partAmounts) !== 0) { setSplitError(t('split.errorTotal')); return; }
      await addTransactions(splitParts.map((p, i) => ({
        envelopeId: p.envelopeId,
        type: 'expense' as const,
        amount: partAmounts[i],
        description: description.trim() || t('tx.expense'),
        notes: notes.trim() || undefined,
        paymentMethodId,
        categoryId: p.categoryId || undefined,
        date: date.toISOString(),
        receiptUris: receiptUris.length > 0 ? receiptUris : undefined,
      })));
      saved.current = true;
      navigation.goBack();
      return;
    }

    const savedType = isDebtEnvelope && !isEditing ? 'income' : type;
    const data = {
      envelopeId,
      type: savedType,
      amount,
      description: description.trim() || (
        isDebtEnvelope && savedType === 'income'
          ? t('tx.defaultDebtPayment')
          : savedType === 'income' ? t('tx.income') : t('tx.expense')
      ),
      paymentMethodId: savedType === 'expense' ? paymentMethodId : undefined,
      categoryId: isDebtPayment ? undefined : categoryId,
      sourceSavingsEnvelopeId:
        savedType === 'expense' && envelope?.type === 'gasto' && useSavingsEnvelope && sourceSavingsEnvelopeId
          ? sourceSavingsEnvelopeId
          : undefined,
      date: date.toISOString(),
      receiptUris: receiptUris.length > 0 ? receiptUris : [],
      notes: notes.trim() || undefined,
    };

    saved.current = true;
    if (isEditing && transaction) {
      await updateTransaction(transaction.id, data);
    } else {
      await addTransaction(data);
    }
    navigation.goBack();
  };

  if (!envelope) return null;

  const pmOptions = paymentMethods.map(pm => ({ label: pm.name, value: pm.id }));
  const catOptions = categories.map(c => ({ label: c.name, value: c.id }));
  const incomeCatOptions = incomeCategories.map(c => ({ label: c.name, value: c.id }));
  // Explicit 'ahorro' check — already excludes 'deuda' envelopes as a funding source.
  const savingsEnvelopes = sortEnvelopesByTypeAndName(envelopes.filter(e => e.type === 'ahorro'));
  const savingsOptions = savingsEnvelopes.map(e => ({ label: e.name, value: e.id }));
  const splitTargets = sortEnvelopesByTypeAndName(envelopes.filter(e => e.currency === envelope.currency && e.type !== 'deuda'));
  const canSplit = !isEditing && type === 'expense' && !isDebtEnvelope;
  const toggleSplit = (on: boolean) => {
    setSplitEnabled(on);
    setSplitError('');
    if (on) setSplitParts([newSplitPart(envelopeId, categoryId, amountStr), newSplitPart(envelopeId, '')]);
  };
  const isDebtPayment = isDebtEnvelope && (!transaction || transaction.type === 'income');
  const parsedAmount = parseFloat(amountStr);
  const hasValidAmount = amountStr !== '' && !isNaN(parsedAmount) && parsedAmount > 0;
  const transactionBalanceImpact = transaction?.envelopeId === envelopeId
    ? transaction.type === 'income' ? transaction.amount : transaction.type === 'expense' ? -transaction.amount : 0
    : 0;
  const balanceBeforeCurrentTransaction = getEnvelopeBalance(envelopeId) - transactionBalanceImpact;
  const debtOutstanding = envelope.limit - balanceBeforeCurrentTransaction;
  const projectedDebtOutstanding = debtOutstanding - (hasValidAmount ? parsedAmount : 0);
  const debtPreviewLabel = hasValidAmount
    ? projectedDebtOutstanding < 0 ? t('tx.balanceInFavorAfter') : t('tx.balancePendingAfter')
    : debtOutstanding < 0 ? t('tx.balanceInFavor') : t('tx.balancePending');

  useEffect(() => {
    if (type !== 'expense' || envelope.type !== 'gasto') {
      setUseSavingsEnvelope(false);
      return;
    }

    if (useSavingsEnvelope && !sourceSavingsEnvelopeId && savingsEnvelopes.length > 0) {
      setSourceSavingsEnvelopeId(savingsEnvelopes[0].id);
    }
  }, [type, envelope.type, useSavingsEnvelope, sourceSavingsEnvelopeId, savingsEnvelopes]);

  // Category options come from the catalog matching the active type: income
  // categories for income, expense categories for expense. Their ids never
  // overlap, so a selection made for one type is re-seeded when the type flips.
  const activeCategories = type === 'income' ? incomeCategories : categories;
  useEffect(() => {
    if (isDebtEnvelope) return;
    if (categoryId && activeCategories.some(c => c.id === categoryId)) return;
    setCategoryId(activeCategories[0]?.id ?? '');
  }, [isDebtEnvelope, activeCategories, categoryId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? t('tx.edit') : t('tx.new')}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Check color={colors.green} size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={1}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.envelopeContext}>
          {t('tx.envelopeContext', { name: envelope.name, currency: envelope.currency })}
        </Text>

        {/* ── Expense / Income toggle ── */}
        <View style={styles.typeSelector}>
          {isDebtEnvelope ? (
            <View style={[styles.typeBtn, styles.typeBtnIncome]}>
              <PlusCircle color={colors.white} size={18} />
              <Text style={[styles.typeText, { color: colors.white }]}>{t('tx.payDebt')}</Text>
            </View>
          ) : (
            <>
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
            </>
          )}
        </View>

        {/* ── Formatted amount ── */}
        <CurrencyInput
          label={t('common.amount')}
          currency={envelope.currency}
          value={amountStr}
          onChangeText={setAmountStr}
          autoFocus={!isEditing}
          style={{
            fontSize: 30,
            color: colors.white,
          }}
        />
        {isDebtPayment && !envelope.isUnlimited && (
          <View style={styles.debtPreview}>
            <Text style={styles.debtPreviewText}>
              {debtPreviewLabel}: {formatAmount(
                Math.abs(hasValidAmount ? projectedDebtOutstanding : debtOutstanding),
                envelope.currency
              )}
            </Text>
            {hasValidAmount && projectedDebtOutstanding < 0 && (
              <Text style={styles.debtWarning}>
                {t('tx.overpayWarning')}
              </Text>
            )}
          </View>
        )}

        {/* ── Date Picker ── */}
        <Text style={styles.label}>{t('common.date')}</Text>
        <DateField
          value={date}
          onChange={setDate}
        />

        {/* ── Description ── */}
        <Text style={styles.label}>{t('common.description')}</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder={isDebtEnvelope ? t('tx.descriptionPlaceholderDebt') : type === 'expense' ? t('tx.descriptionPlaceholderExpense') : t('tx.descriptionPlaceholderIncome')}
          placeholderTextColor={colors.secondaryText}
        />

        <Text style={styles.label}>{t('common.notes')}</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('common.notesPlaceholder')}
          placeholderTextColor={colors.secondaryText}
          multiline
          textAlignVertical="top"
        />

        <ReceiptField value={receiptUris} onChange={handleReceiptsChange} />

        {/* ── Income category (income only, non-debt) ── */}
        {type === 'income' && !isDebtPayment && (
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
            {canSplit && (
              <>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{t('split.toggle')}</Text>
                  <Switch
                    value={splitEnabled}
                    onValueChange={toggleSplit}
                    trackColor={{ false: colors.cardBg, true: colors.green }}
                    thumbColor={colors.white}
                  />
                </View>
                {splitEnabled && (
                  <>
                    <SplitEditor
                      parts={splitParts}
                      onChange={(p) => { setSplitParts(p); setSplitError(''); }}
                      total={parseAmount(amountStr)}
                      currency={envelope.currency}
                      envelopes={splitTargets}
                      categories={categories}
                    />
                    {splitError ? <Text style={styles.splitError}>{splitError}</Text> : null}
                  </>
                )}
              </>
            )}
            {/* Explicit 'gasto' check — the funding-from-savings toggle is not offered for 'deuda' envelopes either. */}
            {envelope.type === 'gasto' && !splitEnabled && (
              <>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{t('tx.fromSavings')}</Text>
                  <Switch
                    value={useSavingsEnvelope}
                    onValueChange={setUseSavingsEnvelope}
                    trackColor={{ false: colors.cardBg, true: colors.green }}
                    thumbColor={colors.white}
                  />
                </View>
                {useSavingsEnvelope && (
                  <>
                    <Dropdown
                      label={t('tx.savingsEnvelope')}
                      options={savingsOptions}
                      value={sourceSavingsEnvelopeId}
                      onSelect={setSourceSavingsEnvelopeId}
                      placeholder={savingsEnvelopes.length === 0 ? t('tx.createSavingsFirst') : t('tx.selectSavings')}
                    />
                    {sourceSavingsEnvelopeId && (() => {
                      const sourceEnvelope = savingsEnvelopes.find(e => e.id === sourceSavingsEnvelopeId);
                      if (!sourceEnvelope) return null;
                      const parsedAmount = parseFloat(amountStr);
                      const hasValidAmount = amountStr !== '' && !isNaN(parsedAmount) && parsedAmount > 0;
                      const currentBalance = getEnvelopeBalance(sourceEnvelope.id);
                      const projectedBalance = hasValidAmount ? currentBalance - parsedAmount : currentBalance;
                      return (
                        <Text style={styles.savingsPreview}>
                          {hasValidAmount
                            ? t('tx.savingsBalanceAfter', { amount: formatAmount(projectedBalance, sourceEnvelope.currency) })
                            : t('tx.savingsBalanceCurrent', { amount: formatAmount(currentBalance, sourceEnvelope.currency) })}
                        </Text>
                      );
                    })()}
                  </>
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
  envelopeContext: { color: colors.secondaryText, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  typeSelector: {
    flexDirection: 'row', backgroundColor: colors.cardBg, borderRadius: 14,
    padding: 4, marginBottom: 24, gap: 4,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 10, gap: 8,
  },
  typeBtnExpense: { backgroundColor: colors.red },
  typeBtnIncome: { backgroundColor: colors.blue },
  typeText: { color: colors.secondaryText, fontSize: 15, fontWeight: '700' },
  debtPreview: { marginTop: -12, marginBottom: 16 },
  debtPreviewText: { color: colors.secondaryText, fontSize: 13 },
  debtWarning: { color: colors.red, fontSize: 13, marginTop: 4 },
  label: { color: colors.white, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 16 },
  toggleLabel: { color: colors.white, fontSize: 15, flex: 1, paddingRight: 12 },
  notesInput: { minHeight: 96 },
  splitError: { color: colors.red, fontSize: 14, marginBottom: 16 },
  savingsPreview: { color: colors.secondaryText, fontSize: 13, marginTop: -8, marginBottom: 16 },
  input: {
    backgroundColor: colors.cardBg, borderRadius: 12, padding: 16,
    color: colors.white, fontSize: 16, marginBottom: 24,
  },
});
