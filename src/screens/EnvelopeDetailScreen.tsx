import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft, RefreshCw, Edit2, Trash2, Calendar, X, ArrowLeftRight } from 'lucide-react-native';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { RootStackParamList } from '../navigation/types';
import { EnvelopeAvatar } from '../components/EnvelopeAvatar';
import { COLORS } from '../theme/colors';
import { SERIF_FONT } from '../theme/typography';
import { groupTransactionsByDay } from '../utils/transactionGrouping';

const PAGE_SIZE = 10;

type DialogState =
  | { type: 'reset' }
  | { type: 'deleteEnvelope' };

type Props = NativeStackScreenProps<RootStackParamList, 'EnvelopeDetail'>;

export const EnvelopeDetailScreen = ({ route, navigation }: Props) => {
  const { envelopeId } = route.params;
  const {
    envelopes, transactions,
    resetEnvelope, deleteEnvelope, deleteTransaction,
    getEnvelopeBalance, formatAmount,
    paymentMethods, categories,
  } = useAppData();

  const [dialog, setDialog] = useState<DialogState | null>(null);

  const envelope = envelopes.find(e => e.id === envelopeId);
  const envelopeTransactions = transactions.filter(t =>
    !t.isArchived && (
      t.envelopeId === envelopeId ||
      t.sourceSavingsEnvelopeId === envelopeId ||
      t.toEnvelopeId === envelopeId
    )
  );

  const periodKey = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const sortedTransactions = useMemo(
    () => [...envelopeTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [envelopeTransactions]
  );

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const periodLabel = (key: string) => {
    const [y, m] = key.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return capitalize(d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
  };

  const monthsByYear = useMemo(() => {
    const byYear = new Map<number, Map<string, string>>();
    sortedTransactions.forEach(t => {
      const d = new Date(t.date);
      const year = d.getFullYear();
      const key = periodKey(t.date);
      if (!byYear.has(year)) byYear.set(year, new Map());
      byYear.get(year)!.set(key, capitalize(d.toLocaleDateString('es-ES', { month: 'long' })));
    });
    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        months: Array.from(months.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([key, label]) => ({ key, label })),
      }));
  }, [sortedTransactions]);

  const [selectedPeriod, setSelectedPeriod] = useState(() => periodKey(new Date().toISOString()));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitPendingDelete = () => {
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }
    if (pendingDeleteId) {
      deleteTransaction(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  const handleSwipeDelete = (id: string) => {
    if (pendingDeleteId && pendingDeleteId !== id) {
      commitPendingDelete();
    }
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
    }
    setPendingDeleteId(id);
    deleteTimeoutRef.current = setTimeout(() => {
      deleteTransaction(id);
      setPendingDeleteId(null);
      deleteTimeoutRef.current = null;
    }, 4000);
  };

  const handleUndoDelete = () => {
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }
    setPendingDeleteId(null);
  };

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedPeriod]);

  const periodFiltered = useMemo(
    () => sortedTransactions.filter(t => periodKey(t.date) === selectedPeriod && t.id !== pendingDeleteId),
    [sortedTransactions, selectedPeriod, pendingDeleteId]
  );

  const totalPages = useMemo(
    () => Math.ceil(periodFiltered.length / PAGE_SIZE),
    [periodFiltered]
  );

  const visibleTransactions = useMemo(
    () => periodFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [periodFiltered, page]
  );

  const visibleSections = useMemo(
    () => groupTransactionsByDay(visibleTransactions),
    [visibleTransactions]
  );

  if (!envelope) return null;

  const type = envelope.type;
  const balance = getEnvelopeBalance(envelopeId);
  let remaining = balance;
  if (type === 'gasto') remaining = envelope.limit + balance;
  else if (type === 'deuda') remaining = envelope.limit - balance;
  const isOver = (type === 'gasto' || type === 'deuda') && !envelope.isUnlimited && remaining < 0;

  // Progress logic
  let progress = 0;
  let progressColor = COLORS.green;
  const iconColor = envelope.color;
  if (type === 'gasto') {
    if (envelope.isUnlimited) {
      progress = 1;
      progressColor = COLORS.blue;
    } else {
      const spent = -balance;
      progress = Math.max(0, spent / envelope.limit);
      progressColor = remaining < 0 ? COLORS.red : COLORS.green;
    }
  } else if (type === 'deuda') {
    if (envelope.isUnlimited) {
      progress = 1;
      progressColor = COLORS.blue;
    } else {
      // Progress fills as the debt is paid down (same direction as ahorro)
      progress = envelope.limit > 0 ? balance / envelope.limit : 1;
      progressColor = remaining < 0 ? COLORS.red : COLORS.green;
    }
  } else {
    progress = envelope.limit > 0 ? balance / envelope.limit : 1;
    progressColor = COLORS.green;
  }

  // Text Color
  let textColor = COLORS.white;
  if (remaining < 0) {
    textColor = COLORS.red;
  } else if (type === 'gasto' && remaining > 0) {
    textColor = COLORS.green;
  } else {
    textColor = COLORS.white;
  }

  const handleConfirm = async () => {
    if (!dialog) return;
    if (dialog.type === 'reset') {
      await resetEnvelope(envelopeId);
    } else if (dialog.type === 'deleteEnvelope') {
      await deleteEnvelope(envelopeId);
      navigation.goBack();
    }
    setDialog(null);
  };

  const getDialogProps = () => {
    if (!dialog) return { title: '', message: '' };
    if (dialog.type === 'reset') {
      return {
        title: 'Reiniciar sobre',
        message: 'Las transacciones actuales pasarán al historial y el saldo volverá a cero.',
        confirmLabel: 'Reiniciar',
      };
    }
    if (dialog.type === 'deleteEnvelope') {
      return {
        title: `Eliminar "${envelope.name}"`,
        message: 'Se eliminarán el sobre y todas sus transacciones. Esta acción no se puede deshacer.',
        confirmLabel: 'Eliminar',
      };
    }
    return { title: '', message: '' };
  };

  const dp = getDialogProps();

  return (
    <SafeAreaView style={styles.container}>
      <ConfirmDialog
        visible={!!dialog}
        title={dp.title}
        message={dp.message}
        confirmLabel={dp.confirmLabel ?? 'Confirmar'}
        destructive
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('CreateTransfer', { envelopeId })}
          >
            <ArrowLeftRight color={COLORS.secondaryText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('CreateEnvelope', { envelopeType: envelope.type, envelope })}
          >
            <Edit2 color={COLORS.secondaryText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setDialog({ type: 'reset' })}>
            <RefreshCw color={COLORS.secondaryText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setDialog({ type: 'deleteEnvelope' })}>
            <Trash2 color={COLORS.red} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.cardFlap} pointerEvents="none" />
        <View style={styles.cardHeader}>
          <View style={{ marginRight: 16 }}>
            <EnvelopeAvatar 
              icon={envelope.icon ?? 'box'} 
              imageUri={envelope.imageUri} 
              color={envelope.color} 
              size={56}
              progress={progress}
              progressColor={progressColor}
              iconColor={envelope.color}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{envelope.name}</Text>
            <Text style={styles.cardCurrency}>{envelope.currency}</Text>
          </View>
        </View>

        <View style={styles.budgetInfo}>
          {!envelope.isUnlimited ? (
            <View>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetAmount}>{formatAmount(envelope.limit, envelope.currency)}</Text>
                <Text style={styles.budgetLabel}>
                  {type === 'gasto' ? ' presupuesto' : type === 'deuda' ? ' deuda total' : ' meta'}
                </Text>
              </View>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetAmount}>
                  {formatAmount(
                    Math.abs(type === 'gasto' ? remaining : type === 'deuda' ? balance : (envelope.limit - balance)),
                    envelope.currency
                  )}
                </Text>
                <Text style={styles.budgetLabel}>
                  {type === 'gasto' ? ' disponibles' : type === 'deuda' ? ' pagado' : ' falta'}
                </Text>
              </View>
            </View>
          ):
          <Text style={styles.budgetLabel}>
            {type === 'gasto' ? 'Presupuesto ilimitado' : type === 'deuda' ? 'Deuda sin monto total definido' : 'Meta ilimitada'}
          </Text>
          }

          <View style={styles.availableWrapper}>
            <Text style={[styles.availableAmount, { color: textColor }]}>
              {formatAmount(Math.abs(remaining), envelope.currency)}
            </Text>
            <Text style={styles.availableLabel}>
              {type === 'gasto'
                ? (envelope.isUnlimited ? 'gastados' : (isOver ? 'excedidos' : 'disponibles'))
                : type === 'deuda'
                ? (envelope.isUnlimited ? 'adeudado' : (isOver ? 'excedido' : 'falta por pagar'))
                : 'ahorrados'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Transacciones</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, styles.filterPillActive]}
            onPress={() => setMonthPickerOpen(true)}
          >
            <Calendar color={COLORS.bg} size={16} />
            <Text style={[styles.filterPillText, styles.filterPillTextActive]}>
              {periodLabel(selectedPeriod)}
            </Text>
          </TouchableOpacity>
        </View>

        <Modal visible={monthPickerOpen} animationType="slide" onRequestClose={() => setMonthPickerOpen(false)}>
          <SafeAreaView style={styles.monthPickerContainer}>
            <View style={styles.monthPickerHeader}>
              <Text style={styles.monthPickerTitle}>Seleccione el mes que desea visualizar</Text>
              <TouchableOpacity onPress={() => setMonthPickerOpen(false)} style={styles.monthPickerClose}>
                <X color={COLORS.white} size={22} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {monthsByYear.length === 0 ? (
                <Text style={styles.emptyText}>Sin transacciones aún.</Text>
              ) : (
                monthsByYear.map(group => (
                  <View key={group.year} style={styles.yearGroup}>
                    <Text style={styles.yearLabel}>{group.year}</Text>
                    <View style={styles.monthGrid}>
                      {group.months.map(m => (
                        <TouchableOpacity
                          key={m.key}
                          style={[styles.monthCell, m.key === selectedPeriod && styles.monthCellActive]}
                          onPress={() => { setSelectedPeriod(m.key); setMonthPickerOpen(false); }}
                        >
                          <Text style={[styles.monthCellText, m.key === selectedPeriod && styles.monthCellTextActive]}>
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <SectionList
          sections={visibleSections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 110 }}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          ListEmptyComponent={
            sortedTransactions.length === 0 ? (
              <EmptyState
                message="Sin transacciones aún."
                ctaLabel="Agregar transacción"
                onPress={() => navigation.navigate('CreateTransaction', { envelopeId })}
              />
            ) : (
              <EmptyState message="No hay transacciones en este período." />
            )
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.pageBtn, n === page && styles.pageBtnActive]}
                    onPress={() => setPage(n)}
                  >
                    <Text style={[styles.pageBtnText, n === page && styles.pageBtnTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const pm = paymentMethods.find(p => p.id === item.paymentMethodId);
            const cat = categories.find(c => c.id === item.categoryId);
            const isTransfer = item.type === 'transfer';
            const isOutgoingTransfer = isTransfer && item.envelopeId === envelopeId;
            const otherEnvelopeId = isOutgoingTransfer ? item.toEnvelopeId : item.envelopeId;
            const otherEnvelopeName = envelopes.find(e => e.id === otherEnvelopeId)?.name ?? 'sobre eliminado';

            return (
              <Swipeable
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={() => handleSwipeDelete(item.id)}
                  >
                    <Trash2 color={COLORS.white} size={20} />
                  </TouchableOpacity>
                )}
              >
                <TouchableOpacity
                  style={styles.transactionItem}
                  disabled={isTransfer}
                  onPress={() => navigation.navigate('CreateTransaction', { envelopeId: item.envelopeId, transaction: item })}
                >
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionDesc}>{item.description}</Text>
                    <Text style={styles.transactionDate}>
                      {new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {cat ? ` · ${cat.name}` : ''}
                      {pm ? ` · ${pm.name}` : ''}
                      {item.sourceSavingsEnvelopeId ? ` · Pago desde ${envelopes.find(e => e.id === item.sourceSavingsEnvelopeId)?.name ?? 'ahorro'}` : ''}
                      {isTransfer ? (isOutgoingTransfer ? ` · → ${otherEnvelopeName}` : ` · ← ${otherEnvelopeName}`) : ''}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: isTransfer ? COLORS.blue : (item.type === 'expense' ? COLORS.red : ((type === 'gasto' || type === 'deuda') ? COLORS.green : COLORS.white)) },
                  ]}>
                    {isTransfer ? (isOutgoingTransfer ? '→ ' : '← ') : ''}{formatAmount(item.amount, envelope.currency)}
                  </Text>
                </TouchableOpacity>
              </Swipeable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.perforationDivider} />}
        />
      </View>

      {pendingDeleteId !== null && (
        <View style={styles.undoBanner}>
          <Text style={styles.undoText}>Transacción eliminada</Text>
          <TouchableOpacity onPress={handleUndoDelete}>
            <Text style={styles.undoBtnText}>Deshacer</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateTransaction', { envelopeId })}>
        <Text style={styles.fabText}>+ Nueva transacción</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  iconBtn: { padding: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  summaryCard: { backgroundColor: COLORS.cardBg, marginHorizontal: 20, borderRadius: 24, padding: 24, marginTop: 8, overflow: 'hidden' },
  cardFlap: { position: 'absolute', top: -20, left: '50%', width: 40, height: 40, marginLeft: -20, backgroundColor: COLORS.cardHighlight, transform: [{ rotate: '45deg' }] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', fontFamily: SERIF_FONT },
  cardCurrency: { color: COLORS.secondaryText, fontSize: 14, fontWeight: '600' },
  budgetInfo: {},
  budgetRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  budgetAmount: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', fontFamily: SERIF_FONT },
  budgetLabel: { color: COLORS.secondaryText, fontSize: 14 },
  availableWrapper: { alignItems: 'flex-end', marginTop: 12 },
  availableAmount: { fontSize: 32, fontWeight: 'bold', color: COLORS.white, fontFamily: SERIF_FONT },
  availableLabel: { color: COLORS.secondaryText, fontSize: 14 },
  transactionsSection: { flex: 1, marginTop: 28, paddingHorizontal: 20 },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 12, fontFamily: SERIF_FONT },
  sectionHeader: { color: COLORS.secondaryText, fontSize: 13, fontWeight: '700', backgroundColor: COLORS.bg, paddingTop: 12, paddingBottom: 6 },
  emptyText: { color: COLORS.secondaryText, fontSize: 15, fontStyle: 'italic' },
  transactionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  transactionLeft: { flex: 1, paddingRight: 12 },
  transactionDesc: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 3, fontFamily: SERIF_FONT },
  transactionDate: { color: COLORS.secondaryText, fontSize: 12 },
  transactionAmount: { fontSize: 15, fontWeight: '700' },
  perforationDivider: { borderTopWidth: 1, borderStyle: 'dotted', borderColor: COLORS.perforation },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  filterPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.cardBg, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12,
  },
  filterPillActive: { backgroundColor: COLORS.green },
  filterPillText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  filterPillTextActive: { color: COLORS.bg },
  monthPickerContainer: { flex: 1, backgroundColor: COLORS.bg },
  monthPickerHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20 },
  monthPickerTitle: { flex: 1, color: COLORS.white, fontSize: 20, fontWeight: '700', marginRight: 12 },
  monthPickerClose: { padding: 4 },
  yearGroup: { paddingHorizontal: 20, marginBottom: 20 },
  yearLabel: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  monthCell: {
    width: '47%', borderWidth: 1, borderColor: COLORS.divider, borderRadius: 12,
    paddingVertical: 18, alignItems: 'center', backgroundColor: COLORS.cardBg,
  },
  monthCellActive: { borderColor: COLORS.green, backgroundColor: COLORS.green },
  monthCellText: { color: COLORS.secondaryText, fontSize: 16 },
  monthCellTextActive: { color: COLORS.bg, fontWeight: '700' },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  pageBtn: { minWidth: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cardBg },
  pageBtnActive: { backgroundColor: COLORS.green },
  pageBtnText: { color: COLORS.secondaryText, fontSize: 14, fontWeight: '600' },
  pageBtnTextActive: { color: COLORS.bg },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: COLORS.green, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30 },
  fabText: { color: COLORS.bg, fontSize: 16, fontWeight: 'bold' },
  deleteAction: {
    backgroundColor: COLORS.red, justifyContent: 'center', alignItems: 'center',
    width: 72, height: '100%',
  },
  undoBanner: {
    position: 'absolute', left: 20, right: 20, bottom: 96,
    backgroundColor: '#1a3a4a', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  undoText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  undoBtnText: { color: COLORS.green, fontSize: 14, fontWeight: '700' },
});
