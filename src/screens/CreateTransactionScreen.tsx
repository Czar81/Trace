import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Check, PlusCircle, MinusCircle } from 'lucide-react-native';
import { CurrencyInput } from '../components/CurrencyInput';
import { Dropdown } from '../components/Dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTransaction'>;

export const CreateTransactionScreen = ({ route, navigation }: Props) => {
  const { envelopeId, transaction } = route.params;
  const { envelopes, addTransaction, updateTransaction, paymentMethods, categories, getEnvelopeBalance, formatAmount } = useAppData();

  const envelope = envelopes.find(e => e.id === envelopeId);
  const isEditing = !!transaction;

  const [type, setType] = useState<'expense' | 'income'>(
    transaction?.type === 'income' ? 'income' : 'expense'
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
  const [date, setDate] = useState(transaction ? new Date(transaction.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    const amount = parseFloat(amountStr);
    if (!amountStr || isNaN(amount) || amount <= 0) return;

    const data = {
      envelopeId,
      type,
      amount,
      description: description.trim() || (type === 'income' ? 'Ingreso' : 'Gasto'),
      paymentMethodId: type === 'expense' ? paymentMethodId : undefined,
      categoryId: type === 'expense' ? categoryId : undefined,
      sourceSavingsEnvelopeId:
        type === 'expense' && envelope?.type === 'gasto' && useSavingsEnvelope && sourceSavingsEnvelopeId
          ? sourceSavingsEnvelopeId
          : undefined,
      date: date.toISOString(),
    };

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
  const savingsEnvelopes = envelopes.filter(e => e.type === 'ahorro');
  const savingsOptions = savingsEnvelopes.map(e => ({ label: e.name, value: e.id }));

  useEffect(() => {
    if (type !== 'expense' || envelope.type !== 'gasto') {
      setUseSavingsEnvelope(false);
      return;
    }

    if (useSavingsEnvelope && !sourceSavingsEnvelopeId && savingsEnvelopes.length > 0) {
      setSourceSavingsEnvelopeId(savingsEnvelopes[0].id);
    }
  }, [type, envelope.type, useSavingsEnvelope, sourceSavingsEnvelopeId, savingsEnvelopes]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Transacción' : 'Nueva Transacción'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
          <Check color={COLORS.green} size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={1}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.envelopeContext}>
          Sobre: {envelope.name} · {envelope.currency}
        </Text>

        {/* ── Expense / Income toggle ── */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
            onPress={() => setType('expense')}
          >
            <MinusCircle color={type === 'expense' ? COLORS.white : COLORS.secondaryText} size={18} />
            <Text style={[styles.typeText, type === 'expense' && { color: COLORS.white }]}>Gasto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
            onPress={() => setType('income')}
          >
            <PlusCircle color={type === 'income' ? COLORS.white : COLORS.secondaryText} size={18} />
            <Text style={[styles.typeText, type === 'income' && { color: COLORS.white }]}>Ingreso</Text>
          </TouchableOpacity>
        </View>

        {/* ── Formatted amount ── */}
        <CurrencyInput
          label="Monto"
          currency={envelope.currency}
          value={amountStr}
          onChangeText={setAmountStr}
          autoFocus={!isEditing}
          style={{
            fontSize: 30,
            color: COLORS.white,
          }}
        />

        {/* ── Date Picker ── */}
        <Text style={styles.label}>Fecha</Text>
        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
          <Calendar color={COLORS.secondaryText} size={20} />
          <Text style={styles.dateText}>{date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}


        {/* ── Description ── */}
        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder={type === 'expense' ? 'Ej: Supermercado, Almuerzo...' : 'Ej: Salario, Transferencia...'}
          placeholderTextColor={COLORS.secondaryText}
        />

        {/* ── Category & Payment method (expense only) ── */}
        {type === 'expense' && (
          <>
            <Dropdown
              label="Categoría"
              options={catOptions}
              value={categoryId}
              onSelect={setCategoryId}
              placeholder={categories.length === 0 ? 'Agrega categorías en Configuración' : 'Seleccionar categoría'}
            />
            <Dropdown
              label="Método de pago"
              options={pmOptions}
              value={paymentMethodId}
              onSelect={setPaymentMethodId}
              placeholder={paymentMethods.length === 0 ? 'Agrega métodos en Configuración' : 'Seleccionar método'}
            />
            {envelope.type === 'gasto' && (
              <>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Este gasto sale de un sobre de ahorro</Text>
                  <Switch
                    value={useSavingsEnvelope}
                    onValueChange={setUseSavingsEnvelope}
                    trackColor={{ false: COLORS.cardBg, true: COLORS.green }}
                    thumbColor={COLORS.white}
                  />
                </View>
                {useSavingsEnvelope && (
                  <>
                    <Dropdown
                      label="Sobre de ahorro"
                      options={savingsOptions}
                      value={sourceSavingsEnvelopeId}
                      onSelect={setSourceSavingsEnvelopeId}
                      placeholder={savingsEnvelopes.length === 0 ? 'Crea un sobre de ahorro primero' : 'Seleccionar sobre de ahorro'}
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
                            ? `Saldo del sobre de ahorro después de este gasto: ${formatAmount(projectedBalance, sourceEnvelope.currency)}`
                            : `Saldo actual del sobre de ahorro: ${formatAmount(currentBalance, sourceEnvelope.currency)}`}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  keyboardAvoiding: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  headerBtn: { padding: 4 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  form: { paddingHorizontal: 20, paddingBottom: 60 },
  envelopeContext: { color: COLORS.secondaryText, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  typeSelector: {
    flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: 14,
    padding: 4, marginBottom: 24, gap: 4,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 10, gap: 8,
  },
  typeBtnExpense: { backgroundColor: COLORS.red },
  typeBtnIncome: { backgroundColor: COLORS.blue },
  typeText: { color: COLORS.secondaryText, fontSize: 15, fontWeight: '700' },
  label: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 16 },
  toggleLabel: { color: COLORS.white, fontSize: 15, flex: 1, paddingRight: 12 },
  savingsPreview: { color: COLORS.secondaryText, fontSize: 13, marginTop: -8, marginBottom: 16 },
  datePickerBtn: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  dateText: { color: COLORS.white, fontSize: 16 },
  input: {
    backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 16,
    color: COLORS.white, fontSize: 16, marginBottom: 24,
  },
});
