import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../context/ExpenseContext';
import { EnvelopeType, Currency, Envelope } from '../types';
import { Settings, MoreVertical, Download, RefreshCw, Upload } from 'lucide-react-native';
import { EnvelopeAvatar } from '../components/EnvelopeAvatar';
import { ActionMenu, ActionMenuItem } from '../components/ActionMenu';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { exportDataToCSV } from '../utils/exportData';

const { width } = Dimensions.get('window');

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

const SYMBOLS: Record<Currency, string> = { CRC: '₡', USD: '$', EUR: '€' };
const CURRENCY_CYCLE: Currency[] = ['CRC', 'USD', 'EUR'];

export const MainScreen = ({ navigation }: any) => {
  const { envelopes, getTotalByType, getEnvelopeBalance, formatAmount, settings, convertToCRC, resetAllEnvelopes, paymentMethods, categories, transactions, importFromCSV } = useAppData();
  const [activeTab, setActiveTab] = useState<EnvelopeType>('gasto');
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(settings.defaultCurrency);
  const [showMenu, setShowMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList>(null);

  const handleTabPress = (tab: EnvelopeType) => {
    const index = tab === 'gasto' ? 0 : 1;
    setActiveTab(tab);
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumScrollEnd = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setActiveTab(index === 0 ? 'gasto' : 'ahorro');
  };

  const onScrollEndDrag = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    if (index !== (activeTab === 'gasto' ? 0 : 1)) {
      setActiveTab(index === 0 ? 'gasto' : 'ahorro');
    }
  };

  const totalCRC = getTotalByType(activeTab);
  const totalDisplay = convertDisplayTotal(totalCRC, displayCurrency, settings.exchangeRates);

  function convertDisplayTotal(crc: number, to: Currency, rates: { USD_TO_CRC: number; EUR_TO_CRC: number }): string {
    let amount = crc;
    if (to === 'USD') amount = crc / rates.USD_TO_CRC;
    else if (to === 'EUR') amount = crc / rates.EUR_TO_CRC;
    const sym = SYMBOLS[to];
    const abs = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sym}${abs}`;
  }

  const cycleCurrency = () => {
    const idx = CURRENCY_CYCLE.indexOf(displayCurrency);
    setDisplayCurrency(CURRENCY_CYCLE[(idx + 1) % CURRENCY_CYCLE.length]);
  };

  const handleImport = async () => {
    const result = await importFromCSV();
    Alert.alert(
      result.success ? 'Importación exitosa' : 'Error en importación',
      result.message,
      [{ text: 'OK' }]
    );
  };

  const menuItems: ActionMenuItem[] = [
    { label: 'Ajustes', icon: <Settings color={COLORS.secondaryText} size={20} />, onPress: () => navigation.navigate('Settings') },
    { label: 'Importar CSV', icon: <Upload color={COLORS.secondaryText} size={20} />, onPress: handleImport },
    { label: 'Exportar a CSV', icon: <Download color={COLORS.secondaryText} size={20} />, onPress: () => exportDataToCSV(envelopes, transactions, paymentMethods, categories) },
    { label: 'Reiniciar todos los sobres', icon: <RefreshCw color={COLORS.redText} size={20} />, destructive: true, onPress: () => setShowResetConfirm(true) },
  ];

  const renderEnvelope = ({ item }: { item: Envelope }) => {
    const balance = getEnvelopeBalance(item.id);
    const isGasto = item.type === 'gasto';
    
    // Balance available logic
    const remaining = isGasto ? item.limit + balance : balance;
    const isOver = isGasto && !item.isUnlimited && remaining < 0;
    
    // 1. Balance Text Color
    let textColor = COLORS.white;
    if (remaining < 0) {
      textColor = COLORS.redText;
    } else if (isGasto && remaining > 0) {
      textColor = COLORS.green;
    } else {
      textColor = COLORS.white;
    }

    // 2. Progress Circle Logic
    let progress = 0;
    let progressColor = COLORS.green;

    if (isGasto) {
      if (item.isUnlimited) {
        progress = 1;
        progressColor = COLORS.blueText;
      } else {
        // Spent / Limit
        const spent = -balance; 
        progress = Math.max(0, spent / item.limit);
        progressColor = remaining < 0 ? COLORS.redText : COLORS.green;
      }
    } else {
      // Savings
      progress = item.limit > 0 ? balance / item.limit : 1;
      progressColor = COLORS.green;
    }

    return (
      <TouchableOpacity
        style={styles.envelopeCard}
        onPress={() => navigation.navigate('EnvelopeDetail', { envelopeId: item.id })}
      >
        <View style={{ marginRight: 16 }}>
          <EnvelopeAvatar 
            icon={item.icon ?? 'box'} 
            imageUri={item.imageUri} 
            color={item.color} 
            size={52} 
            progress={progress}
            progressColor={progressColor}
            iconColor={item.color}
          />
        </View>
        <Text style={styles.envelopeName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.envelopeValues}>
          <Text style={[styles.envelopeAmount, { color: textColor }]}>
            {formatAmount(Math.abs(remaining), item.currency)}
          </Text>
          <Text style={styles.envelopeSubtext}>
            {isGasto 
              ? (item.isUnlimited ? 'gastados' : (isOver ? 'excedidos' : 'disponibles')) 
              : 'ahorrados'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (type: EnvelopeType) => {
    const data = envelopes.filter(e => e.type === type);
    return (
      <View style={{ width, flex: 1 }}>
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No hay sobres. Toca "+ Crear Sobre" para comenzar.
            </Text>
          }
          renderItem={renderEnvelope}
        />
      </View>
    );
  };

  const translateX = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [0, (width - 40) / 2],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ActionMenu visible={showMenu} items={menuItems} onClose={() => setShowMenu(false)} />
      <ConfirmDialog
        visible={showResetConfirm}
        onConfirm={async () => { await resetAllEnvelopes(); setShowResetConfirm(false); }}
        onCancel={() => setShowResetConfirm(false)}
        title="Reiniciar todos los sobres"
        message="Todas las transacciones actuales pasarán al historial y el saldo de todos los sobres volverá a cero."
        confirmLabel="Reiniciar Todo"
        destructive
      />

      <View style={styles.header}>
        <Text style={styles.title}>TRACE</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowMenu(true)}>
          <MoreVertical color={COLORS.secondaryText} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <Animated.View style={[styles.tabIndicator, { width: (width - 40) / 2, transform: [{ translateX }] }]} />
        <TouchableOpacity style={styles.tab} onPress={() => handleTabPress('gasto')}>
          <Text style={[styles.tabText, activeTab === 'gasto' && styles.activeTabText]}>Gastos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => handleTabPress('ahorro')}>
          <Text style={[styles.tabText, activeTab === 'ahorro' && styles.activeTabText]}>Ahorros</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
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

      <FlatList
        ref={listRef}
        data={['gasto', 'ahorro'] as EnvelopeType[]}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        keyExtractor={item => item}
        renderItem={({ item }) => renderSection(item)}
      />

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
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, height: 48, position: 'relative', marginBottom: 16 },
  tab: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabIndicator: { position: 'absolute', bottom: 0, height: 2, backgroundColor: COLORS.tabActive, borderRadius: 1 },
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
  envelopeCard: { backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  envelopeName: { flex: 1, color: COLORS.white, fontSize: 17, fontWeight: '600' },
  envelopeValues: { alignItems: 'flex-end' },
  envelopeAmount: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  envelopeSubtext: { color: COLORS.secondaryText, fontSize: 13 },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: COLORS.green, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30 },
  fabText: { color: COLORS.bg, fontSize: 16, fontWeight: 'bold' },
});
