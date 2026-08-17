import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Check, PlusCircle, MinusCircle } from 'lucide-react-native';
import { CurrencyInput } from '../components/CurrencyInput';
import { Dropdown } from '../components/Dropdown';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRecurringTransaction'>;

export const CreateRecurringTransactionScreen = ({ route, navigation }: Props) => {
  const { template } = route.params;
  const { envelopes, paymentMethods, categories, addRecurringTemplate, updateRecurringTemplate } = useAppData();

  const isEditing = !!template;

  const [envelopeId, setEnvelopeId] = useState(template?.envelopeId ?? (envelopes[0]?.id ?? ''));
  const [type, setType] = useState<'expense' | 'income'>(template?.type ?? 'expense');
  const [amountStr, setAmountStr] = useState(template ? String(template.amount) : '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [dayOfMonthStr, setDayOfMonthStr] = useState(template ? String(template.dayOfMonth) : '');
  const [paymentMethodId, setPaymentMethodId] = useState(
    template?.paymentMethodId ?? (paymentMethods[0]?.id ?? '')
  );
  const [categoryId, setCategoryId] = useState(
    template?.categoryId ?? (categories[0]?.id ?? '')
  );
  const [useSavingsEnvelope, setUseSavingsEnvelope] = useState(!!template?.sourceSavingsEnvelopeId);
  const [sourceSavingsEnvelopeId, setSourceSavingsEnvelopeId] = useState(template?.sourceSavingsEnvelopeId ?? '');
  const [dayError, setDayError] = useState('');

  const envelope = envelopes.find(e => e.id === envelopeId);
  const envelopeOptions = envelopes.map(e => ({ label: `${e.name} (${e.currency})`, value: e.id }));
  const pmOptions = paymentMethods.map(pm => ({ label: pm.name, value: pm.id }));
  const catOptions = categories.map(c => ({ label: c.name, value: c.id }));
  // Explicit 'ahorro' check — already excludes 'deuda' envelopes as a funding source.
  const savingsEnvelopes = envelopes.filter(e => e.type === 'ahorro');
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

  const handleSave = async () => {
    const amount = parseFloat(amountStr);
    if (!amountStr || isNaN(amount) || amount <= 0) return;
    if (!envelopeId) return;

    const dayOfMonth = parseInt(dayOfMonthStr, 10);
    if (!dayOfMonthStr || isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      setDayError('Ingresa un día entre 1 y 31');
      return;
    }
    setDayError('');

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
      frequency: 'monthly' as const,
      dayOfMonth,
      isActive: template?.isActive ?? true,
    };

    if (isEditing && template) {
      await updateRecurringTemplate(template.id, data);
    } else {
      await addRecurringTemplate(data);
    }
    navigation.goBack();
  };

  if (!envelope) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Recurrente' : 'Nueva Recurrente'}
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
          <Dropdown
            label="Sobre"
            options={envelopeOptions}
            value={envelopeId}
            onSelect={setEnvelopeId}
            placeholder={envelopes.length === 0 ? 'Crea un sobre primero' : 'Seleccionar sobre'}
          />

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
            style={{
              fontSize: 30,
              color: COLORS.white,
            }}
          />

          {/* ── Day of month ── */}
          <Text style={styles.label}>Día del mes</Text>
          <TextInput
            style={styles.input}
            value={dayOfMonthStr}
            onChangeText={(text) => { setDayOfMonthStr(text.replace(/[^0-9]/g, '')); setDayError(''); }}
            placeholder="Ej: 15"
            placeholderTextColor={COLORS.secondaryText}
            keyboardType="numeric"
            maxLength={2}
          />
          {dayError ? <Text style={styles.errorText}>{dayError}</Text> : null}

          {/* ── Description ── */}
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder={type === 'expense' ? 'Ej: Netflix, Alquiler...' : 'Ej: Salario, Renta...'}
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
              {/* Explicit 'gasto' check — the funding-from-savings toggle is not offered for 'deuda' envelopes either. */}
              {envelope.type === 'gasto' && (
                <>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => setUseSavingsEnvelope(prev => !prev)}
                      activeOpacity={0.8}
                    >
                      {useSavingsEnvelope && <Check color={COLORS.green} size={16} />}
                    </TouchableOpacity>
                    <Text style={styles.toggleLabel}>Este gasto sale de un sobre de ahorro</Text>
                  </View>
                  {useSavingsEnvelope && (
                    <Dropdown
                      label="Sobre de ahorro"
                      options={savingsOptions}
                      value={sourceSavingsEnvelopeId}
                      onSelect={setSourceSavingsEnvelopeId}
                      placeholder={savingsEnvelopes.length === 0 ? 'Crea un sobre de ahorro primero' : 'Seleccionar sobre de ahorro'}
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
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 16 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.secondaryText,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleLabel: { color: COLORS.white, fontSize: 15, flex: 1 },
  errorText: { color: COLORS.red, fontSize: 13, marginTop: -20, marginBottom: 20 },
  input: {
    backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 16,
    color: COLORS.white, fontSize: 16, marginBottom: 24,
  },
});
