import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft, ChevronRight, CreditCard, DollarSign, Tag, Download, Upload, RefreshCw, BarChart3, Repeat, Minus, Plus, Palette } from 'lucide-react-native';
import { exportDataToCSV } from '../utils/exportData';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export const SettingsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    envelopes, transactions, paymentMethods, categories, settings,
    importFromBackup, resetAllEnvelopes, updateSettings,
  } = useAppData();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoDialogTitle, setInfoDialogTitle] = useState('');
  const [infoDialogMessage, setInfoDialogMessage] = useState('');

  const showInfo = (title: string, message: string) => {
    setInfoDialogTitle(title);
    setInfoDialogMessage(message);
    setShowInfoDialog(true);
  };

  const handleImport = async () => {
    const result = await importFromBackup();
    showInfo(
      result.success ? 'Importación exitosa' : 'Error de importación',
      result.message
    );
  };

  const changeLeadDays = (delta: number) => {
    const next = Math.min(7, Math.max(1, settings.billReminderLeadDays + delta));
    if (next !== settings.billReminderLeadDays) {
      updateSettings({ billReminderLeadDays: next });
    }
  };

  const handleCutoffToggle = (value: boolean) => {
    updateSettings({
      expenseCutoffEnabled: value,
      expenseCutoffDay: value ? (settings.expenseCutoffDay ?? 1) : settings.expenseCutoffDay,
    });
  };

  const changeCutoffDay = (delta: number) => {
    const current = settings.expenseCutoffDay ?? 1;
    const next = Math.min(31, Math.max(1, current + delta));
    if (next !== current) {
      updateSettings({ expenseCutoffDay: next });
    }
  };

  const handleExport = () => {
    exportDataToCSV(envelopes, transactions, paymentMethods, categories, settings);
    showInfo('Exportación', 'Backup exportado correctamente.');
  };

  const handleResetAll = () => {
    setShowResetConfirm(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Configura tu app</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AppearanceSettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Palette color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Apariencia</Text>
            <Text style={styles.menuSubtitle}>Elegí el tema visual de la app</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('CurrencySettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <DollarSign color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Monedas</Text>
            <Text style={styles.menuSubtitle}>Tipo de moneda y tasas de cambio</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('PaymentMethodsSettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <CreditCard color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Métodos de pago</Text>
            <Text style={styles.menuSubtitle}>Agregar, editar y eliminar métodos</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('CategoriesSettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Tag color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Categorías</Text>
            <Text style={styles.menuSubtitle}>Organiza tus transacciones</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Reports')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <BarChart3 color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Reportes</Text>
            <Text style={styles.menuSubtitle}>Gastos por categoría, mes y más</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Recurring')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Repeat color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Recurrentes</Text>
            <Text style={styles.menuSubtitle}>Transacciones automáticas mensuales</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Alertas</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrapper}>
            <Text style={styles.menuTitle}>Alertas de presupuesto</Text>
            <Text style={styles.menuSubtitle}>Notifica al llegar al 80% y 100% de un sobre de gasto</Text>
          </View>
          <Switch
            value={settings.budgetAlertsEnabled}
            onValueChange={() => updateSettings({ budgetAlertsEnabled: !settings.budgetAlertsEnabled })}
            trackColor={{ false: colors.cardBg, true: colors.green }}
            thumbColor={settings.budgetAlertsEnabled ? colors.green : colors.white}
          />
        </View>

        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.menuTitle}>Recordatorios de facturas</Text>
              <Text style={styles.menuSubtitle}>
                {settings.billRemindersEnabled
                  ? `Avisa ${settings.billReminderLeadDays} día${settings.billReminderLeadDays > 1 ? 's' : ''} antes de que se genere una transacción recurrente`
                  : 'Avisa antes de que se genere una transacción recurrente'}
              </Text>
            </View>
            <Switch
              value={settings.billRemindersEnabled}
              onValueChange={() => updateSettings({ billRemindersEnabled: !settings.billRemindersEnabled })}
              trackColor={{ false: colors.cardBg, true: colors.green }}
              thumbColor={settings.billRemindersEnabled ? colors.green : colors.white}
            />
          </View>

          {settings.billRemindersEnabled && (
            <>
              <View style={styles.reminderDivider} />
              <View style={styles.reminderRow}>
                <Text style={styles.leadDaysLabel}>Días de anticipación</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, settings.billReminderLeadDays <= 1 && styles.stepperBtnDisabled]}
                    disabled={settings.billReminderLeadDays <= 1}
                    onPress={() => changeLeadDays(-1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Minus color={settings.billReminderLeadDays <= 1 ? colors.secondaryText : colors.white} size={16} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{settings.billReminderLeadDays}</Text>
                  <TouchableOpacity
                    style={[styles.stepperBtn, settings.billReminderLeadDays >= 7 && styles.stepperBtnDisabled]}
                    disabled={settings.billReminderLeadDays >= 7}
                    onPress={() => changeLeadDays(1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Plus color={settings.billReminderLeadDays >= 7 ? colors.secondaryText : colors.white} size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Corte de gastos</Text>

        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.menuTitle}>Corte mensual</Text>
              <Text style={styles.menuSubtitle}>
                {settings.expenseCutoffEnabled
                  ? `Ignora gastos previos al día ${settings.expenseCutoffDay ?? 1} de cada mes`
                  : 'Ignora gastos previos al día de corte en sobres de gasto'}
              </Text>
            </View>
            <Switch
              value={settings.expenseCutoffEnabled}
              onValueChange={handleCutoffToggle}
              trackColor={{ false: colors.cardBg, true: colors.green }}
              thumbColor={settings.expenseCutoffEnabled ? colors.green : colors.white}
            />
          </View>

          {settings.expenseCutoffEnabled && (
            <>
              <View style={styles.reminderDivider} />
              <View style={styles.reminderRow}>
                <Text style={styles.leadDaysLabel}>Día de corte</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, (settings.expenseCutoffDay ?? 1) <= 1 && styles.stepperBtnDisabled]}
                    disabled={(settings.expenseCutoffDay ?? 1) <= 1}
                    onPress={() => changeCutoffDay(-1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Minus color={(settings.expenseCutoffDay ?? 1) <= 1 ? colors.secondaryText : colors.white} size={16} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{settings.expenseCutoffDay ?? 1}</Text>
                  <TouchableOpacity
                    style={[styles.stepperBtn, (settings.expenseCutoffDay ?? 1) >= 31 && styles.stepperBtnDisabled]}
                    disabled={(settings.expenseCutoffDay ?? 1) >= 31}
                    onPress={() => changeCutoffDay(1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Plus color={(settings.expenseCutoffDay ?? 1) >= 31 ? colors.secondaryText : colors.white} size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Backup y restauración</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleImport}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Upload color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Importar backup</Text>
            <Text style={styles.menuSubtitle}>Cargar datos desde backup</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleExport}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Download color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Exportar backup</Text>
            <Text style={styles.menuSubtitle}>Guardar copia de seguridad</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleResetAll}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <RefreshCw color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={[styles.menuTitle, { color: colors.red }]}>Resetear todos los sobres</Text>
            <Text style={styles.menuSubtitle}>Reinicia los saldos y mueve todo al historial</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmDialog
        visible={showResetConfirm}
        title="Resetear todos los sobres"
        message="Esta acción moverá el historial de todos los sobres y reiniciará sus balances. Es irreversible."
        confirmLabel="Resetear"
        cancelLabel="Cancelar"
        destructive
        onConfirm={async () => {
          await resetAllEnvelopes();
          setShowResetConfirm(false);
          showInfo('Éxito', 'Todos los sobres han sido reiniciados.');
        }}
        onCancel={() => setShowResetConfirm(false)}
      />

      <ConfirmDialog
        visible={showInfoDialog}
        title={infoDialogTitle}
        message={infoDialogMessage}
        confirmLabel="Aceptar"
        cancelLabel=""
        onConfirm={() => setShowInfoDialog(false)}
        onCancel={() => setShowInfoDialog(false)}
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.divider },
  menuIconWrapper: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.cardHighlight, borderWidth: 1, borderColor: colors.divider, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuTextWrapper: { flex: 1 },
  menuTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  menuSubtitle: { color: colors.secondaryText, fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.divider },
  toggleTextWrapper: { flex: 1, paddingRight: 12 },
  reminderCard: { backgroundColor: colors.cardBg, borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.divider, overflow: 'hidden' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  reminderDivider: { height: 1, backgroundColor: colors.divider },
  leadDaysLabel: { color: colors.white, fontSize: 15, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.bg, borderRadius: 20, padding: 4 },
  stepperBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardHighlight },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperValue: { color: colors.white, fontSize: 15, fontWeight: '700', minWidth: 26, textAlign: 'center' },
});
