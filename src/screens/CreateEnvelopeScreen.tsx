import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft, Check } from 'lucide-react-native';
import { EnvelopeType } from '../types';
import { CurrencyInput } from '../components/CurrencyInput';
import { EnvelopeIcon, IconName } from '../components/EnvelopeIcon';
import { IconPicker } from '../components/IconPicker';
import { EnvelopeAvatar } from '../components/EnvelopeAvatar';

const COLORS = {
  bg: '#092230',
  cardBg: '#1F3A47',
  inputBg: '#1F3A47',
  green: '#A7E7B4',
  redText: '#E55B5B',
  blueText: '#52A8D9',
  white: '#FFFFFF',
  secondaryText: '#A6B9C7',
};

export const CreateEnvelopeScreen = ({ route, navigation }: any) => {
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

  const color = envelope?.color ?? defaultColor;

  const handleSave = async () => {
    if (!name.trim()) return;
    const limit = isUnlimited ? 0 : parseFloat(limitStr || '0');

    if (isEditing && envelope) {
      await updateEnvelope(envelope.id, { name: name.trim(), limit, isUnlimited, icon, imageUri });
    } else {
      await addEnvelope({
        name: name.trim(),
        type: envelopeType,
        currency: settings.defaultCurrency,
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

        <Text style={styles.label}>
          Moneda: <Text style={{ color: COLORS.green }}>{settings.defaultCurrency}</Text>
        </Text>
        <Text style={styles.hint}>Configurable en Ajustes → Moneda por defecto</Text>

        {!isUnlimited && (
          <CurrencyInput
            label={envelopeType === 'gasto' ? 'Presupuesto' : 'Meta de ahorro'}
            currency={settings.defaultCurrency}
            value={limitStr}
            onChangeText={setLimitStr}
          />
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
            onValueChange={setIsUnlimited}
            trackColor={{ false: COLORS.cardBg, true: COLORS.green }}
            thumbColor={COLORS.white}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  headerBtn: { padding: 4 },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  form: { paddingHorizontal: 20, paddingBottom: 60 },
  iconSection: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  iconPreviewWrap: { marginBottom: 10 },
  changeIconText: { color: COLORS.secondaryText, fontSize: 14, fontWeight: '600' },
  label: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  hint: { color: COLORS.secondaryText, fontSize: 13, marginBottom: 16 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 16, color: COLORS.white, fontSize: 16, marginBottom: 24 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
});
