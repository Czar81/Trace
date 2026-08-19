import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppData } from '../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Check, PlusCircle, MinusCircle, Calendar } from 'lucide-react-native';
import { CurrencyInput } from '../components/CurrencyInput';
import { Dropdown } from '../components/Dropdown';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../theme/colors';
import { RecurrenceFrequency } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRecurringTransaction'>;

const FREQUENCY_OPTIONS: { label: string; value: RecurrenceFrequency }[] = [
  { label: 'Mensual', value: 'monthly' },
  { label: 'Semanal', value: 'weekly' },
  { label: 'Quincenal (cada 2 semanas)', value: 'biweekly' },
  { label: 'Anual', value: 'annual' },
];

const DAY_OF_MONTH_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) }));

const MONTH_OPTIONS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
].map((label, i) => ({ label, value: String(i + 1) }));

/** Nearest date on/after today that falls on `dayOfWeek` (0=Sunday..6=Saturday). */
function nextDateForDayOfWeek(dayOfWeek: number): Date {
  const today = new Date();
  const diff = (dayOfWeek - today.getDay() + 7) % 7;
  const result = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
  return result;
}

export const CreateRecurringTransactionScreen = ({ route, navigation }: Props) => {
  const { template } = route.params;
  const { envelopes, paymentMethods, categories, addRecurringTemplate, updateRecurringTemplate } = useAppData();

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
  const [showOccurrenceDatePicker, setShowOccurrenceDatePicker] = useState(false);
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

    let dayOfMonth = 1;
    if (frequency === 'monthly' || frequency === 'annual') {
      const parsedDay = parseInt(dayOfMonthStr, 10);
      if (!dayOfMonthStr || isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        setDayError('Ingresa un día entre 1 y 31');
        return;
      }
      dayOfMonth = parsedDay;
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

          {/* ── Frequency ── */}
          <Dropdown
            label="Frecuencia"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onSelect={(value) => { setFrequency(value as RecurrenceFrequency); setDayError(''); }}
          />

          {/* ── Month (annual only) ── */}
          {frequency === 'annual' && (
            <Dropdown
              label="Mes"
              options={MONTH_OPTIONS}
              value={String(month)}
              onSelect={(value) => setMonth(parseInt(value, 10))}
            />
          )}

          {/* ── Day of month (monthly & annual) ── */}
          {(frequency === 'monthly' || frequency === 'annual') && (
            <>
              <Dropdown
                label="Día del mes"
                options={DAY_OF_MONTH_OPTIONS}
                value={dayOfMonthStr}
                onSelect={(value) => { setDayOfMonthStr(value); setDayError(''); }}
                placeholder="Selecciona un día"
              />
              {dayError ? <Text style={styles.errorText}>{dayError}</Text> : null}
            </>
          )}

          {/* ── First occurrence date (weekly & biweekly — derives day of week automatically) ── */}
          {(frequency === 'weekly' || frequency === 'biweekly') && (
            <>
              <Text style={styles.label}>Primera ocurrencia</Text>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowOccurrenceDatePicker(true)}>
                <Calendar color={COLORS.secondaryText} size={20} />
                <Text style={styles.dateText}>
                  {occurrenceDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              {showOccurrenceDatePicker && (
                <DateTimePicker
                  value={occurrenceDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowOccurrenceDatePicker(false);
                    if (selectedDate) setOccurrenceDate(selectedDate);
                  }}
                />
              )}
            </>
          )}

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
  datePickerBtn: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  dateText: { color: COLORS.white, fontSize: 16 },
  input: {
    backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 16,
    color: COLORS.white, fontSize: 16, marginBottom: 24,
  },
});
