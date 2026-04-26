import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../context/ExpenseContext';
import { EnvelopeType, Currency } from '../types';
import { Settings, MoreVertical, Download, RefreshCw } from 'lucide-react-native';
import { EnvelopeAvatar } from '../components/EnvelopeAvatar';
import { ActionMenu, ActionMenuItem } from '../components/ActionMenu';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { exportDataToCSV } from '../utils/exportData';

const COLORS = {
  bg: '#092230',
  cardBg: '#1F3A47',
  green: '#A7E7B4',
  redText: '#E55B5B',
  blueText: '#52A8D9',
  white: '#FFFFFF',
  secondaryText: '#A6B9C7',
  tabActive: '#A7E7B4',
  tabInactive: '#A6B9C7',
};

const CURRENCY_CYCLE: Currency[] = ['CRC', 'USD', 'EUR'];
const SYMBOLS: Record<Currency, string> = { CRC: '₡', USD: '$', EUR: '€' };

export const MainScreen = ({ navigation }: any) => {
  const { envelopes, transactions, paymentMethods, categories, getTotalByType, getEnvelopeBalance, formatAmount, settings, convertToCRC, resetAllEnvelopes } = useAppData();
  const [activeTab, setActiveTab] = useState<EnvelopeType>('gasto');
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(settings.defaultCurrency);
  const [showMenu, setShowMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const filteredEnvelopes = envelopes.filter(e => e.type === activeTab);

  // Total is always computed in CRC; we convert to the user-chosen display currency
  const totalCRC = getTotalByType(activeTab);
  const totalDisplay = convertDisplayTotal(totalCRC, displayCurrency, settings.exchangeRates);

  function convertDisplayTotal(crc: number, to: Currency, rates: { USD_TO_CRC: number; EUR_TO_CRC: number }): string {
    let amount = crc;
    if (to === 'USD') amount = crc / rates.USD_TO_CRC;
    else if (to === 'EUR') amount = crc / rates.EUR_TO_CRC;
    const sym = SYMBOLS[to];
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sign}${sym}${abs}`;
  }

  const cycleCurrency = () => {
    const idx = CURRENCY_CYCLE.indexOf(displayCurrency);
    setDisplayCurrency(CURRENCY_CYCLE[(idx + 1) % CURRENCY_CYCLE.length]);
  };

  const menuItems: ActionMenuItem[] = [
    { label: 'Ajustes', icon: <Settings color={COLORS.secondaryText} size={20} />, onPress: () => navigation.navigate('Settings') },
    { label: 'Exportar a CSV', icon: <Download color={COLORS.secondaryText} size={20} />, onPress: () => exportDataToCSV(envelopes, transactions, paymentMethods, categories) },
    { label: 'Reiniciar todos los sobres', icon: <RefreshCw color={COLORS.redText} size={20} />, destructive: true, onPress: () => setShowResetConfirm(true) },
  ];

  const handleResetAll = async () => {
    await resetAllEnvelopes();
    setShowResetConfirm(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ActionMenu visible={showMenu} items={menuItems} onClose={() => setShowMenu(false)} />
      <ConfirmDialog
        visible={showResetConfirm}
        title="Reiniciar todos los sobres"
        message="Todas las transacciones actuales pasarán al historial y el saldo de todos los sobres volverá a cero. Esta acción no se puede deshacer."
        confirmLabel="Reiniciar Todo"
        destructive
        onConfirm={handleResetAll}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>TRACE</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowMenu(true)}>
          <MoreVertical color={COLORS.secondaryText} size={24} />
        </TouchableOpacity>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabContainer}>
        {(['gasto', 'ahorro'] as EnvelopeType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'gasto' ? 'Gastos' : 'Ahorros'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Summary card ── */}
      <View style={styles.summaryCard}>
        {/* Tapping cycles through currencies */}
        <TouchableOpacity onPress={cycleCurrency} style={styles.currencyBtn} activeOpacity={0.7}>
          <Text style={styles.currencyText}>{displayCurrency}</Text>
        </TouchableOpacity>
        <View style={styles.summaryValues}>
          <Text style={styles.summaryLabel}>
            {activeTab === 'gasto' ? 'Total disponible' : 'Total ahorrado'}
          </Text>
          <Text style={[styles.summaryTotal, totalCRC < 0 && { color: COLORS.redText }]}>
            {totalDisplay}
          </Text>
        </View>
      </View>

      {/* ── Envelope list ── */}
      <FlatList
        data={filteredEnvelopes}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay sobres. Toca "+ Crear Sobre" para comenzar.
          </Text>
        }
        renderItem={({ item }) => {
          const balance = getEnvelopeBalance(item.id);
          const isGasto = item.type === 'gasto';
          const displayAmount = isGasto
            ? (item.isUnlimited ? Math.abs(balance) : item.limit + balance)
            : balance;
          const isOver = isGasto && displayAmount < 0;

          return (
            <TouchableOpacity
              style={styles.envelopeCard}
              onPress={() => navigation.navigate('EnvelopeDetail', { envelopeId: item.id })}
            >
              <View style={{ marginRight: 16 }}>
                <EnvelopeAvatar icon={item.icon ?? 'box'} imageUri={item.imageUri} color={item.color} size={48} borderRadius={16} />
              </View>
              <Text style={styles.envelopeName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.envelopeValues}>
                <Text style={[styles.envelopeAmount, {
                  color: isOver ? COLORS.redText : isGasto ? COLORS.blueText : COLORS.green,
                }]}>
                  {formatAmount(displayAmount, item.currency)}
                </Text>
                <Text style={styles.envelopeSubtext}>
                  {isGasto 
                    ? (item.isUnlimited ? 'gastados' : (isOver ? 'excedidos' : 'disponibles')) 
                    : 'ahorrados'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEnvelope', { envelopeType: activeTab })}
      >
        <Text style={styles.fabText}>+ Crear Sobre</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  iconBtn: { padding: 8 },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.cardBg, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.tabActive },
  tabText: { color: COLORS.tabInactive, fontSize: 16, fontWeight: '600' },
  activeTabText: { color: COLORS.white },
  summaryCard: { backgroundColor: COLORS.cardBg, marginHorizontal: 20, borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  currencyBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#142E3D' },
  currencyText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  summaryValues: { alignItems: 'flex-end' },
  summaryLabel: { color: COLORS.secondaryText, fontSize: 13, marginBottom: 4 },
  summaryTotal: { color: COLORS.white, fontSize: 22, fontWeight: 'bold' },
  list: { paddingHorizontal: 20, paddingBottom: 120 },
  emptyText: { color: COLORS.secondaryText, fontSize: 15, textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
  envelopeCard: { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  envelopeName: { flex: 1, color: COLORS.white, fontSize: 16, fontWeight: '600' },
  envelopeValues: { alignItems: 'flex-end' },
  envelopeAmount: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  envelopeSubtext: { color: COLORS.secondaryText, fontSize: 12 },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: COLORS.green, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30 },
  fabText: { color: COLORS.bg, fontSize: 16, fontWeight: 'bold' },
});
