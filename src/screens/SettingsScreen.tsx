import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft, ChevronRight, CreditCard, DollarSign, Tag, Download, Upload, RefreshCw } from 'lucide-react-native';
import { exportDataToCSV } from '../utils/exportData';
import { ConfirmDialog } from '../components/ConfirmDialog';

const COLORS = {
  bg: '#092230',
  white: '#FFFFFF',
  redText: '#E55B5B',
  secondaryText: '#A6B9C7',
  cardBg: '#1F3A47',
  divider: '#142E3D',
};

export const SettingsScreen = ({ navigation }: any) => {
  const {
    envelopes, transactions, paymentMethods, categories, settings,
    importFromBackup, resetAllEnvelopes,
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
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Configura tu app</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('CurrencySettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <DollarSign color={COLORS.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Monedas</Text>
            <Text style={styles.menuSubtitle}>Tipo de moneda y tasas de cambio</Text>
          </View>
          <ChevronRight color={COLORS.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('PaymentMethodsSettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <CreditCard color={COLORS.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Métodos de pago</Text>
            <Text style={styles.menuSubtitle}>Agregar, editar y eliminar métodos</Text>
          </View>
          <ChevronRight color={COLORS.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('CategoriesSettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Tag color={COLORS.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Categorías</Text>
            <Text style={styles.menuSubtitle}>Organiza tus transacciones</Text>
          </View>
          <ChevronRight color={COLORS.secondaryText} size={20} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Backup y restauración</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleImport}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Upload color={COLORS.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Importar backup</Text>
            <Text style={styles.menuSubtitle}>Cargar datos desde backup</Text>
          </View>
          <ChevronRight color={COLORS.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleExport}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Download color={COLORS.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>Exportar backup</Text>
            <Text style={styles.menuSubtitle}>Guardar copia de seguridad</Text>
          </View>
          <ChevronRight color={COLORS.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleResetAll}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <RefreshCw color={COLORS.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={[styles.menuTitle, { color: COLORS.redText }]}>Resetear todos los sobres</Text>
            <Text style={styles.menuSubtitle}>Reinicia los saldos y mueve todo al historial</Text>
          </View>
          <ChevronRight color={COLORS.secondaryText} size={20} />
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
        confirmLabel="OK"
        cancelLabel=""
        onConfirm={() => setShowInfoDialog(false)}
        onCancel={() => setShowInfoDialog(false)}
      />
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
});
