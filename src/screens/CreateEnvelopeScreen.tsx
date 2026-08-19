import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Check } from 'lucide-react-native';
import { EnvelopeType, Currency, DebtInterestFrequency } from '../types';
import { RootStackParamList } from '../navigation/types';
import { CurrencyInput } from '../components/CurrencyInput';
import { EnvelopeIcon, IconName } from '../components/EnvelopeIcon';
import { IconPicker } from '../components/IconPicker';
import { EnvelopeAvatar } from '../components/EnvelopeAvatar';
import { Dropdown } from '../components/Dropdown';
import { COLORS } from '../theme/colors';

const CURRENCY_OPTIONS = [
  { label: 'CRC', value: 'CRC' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
];

const INTEREST_FREQUENCY_OPTIONS = [
  { label: 'Mensual', value: 'mensual' },
  { label: 'Quincenal', value: 'quincenal' },
  { label: 'Anual', value: 'anual' },
];

const DUE_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) }));

type Props = NativeStackScreenProps<RootStackParamList, 'CreateEnvelope'>;

export const CreateEnvelopeScreen = ({ route, navigation }: Props) => {
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
  const [dueDay, setDueDay] = useState<string>(envelope?.dueDay ? String(envelope.dueDay) : '');

  const color = envelope?.color ?? defaultColor;
  const isDebtDetailsVisible = envelopeType === 'deuda' && !isUnlimited;

  const handleSave = async () => {
    if (!name.trim()) return;
    const limit = isUnlimited ? 0 : parseFloat(limitStr || '0');

    if (!isUnlimited && (isNaN(limit) || limit < 0)) {
      setLimitError('Ingresa un monto válido mayor o igual a 0');
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

    if (isEditing && envelope) {
      await updateEnvelope(envelope.id, { name: name.trim(), currency, limit, isUnlimited, icon, imageUri, ...debtFields });
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
        ...debtFields,
      });
    }
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing
            ? 'Editar Sobre'
            : `Nuevo Sobre · ${envelopeType === 'gasto' ? 'Gasto' : envelopeType === 'deuda' ? 'Deuda' : 'Ahorro'}`}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Check color={COLORS.green} size={24} />
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
            <Text style={styles.changeIconText}>Cambiar ícono o imagen</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nombre del sobre"
          placeholderTextColor={COLORS.secondaryText}
          autoFocus={!isEditing}
        />

        <Dropdown
          label="Moneda"
          options={CURRENCY_OPTIONS}
          value={currency}
          onSelect={(value) => setCurrency(value as Currency)}
        />

        {!isUnlimited && (
          <>
            <CurrencyInput
              label={
                envelopeType === 'gasto'
                  ? 'Presupuesto'
                  : envelopeType === 'deuda'
                  ? 'Monto total de la deuda'
                  : 'Meta de ahorro'
              }
              currency={settings.defaultCurrency}
              value={limitStr}
              onChangeText={(text) => { setLimitStr(text); setLimitError(''); }}
            />
            {limitError ? <Text style={styles.errorText}>{limitError}</Text> : null}
          </>
        )}

        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 20 }}>
            <Text style={styles.label}>
              {envelopeType === 'gasto'
                ? 'Sin límite de gasto'
                : envelopeType === 'deuda'
                ? 'Deuda sin monto total definido'
                : 'Ahorro ilimitado'}
            </Text>
            <Text style={styles.hint}>
              {envelopeType === 'gasto'
                ? 'No habrá un presupuesto máximo.'
                : envelopeType === 'deuda'
                ? 'No se calculará cuánto falta por pagar.'
                : 'La meta de ahorro no tiene límite.'}
            </Text>
          </View>
          <Switch
            value={isUnlimited}
            onValueChange={(value) => { setIsUnlimited(value); if (value) setLimitError(''); }}
            trackColor={{ false: COLORS.cardBg, true: COLORS.green }}
            thumbColor={COLORS.white}
          />
        </View>

        {isDebtDetailsVisible && (
          <>
            <Text style={styles.sectionLabel}>Detalles de la deuda</Text>

            <Text style={styles.label}>Tasa de interés (opcional)</Text>
            <View style={styles.percentRow}>
              <TextInput
                style={[styles.input, styles.percentInput]}
                value={interestRateStr}
                onChangeText={setInterestRateStr}
                placeholder="0"
                placeholderTextColor={COLORS.secondaryText}
                keyboardType="numeric"
              />
              <Text style={styles.percentSign}>%</Text>
            </View>

            <Dropdown
              label="Frecuencia del interés"
              options={INTEREST_FREQUENCY_OPTIONS}
              value={interestFrequency}
              onSelect={(value) => setInterestFrequency(value as DebtInterestFrequency)}
            />

            <CurrencyInput
              label="Pago mínimo (opcional)"
              currency={settings.defaultCurrency}
              value={minimumPaymentStr}
              onChangeText={setMinimumPaymentStr}
            />

            <Dropdown
              label="Día de vencimiento (opcional)"
              options={DUE_DAY_OPTIONS}
              value={dueDay}
              onSelect={setDueDay}
              placeholder="Seleccionar día..."
            />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  headerBtn: { padding: 4 },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  form: { paddingHorizontal: 20, paddingBottom: 60 },
  iconSection: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  iconPreviewWrap: { marginBottom: 10 },
  changeIconText: { color: COLORS.secondaryText, fontSize: 14, fontWeight: '600' },
  label: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  hint: { color: COLORS.secondaryText, fontSize: 13, marginBottom: 16 },
  input: { backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 16, color: COLORS.white, fontSize: 16, marginBottom: 24 },
  errorText: { color: COLORS.red, fontSize: 13, marginTop: -20, marginBottom: 20 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  sectionLabel: { color: COLORS.white, fontSize: 15, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  percentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  percentInput: { flex: 1, marginBottom: 0 },
  percentSign: { color: COLORS.secondaryText, fontSize: 18, fontWeight: '700' },
});
