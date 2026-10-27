import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft, RefreshCw, Edit2, Trash2, Calendar, X, ArrowLeftRight, Paperclip } from 'lucide-react-native';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { RootStackParamList } from '../navigation/types';
import { EnvelopeAvatar } from '../components/EnvelopeAvatar';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { groupTransactionsByDay } from '../utils/transactionGrouping';
import { formatDebtCycle } from '../utils/recurrence';
import { getGoalDeadlineInfo } from '../utils/savingsGoal';
import { Transaction } from '../types';
import { ReceiptViewer } from '../components/ReceiptViewer';

const PAGE_SIZE = 10;

type DialogState =
  | { type: 'reset' }
  | { type: 'deleteEnvelope' };

type Props = NativeStackScreenProps<RootStackParamList, 'EnvelopeDetail'>;

export const EnvelopeDetailScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { t, locale } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
    return capitalize(d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }));
  };

  const monthsByYear = useMemo(() => {
    const byYear = new Map<number, Map<string, string>>();
    sortedTransactions.forEach(t => {
      const d = new Date(t.date);
      const year = d.getFullYear();
      const key = periodKey(t.date);
      if (!byYear.has(year)) byYear.set(year, new Map());
      byYear.get(year)!.set(key, capitalize(d.toLocaleDateString(locale, { month: 'long' })));
    });
    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        months: Array.from(months.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([key, label]) => ({ key, label })),
      }));
  }, [sortedTransactions, locale]);

  const [selectedPeriod, setSelectedPeriod] = useState(() => periodKey(new Date().toISOString()));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [receiptsToView, setReceiptsToView] = useState<string[]>([]);
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
    () => groupTransactionsByDay(visibleTransactions, locale),
    [visibleTransactions, locale]
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
  let progressColor = colors.green;
  const iconColor = envelope.color;
  if (type === 'gasto') {
    if (envelope.isUnlimited) {
      progress = 1;
      progressColor = colors.blue;
    } else {
      const spent = -balance;
      progress = Math.max(0, spent / envelope.limit);
      progressColor = remaining < 0 ? colors.red : colors.green;
    }
  } else if (type === 'deuda') {
    if (envelope.isUnlimited) {
      progress = 1;
      progressColor = colors.blue;
    } else {
      // Progress fills as the debt is paid down (same direction as ahorro)
      progress = envelope.limit > 0 ? balance / envelope.limit : 1;
      progressColor = remaining < 0 ? colors.red : colors.green;
    }
  } else {
    progress = envelope.limit > 0 ? balance / envelope.limit : 1;
    progressColor = colors.green;
  }

  // Text Color
  let textColor = colors.white;
  if (remaining < 0) {
    textColor = colors.red;
  } else if (type === 'gasto' && remaining > 0) {
    textColor = colors.green;
  } else {
    textColor = colors.white;
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
        title: t('detail.resetTitle'),
        message: t('detail.resetMessage'),
        confirmLabel: t('detail.resetConfirm'),
      };
    }
    if (dialog.type === 'deleteEnvelope') {
      return {
        title: t('common.deleteNamed', { name: envelope.name }),
        message: t('detail.deleteMessage'),
        confirmLabel: t('common.delete'),
      };
    }
    return { title: '', message: '' };
  };

  const dp = getDialogProps();

  return (
    <SafeAreaView style={styles.container}>
      <ReceiptViewer uris={receiptsToView} onClose={() => setReceiptsToView([])} />
      <ConfirmDialog
        visible={!!dialog}
        title={dp.title}
        message={dp.message}
        confirmLabel={dp.confirmLabel ?? t('common.confirm')}
        destructive
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => navigation.navigate('CreateTransfer', { envelopeId })}
          >
            <ArrowLeftRight color={colors.secondaryText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => navigation.navigate('CreateEnvelope', { envelopeType: envelope.type, envelope })}
          >
            <Edit2 color={colors.secondaryText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setDialog({ type: 'reset' })}>
            <RefreshCw color={colors.secondaryText} size={20} />
          </TouchableOpacity>
          <View style={styles.headerDivider} />
          <TouchableOpacity style={[styles.iconBtn, styles.deleteIconBtn]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setDialog({ type: 'deleteEnvelope' })}>
            <Trash2 color={colors.red} size={20} />
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
                  {t(type === 'gasto' ? 'detail.budgetLabel' : type === 'deuda' ? 'detail.debtTotalLabel' : 'detail.goalLabel')}
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
                  {t(type === 'gasto' ? 'detail.availableLabel' : type === 'deuda' ? 'detail.paidLabel' : 'detail.missingLabel')}
                </Text>
              </View>
            </View>
          ):
          <Text style={styles.budgetLabel}>
            {t(type === 'gasto' ? 'detail.unlimitedBudget' : type === 'deuda' ? 'detail.unlimitedDebt' : 'detail.unlimitedGoal')}
          </Text>
          }

          <View style={styles.availableWrapper}>
            <Text style={[styles.availableAmount, { color: textColor }]}>
              {formatAmount(Math.abs(remaining), envelope.currency)}
            </Text>
            <Text style={styles.availableLabel}>
              {type === 'gasto'
                ? t(envelope.isUnlimited ? 'main.spent' : (isOver ? 'main.exceeded' : 'main.available'))
                : type === 'deuda'
                ? t(envelope.isUnlimited ? 'main.owed' : (isOver ? 'main.debtExceeded' : 'main.remainingToPay'))
                : t('main.saved')}
            </Text>
          </View>
        </View>

        {type === 'ahorro' && !envelope.isUnlimited && envelope.goalDeadline ? (() => {
          const info = getGoalDeadlineInfo(envelope.goalDeadline, envelope.limit, balance);
          return (
            <View style={styles.debtDetails}>
              <Text style={styles.debtDetailText}>
                {t('detail.goalDeadline', { date: new Date(envelope.goalDeadline).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) })}
              </Text>
              {info.missing === 0 ? (
                <Text style={styles.debtDetailText}>{t('detail.goalReached')}</Text>
              ) : info.isOverdue ? (
                <Text style={[styles.debtDetailText, { color: colors.red }]}>{t('detail.goalOverdue', { days: -info.daysLeft })}</Text>
              ) : (
                <>
                  <Text style={styles.debtDetailText}>{t('detail.goalDaysLeft', { days: info.daysLeft })}</Text>
                  <Text style={styles.debtDetailText}>{t('detail.goalPerMonth', { amount: formatAmount(info.perMonth ?? 0, envelope.currency) })}</Text>
                </>
              )}
            </View>
          );
        })() : null}

        {type === 'deuda' && !envelope.isUnlimited && (envelope.interestRate || envelope.minimumPayment || envelope.dueDay) ? (
          <View style={styles.debtDetails}>
            {envelope.interestRate && envelope.interestFrequency ? (
              <Text style={styles.debtDetailText}>
                {t('detail.interest', {
                  rate: envelope.interestRate,
                  cycle: formatDebtCycle({
                    interestFrequency: envelope.interestFrequency,
                    dueDay: envelope.dueDay ?? 1,
                    dueAnchorMonth: envelope.dueAnchorMonth,
                  }, t),
                })}
              </Text>
            ) : null}
            {envelope.minimumPayment ? (
              <Text style={styles.debtDetailText}>
                {t('detail.minimumPayment', { amount: formatAmount(envelope.minimumPayment, envelope.currency) })}
              </Text>
            ) : null}
            {envelope.dueDay && !envelope.interestRate ? (
              <Text style={styles.debtDetailText}>{t('detail.dueDay', { day: envelope.dueDay })}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>{t('detail.transactions')}</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, styles.filterPillActive]}
            onPress={() => setMonthPickerOpen(true)}
          >
            <Calendar color={colors.bg} size={16} />
            <Text style={[styles.filterPillText, styles.filterPillTextActive]}>
              {periodLabel(selectedPeriod)}
            </Text>
          </TouchableOpacity>
        </View>

        <Modal visible={monthPickerOpen} animationType="slide" onRequestClose={() => setMonthPickerOpen(false)}>
          <SafeAreaView style={styles.monthPickerContainer}>
            <View style={styles.monthPickerHeader}>
              <Text style={styles.monthPickerTitle}>{t('detail.pickMonth')}</Text>
              <TouchableOpacity onPress={() => setMonthPickerOpen(false)} style={styles.monthPickerClose}>
                <X color={colors.white} size={22} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {monthsByYear.length === 0 ? (
                <Text style={styles.emptyText}>{t('detail.noTransactionsYet')}</Text>
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

        <SectionList<Transaction>
          sections={visibleSections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 110 }}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          ListEmptyComponent={
            sortedTransactions.length === 0 ? (
              <EmptyState message={t('detail.noTransactionsYet')} />
            ) : (
              <EmptyState message={t('detail.noTransactionsPeriod')} />
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
            const otherEnvelopeName = envelopes.find(e => e.id === otherEnvelopeId)?.name ?? t('detail.deletedEnvelopeLower');

            return (
              <Swipeable
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={() => handleSwipeDelete(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('detail.deleteTransaction')}
                  >
                    <View style={styles.deleteActionButton}>
                      <Trash2 color={colors.white} size={19} />
                    </View>
                  </TouchableOpacity>
                )}
              >
                <TouchableOpacity
                  style={styles.transactionItem}
                  onPress={() => (
                    isTransfer
                      ? navigation.navigate('CreateTransfer', { envelopeId: item.envelopeId, transaction: item })
                      : navigation.navigate('CreateTransaction', { envelopeId: item.envelopeId, transaction: item })
                  )}
                >
                  <View style={styles.transactionLeft}>
                    <View style={styles.descRow}>
                      <Text style={[styles.transactionDesc, { flexShrink: 1 }]}>{item.description}</Text>
                      {item.receiptUris && item.receiptUris.length > 0 ? (
                        <TouchableOpacity onPress={() => setReceiptsToView(item.receiptUris ?? [])} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={t('receipt.view')}>
                          <Paperclip color={colors.secondaryText} size={14} />
                          {item.receiptUris.length > 1 ? <Text style={styles.receiptCount}>{item.receiptUris.length}</Text> : null}
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <Text style={styles.transactionDate}>
                      {[
                        cat?.name,
                        pm?.name,
                        item.sourceSavingsEnvelopeId ? t('detail.paymentFrom', { name: envelopes.find(e => e.id === item.sourceSavingsEnvelopeId)?.name ?? t('detail.savingsFallback') }) : null,
                        isTransfer ? `${isOutgoingTransfer ? '→' : '←'} ${otherEnvelopeName}` : null,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                    {item.notes ? <Text style={styles.transactionNotes} numberOfLines={2}>{item.notes}</Text> : null}
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: isTransfer ? colors.blue : (item.type === 'expense' ? colors.red : ((type === 'gasto' || type === 'deuda') ? colors.green : colors.white)) },
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
          <Text style={styles.undoText}>{t('detail.transactionDeleted')}</Text>
          <TouchableOpacity onPress={handleUndoDelete}>
            <Text style={styles.undoBtnText}>{t('detail.undo')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateTransaction', { envelopeId })}>
        <Text style={styles.fabText}>{t('detail.newTransaction')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  receiptCount: { color: colors.secondaryText, fontSize: 12, marginLeft: 2 },
  transactionNotes: { color: colors.secondaryText, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  descRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  iconBtn: { padding: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerDivider: { width: 1, height: 20, backgroundColor: colors.divider, marginHorizontal: 6 },
  deleteIconBtn: { marginLeft: 2 },
  summaryCard: { backgroundColor: colors.cardBg, marginHorizontal: 20, borderRadius: 24, padding: 24, marginTop: 8, overflow: 'hidden' },
  cardFlap: { position: 'absolute', top: -20, left: '50%', width: 40, height: 40, marginLeft: -20, backgroundColor: colors.cardHighlight, transform: [{ rotate: '45deg' }] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  cardCurrency: { color: colors.secondaryText, fontSize: 14, fontWeight: '600' },
  budgetInfo: {},
  budgetRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  budgetAmount: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  budgetLabel: { color: colors.secondaryText, fontSize: 14 },
  availableWrapper: { alignItems: 'flex-end', marginTop: 12 },
  availableAmount: { fontSize: 32, fontWeight: 'bold', color: colors.white },
  availableLabel: { color: colors.secondaryText, fontSize: 14 },
  debtDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.divider, gap: 4 },
  debtDetailText: { color: colors.secondaryText, fontSize: 13 },
  transactionsSection: { flex: 1, marginTop: 28, paddingHorizontal: 20 },
  sectionTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  sectionHeader: { color: colors.secondaryText, fontSize: 13, fontWeight: '700', backgroundColor: colors.bg, paddingTop: 12, paddingBottom: 6 },
  emptyText: { color: colors.secondaryText, fontSize: 15, fontStyle: 'italic', textAlign: 'center' },
  transactionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  transactionLeft: { flex: 1, paddingRight: 12 },
  transactionDesc: { color: colors.white, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  transactionDate: { color: colors.secondaryText, fontSize: 12 },
  transactionAmount: { fontSize: 15, fontWeight: '700' },
  perforationDivider: { borderTopWidth: 1, borderStyle: 'dotted', borderColor: colors.perforation },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  filterPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.cardBg, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12,
  },
  filterPillActive: { backgroundColor: colors.green },
  filterPillText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  filterPillTextActive: { color: colors.bg },
  monthPickerContainer: { flex: 1, backgroundColor: colors.bg },
  monthPickerHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20 },
  monthPickerTitle: { flex: 1, color: colors.white, fontSize: 20, fontWeight: '700', marginRight: 12 },
  monthPickerClose: { padding: 4 },
  yearGroup: { paddingHorizontal: 20, marginBottom: 20 },
  yearLabel: { color: colors.white, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  monthCell: {
    width: '47%', borderWidth: 1, borderColor: colors.divider, borderRadius: 12,
    paddingVertical: 18, alignItems: 'center', backgroundColor: colors.cardBg,
  },
  monthCellActive: { borderColor: colors.green, backgroundColor: colors.green },
  monthCellText: { color: colors.secondaryText, fontSize: 16 },
  monthCellTextActive: { color: colors.bg, fontWeight: '700' },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  pageBtn: { minWidth: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardBg },
  pageBtnActive: { backgroundColor: colors.green },
  pageBtnText: { color: colors.secondaryText, fontSize: 14, fontWeight: '600' },
  pageBtnTextActive: { color: colors.bg },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: colors.green, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30 },
  fabText: { color: colors.bg, fontSize: 16, fontWeight: 'bold' },
  deleteAction: {
    justifyContent: 'center', alignItems: 'center', width: 64, height: '100%',
  },
  deleteActionButton: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: colors.red,
    justifyContent: 'center', alignItems: 'center',
  },
  undoBanner: {
    position: 'absolute', left: 20, right: 20, bottom: 96,
    backgroundColor: colors.modalSheet, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  undoText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  undoBtnText: { color: colors.green, fontSize: 14, fontWeight: '700' },
});
