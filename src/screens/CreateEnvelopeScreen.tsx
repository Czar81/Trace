import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Check } from 'lucide-react-native';
import { EnvelopeType, Currency } from '../types';
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

type Props = NativeStackScreenProps<RootStackParamList, 'CreateEnvelope'>;

export const CreateEnvelopeScreen = ({ route, navigation }: Props) => {
  const { envelopeType, envelope } = route.params;
  const { addEnvelope, updateEnvelope, settings } = useAppData();

  const isEditing = !!envelope;
  const defaultColor = envelopeType === 'gasto' ? '#E55B5B' : '#52A8D9';

  const [name, setName] = useState(envelope?.name ?? '');
  const [limitStr, setLimitStr] = useState(envelope?.limit ? String(envelope.limit) : '');
  const [isUnlimited, setIsUnlimited] = useState(envelope?.isUnlimited ?? false);
  const [icon, setIcon] = useState<IconName>((envelope?.icon as IconName) ?? 'box');
  const [imageUri, setImageUri] = useState<string | undefined>(envelope?.imageUri);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [limitError, setLimitError] = useState('');
  const [currency, setCurrency] = useState<Currency>(envelope?.currency ?? settings.defaultCurrency);

  const color = envelope?.color ?? defaultColor;

  const handleSave = async () => {
    if (!name.trim()) return;
    const limit = isUnlimited ? 0 : parseFloat(limitStr || '0');

    if (!isUnlimited && (isNaN(limit) || limit < 0)) {
      setLimitError('Ingresa un monto válido mayor o igual a 0');
      return;
    }
    setLimitError('');

    if (isEditing && envelope) {
      await updateEnvelope(envelope.id, { name: name.trim(), currency, limit, isUnlimited, icon, imageUri });
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Sobre' : `Nuevo Sobre · ${envelopeType === 'gasto' ? 'Gasto' : 'Ahorro'}`}
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
              label={envelopeType === 'gasto' ? 'Presupuesto' : 'Meta de ahorro'}
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
              {envelopeType === 'gasto' ? 'Sin límite de gasto' : 'Ahorro ilimitado'}
            </Text>
            <Text style={styles.hint}>
              {envelopeType === 'gasto'
                ? 'No habrá un presupuesto máximo.'
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
});
