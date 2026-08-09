import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft, ChevronRight, RefreshCw } from 'lucide-react-native';
import { Dropdown } from '../components/Dropdown';
import { RootStackParamList } from '../navigation/types';
import { COLORS as SHARED } from '../theme/colors';

const COLORS = {
  bg: SHARED.bg,
  white: SHARED.white,
  green: '#52A8D9',
  secondaryText: SHARED.secondaryText,
  cardBg: SHARED.cardBg,
  divider: SHARED.divider,
};

type Props = NativeStackScreenProps<RootStackParamList, 'CutoffSettings'>;

export const CutoffSettingsScreen = ({ navigation }: Props) => {
  const { settings, updateSettings } = useAppData();

  const cutoffOptions = Array.from({ length: 31 }, (_, i) => ({
    label: `Día ${i + 1}`,
    value: String(i + 1),
  }));

  const handleCutoffToggle = async (value: boolean) => {
    await updateSettings({ expenseCutoffEnabled: value });
  };

  const handleCutoffDayChange = async (value: string) => {
    await updateSettings({ expenseCutoffDay: Number(value) });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Corte mensual</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Configura el corte mensual</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrapper}>
            <Text style={styles.menuTitle}>Ignorar gastos anteriores</Text>
            <Text style={styles.menuSubtitle}>Activa para filtrar gastos previos de sobres de gasto</Text>
          </View>
          <Switch
            value={settings.expenseCutoffEnabled}
            onValueChange={handleCutoffToggle}
            trackColor={{ false: '#3d4b59', true: COLORS.green }}
            thumbColor={settings.expenseCutoffEnabled ? COLORS.green : COLORS.white}
          />
        </View>

        <View style={[styles.menuItem, !settings.expenseCutoffEnabled && styles.disabledItem]}>
          <View style={styles.menuIconWrapper}>
            <RefreshCw color={COLORS.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Dropdown
              label="Selecciona el día del mes"
              options={cutoffOptions}
              value={settings.expenseCutoffDay ? String(settings.expenseCutoffDay) : ''}
              onSelect={handleCutoffDayChange}
              placeholder="Selecciona un día"
            />
          </View>
          <ChevronRight color={COLORS.secondaryText} size={20} />
        </View>

        <Text style={styles.helperText}>
          Solo se contarán los gastos del periodo mensual actual, empezando en el día seleccionado. Los sobres de ahorro no se ven afectados.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.divider },
  menuIconWrapper: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#0D2E42', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuTextWrapper: { flex: 1 },
  menuTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  menuSubtitle: { color: COLORS.secondaryText, fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.divider },
  toggleTextWrapper: { flex: 1, paddingRight: 12 },
  helperText: { color: COLORS.secondaryText, fontSize: 13, lineHeight: 18, marginTop: 8 },
  disabledItem: { opacity: 0.5 },
});
