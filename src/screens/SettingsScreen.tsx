import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../context/ExpenseContext';
import { Trash2, Plus, ArrowLeft } from 'lucide-react-native';
import { Dropdown } from '../components/Dropdown';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Currency } from '../types';

const COLORS = {
  bg: '#092230',
  cardBg: '#1F3A47',
  inputBg: '#1F3A47',
  green: '#A7E7B4',
  redText: '#E55B5B',
  white: '#FFFFFF',
  secondaryText: '#A6B9C7',
  border: '#142E3D',
  divider: '#142E3D',
};

type PendingDelete =
  | { type: 'paymentMethod'; id: string; name: string }
  | { type: 'category'; id: string; name: string };

export const SettingsScreen = ({ navigation }: any) => {
  const {
    settings, updateSettings,
    paymentMethods, addPaymentMethod, deletePaymentMethod,
    categories, addCategory, deleteCategory,
  } = useAppData();

  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [usdRate, setUsdRate] = useState(settings.exchangeRates.USD_TO_CRC.toString());
  const [eurRate, setEurRate] = useState(settings.exchangeRates.EUR_TO_CRC.toString());
  const [ratesSaved, setRatesSaved] = useState(false);
  const [pending, setPending] = useState<PendingDelete | null>(null);

  const handleSaveRates = async () => {
    const usd = parseFloat(usdRate);
    const eur = parseFloat(eurRate);
    if (isNaN(usd) || isNaN(eur)) return;
    await updateSettings({ exchangeRates: { USD_TO_CRC: usd, EUR_TO_CRC: eur } });
    setRatesSaved(true);
    setTimeout(() => setRatesSaved(false), 2000);
  };

  const handleAddPaymentMethod = async () => {
    if (!newPaymentMethod.trim()) return;
    await addPaymentMethod(newPaymentMethod.trim());
    setNewPaymentMethod('');
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await addCategory(newCategory.trim());
    setNewCategory('');
  };

  const handleConfirmDelete = async () => {
    if (!pending) return;
    if (pending.type === 'paymentMethod') await deletePaymentMethod(pending.id);
    if (pending.type === 'category') await deleteCategory(pending.id);
    setPending(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ConfirmDialog
        visible={!!pending}
        title={`Eliminar "${pending?.name}"`}
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPending(null)}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajustes</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Moneda ── */}
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

        {/* ── Tasas de cambio ── */}
        <Text style={styles.sectionTitle}>Tasas de cambio (base CRC)</Text>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>1 USD =</Text>
          <TextInput
            style={styles.rateInput}
            value={usdRate}
            onChangeText={setUsdRate}
            keyboardType="numeric"
            placeholderTextColor={COLORS.secondaryText}
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
            placeholderTextColor={COLORS.secondaryText}
          />
          <Text style={styles.rateSuffix}>CRC</Text>
        </View>
        <TouchableOpacity style={[styles.saveBtn, ratesSaved && styles.saveBtnSuccess]} onPress={handleSaveRates}>
          <Text style={styles.saveBtnText}>{ratesSaved ? '✓ Guardado' : 'Guardar tasas'}</Text>
        </TouchableOpacity>

        {/* ── Métodos de pago ── */}
        <Text style={styles.sectionTitle}>Métodos de pago</Text>
        {paymentMethods.map(pm => (
          <View key={pm.id} style={styles.listItem}>
            <Text style={styles.listItemText}>{pm.name}</Text>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 16, right: 10 }}
              onPress={() => setPending({ type: 'paymentMethod', id: pm.id, name: pm.name })}
            >
              <Trash2 color={COLORS.redText} size={20} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 12 }]}
            value={newPaymentMethod}
            onChangeText={setNewPaymentMethod}
            placeholder="Nuevo método..."
            placeholderTextColor={COLORS.secondaryText}
            onSubmitEditing={handleAddPaymentMethod}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddPaymentMethod}>
            <Plus color={COLORS.bg} size={22} />
          </TouchableOpacity>
        </View>

        {/* ── Categorías ── */}
        <Text style={styles.sectionTitle}>Categorías</Text>
        {categories.map(cat => (
          <View key={cat.id} style={styles.listItem}>
            <Text style={styles.listItemText}>{cat.name}</Text>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 16, right: 10 }}
              onPress={() => setPending({ type: 'category', id: cat.id, name: cat.name })}
            >
              <Trash2 color={COLORS.redText} size={20} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 12 }]}
            value={newCategory}
            onChangeText={setNewCategory}
            placeholder="Nueva categoría..."
            placeholderTextColor={COLORS.secondaryText}
            onSubmitEditing={handleAddCategory}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddCategory}>
            <Plus color={COLORS.bg} size={22} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  rateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rateLabel: { color: COLORS.secondaryText, fontSize: 15, width: 60 },
  rateInput: { flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 12, color: COLORS.white, fontSize: 16 },
  rateSuffix: { color: COLORS.secondaryText, fontSize: 15, marginLeft: 10, width: 36 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14, color: COLORS.white, fontSize: 16, marginBottom: 12 },
  saveBtn: { backgroundColor: COLORS.green, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  saveBtnSuccess: { backgroundColor: '#4ADE80' },
  saveBtnText: { color: COLORS.bg, fontSize: 16, fontWeight: '700' },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  listItemText: { color: COLORS.white, fontSize: 16, flex: 1, paddingRight: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.green, justifyContent: 'center', alignItems: 'center' },
});
