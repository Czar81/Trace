import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft } from 'lucide-react-native';
import { Dropdown } from '../components/Dropdown';
import { Currency } from '../types';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'CurrencySettings'>;

export const CurrencySettingsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { settings, updateSettings } = useAppData();
  const [usdRate, setUsdRate] = useState(settings.exchangeRates.USD_TO_CRC.toString());
  const [eurRate, setEurRate] = useState(settings.exchangeRates.EUR_TO_CRC.toString());
  const [ratesSaved, setRatesSaved] = useState(false);

  useEffect(() => {
    setUsdRate(settings.exchangeRates.USD_TO_CRC.toString());
    setEurRate(settings.exchangeRates.EUR_TO_CRC.toString());
  }, [settings.exchangeRates]);

  const handleSaveRates = async () => {
    const usd = parseFloat(usdRate);
    const eur = parseFloat(eurRate);
    if (isNaN(usd) || isNaN(eur)) return;
    await updateSettings({ exchangeRates: { USD_TO_CRC: usd, EUR_TO_CRC: eur } });
    setRatesSaved(true);
    setTimeout(() => setRatesSaved(false), 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monedas</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={1}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Moneda por defecto</Text>
          <Dropdown
            options={[
              { label: '₡ CRC — Colón costarricense', value: 'CRC' },
              { label: '$ USD — Dólar estadounidense', value: 'USD' },
              { label: '€ EUR — Euro', value: 'EUR' },
            ]}
            value={settings.defaultCurrency}
            onSelect={(val) => updateSettings({ defaultCurrency: val as Currency })}
          />

          <Text style={styles.sectionTitle}>Tasas de cambio (base CRC)</Text>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>1 USD =</Text>
            <TextInput
              style={styles.rateInput}
              value={usdRate}
              onChangeText={setUsdRate}
              keyboardType="numeric"
              placeholderTextColor={colors.secondaryText}
            />
            <Text style={styles.rateSuffix}>CRC</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>1 EUR =</Text>
            <TextInput
              style={styles.rateInput}
              value={eurRate}
              onChangeText={setEurRate}
              keyboardType="numeric"
              placeholderTextColor={colors.secondaryText}
            />
            <Text style={styles.rateSuffix}>CRC</Text>
          </View>
          <TouchableOpacity style={[styles.saveBtn, ratesSaved && styles.saveBtnSuccess]} onPress={handleSaveRates}>
            <Text style={styles.saveBtnText}>{ratesSaved ? '✓ Guardado' : 'Guardar tasas'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  keyboardAvoiding: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  rateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rateLabel: { color: colors.secondaryText, fontSize: 15, width: 60 },
  rateInput: { flex: 1, backgroundColor: colors.cardBg, borderRadius: 10, padding: 12, color: colors.white, fontSize: 16 },
  rateSuffix: { color: colors.secondaryText, fontSize: 15, marginLeft: 10, width: 36 },
  saveBtn: { backgroundColor: colors.green, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  saveBtnSuccess: { backgroundColor: '#4ADE80' },
  saveBtnText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
});
