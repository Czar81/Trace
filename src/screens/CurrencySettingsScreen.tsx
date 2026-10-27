import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { Dropdown } from '../components/Dropdown';
import { Currency } from '../types';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { canRefreshNow, fetchExchangeRates } from '../utils/exchangeRates';

type Props = NativeStackScreenProps<RootStackParamList, 'CurrencySettings'>;

export const CurrencySettingsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t, locale } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { settings, updateSettings } = useAppData();
  const [usdRate, setUsdRate] = useState(settings.exchangeRates.USD_TO_CRC.toString());
  const [eurRate, setEurRate] = useState(settings.exchangeRates.EUR_TO_CRC.toString());
  const [ratesSaved, setRatesSaved] = useState(false);

  useEffect(() => {
    setUsdRate(settings.exchangeRates.USD_TO_CRC.toString());
    setEurRate(settings.exchangeRates.EUR_TO_CRC.toString());
  }, [settings.exchangeRates]);

  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'error' | 'recent'>('idle');

  const handleFetchRates = async () => {
    if (!canRefreshNow(settings.exchangeRatesUpdatedAt)) {
      setFetchStatus('recent');
      return;
    }
    setFetchStatus('loading');
    const rates = await fetchExchangeRates();
    if (!rates) {
      setFetchStatus('error');
      return;
    }
    await updateSettings({ exchangeRates: rates, exchangeRatesUpdatedAt: new Date().toISOString() });
    setFetchStatus('idle');
  };

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('currency.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={1}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>{t('currency.default')}</Text>
          <Dropdown
            options={[
              { label: t('currency.crc'), value: 'CRC' },
              { label: t('currency.usd'), value: 'USD' },
              { label: t('currency.eur'), value: 'EUR' },
            ]}
            value={settings.defaultCurrency}
            onSelect={(val) => updateSettings({ defaultCurrency: val as Currency })}
          />

          <Text style={styles.sectionTitle}>{t('currency.rates')}</Text>
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
          <TouchableOpacity style={styles.fetchBtn} onPress={handleFetchRates} disabled={fetchStatus === 'loading'} activeOpacity={0.8}>
            <RefreshCw color={colors.white} size={16} />
            <Text style={styles.fetchBtnText}>{fetchStatus === 'loading' ? t('currency.fetching') : t('currency.fetchRates')}</Text>
          </TouchableOpacity>
          {fetchStatus === 'recent' ? <Text style={styles.fetchInfo}>{t('currency.fetchRecent')}</Text> : null}
          {fetchStatus === 'error' ? <Text style={styles.fetchError}>{t('currency.fetchError')}</Text> : null}
          {settings.exchangeRatesUpdatedAt ? (
            <Text style={styles.fetchInfo}>
              {t('currency.updatedAt', { date: new Date(settings.exchangeRatesUpdatedAt).toLocaleString(locale) })}
            </Text>
          ) : null}
          <View style={styles.autoRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.autoLabel}>{t('currency.autoUpdate')}</Text>
              <Text style={styles.fetchInfo}>{t('currency.autoUpdateHint')}</Text>
            </View>
            <Switch
              value={!!settings.autoExchangeRates}
              onValueChange={(on) => updateSettings({ autoExchangeRates: on })}
              trackColor={{ false: colors.cardBg, true: colors.green }}
              thumbColor={colors.white}
            />
          </View>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.exchangerate-api.com')}>
            <Text style={styles.attribution}>{t('currency.attribution')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, ratesSaved && styles.saveBtnSuccess]} onPress={handleSaveRates}>
            <Text style={styles.saveBtnText}>{ratesSaved ? t('currency.saved') : t('currency.saveRates')}</Text>
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
  fetchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.cardBg, borderRadius: 12, padding: 14, marginTop: 4 },
  fetchBtnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  attribution: { color: colors.secondaryText, fontSize: 12, textDecorationLine: 'underline', marginBottom: 16 },
  fetchError: { color: colors.red, fontSize: 13, marginTop: 8 },
  fetchInfo: { color: colors.secondaryText, fontSize: 12, marginTop: 6 },
  autoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  autoLabel: { color: colors.white, fontSize: 15 },
  saveBtn: { backgroundColor: colors.green, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  saveBtnSuccess: { backgroundColor: '#4ADE80' },
  saveBtnText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
});
