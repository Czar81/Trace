import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft, RefreshCw, Edit2, Trash2 } from 'lucide-react-native';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Transaction } from '../types';
import { EnvelopeAvatar } from '../components/EnvelopeAvatar';

const COLORS = {
  bg: '#092230',
  cardBg: '#1F3A47',
  green: '#A7E7B4',
  redText: '#E55B5B',
  blueText: '#52A8D9',
  white: '#FFFFFF',
  secondaryText: '#A6B9C7',
  divider: '#142E3D',
};

type DialogState =
  | { type: 'reset' }
  | { type: 'deleteEnvelope' }
  | { type: 'deleteTransaction'; transaction: Transaction };

export const EnvelopeDetailScreen = ({ route, navigation }: any) => {
  const { envelopeId } = route.params;
  const {
    envelopes, transactions,
    resetEnvelope, deleteEnvelope, deleteTransaction,
    getEnvelopeBalance, formatAmount,
    paymentMethods, categories,
  } = useAppData();

  const [dialog, setDialog] = useState<DialogState | null>(null);

  const envelope = envelopes.find(e => e.id === envelopeId);
  const envelopeTransactions = transactions.filter(t => t.envelopeId === envelopeId && !t.isArchived);

  if (!envelope) return null;

  const isGasto = envelope.type === 'gasto';
  const balance = getEnvelopeBalance(envelopeId);
  const remaining = isGasto ? envelope.limit + balance : balance;
  const isOver = isGasto && !envelope.isUnlimited && remaining < 0;

  // Progress logic
  let progress = 0;
  let progressColor = COLORS.green;
  let iconColor = envelope.color;
  if (isGasto) {
    if (envelope.isUnlimited) {
      progress = 1;
      progressColor = COLORS.blueText;
    } else {
      const spent = -balance;
      progress = Math.max(0, spent / envelope.limit);
      progressColor = remaining < 0 ? COLORS.redText : COLORS.green;
    }
  } else {
    progress = envelope.limit > 0 ? balance / envelope.limit : 1;
    progressColor = COLORS.green;
  }

  // Text Color
  let textColor = COLORS.white;
  if (remaining < 0) {
    textColor = COLORS.redText;
  } else if (isGasto && remaining > 0) {
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
    } else if (dialog.type === 'deleteTransaction') {
      await deleteTransaction(dialog.transaction.id);
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
    if (dialog.type === 'deleteTransaction') {
      return {
        title: 'Eliminar transacción',
        message: `¿Eliminar "${dialog.transaction.description}"?`,
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
            onPress={() => navigation.navigate('CreateEnvelope', { envelopeType: envelope.type, envelope })}
          >
            <Edit2 color={COLORS.secondaryText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setDialog({ type: 'reset' })}>
            <RefreshCw color={COLORS.secondaryText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setDialog({ type: 'deleteEnvelope' })}>
            <Trash2 color={COLORS.redText} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryCard}>
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
                  {isGasto ? ' presupuesto' : ' meta'}
                </Text>
              </View>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetAmount}>
                  {formatAmount(
                    Math.abs(isGasto ? remaining : (envelope.limit - balance)),
                    envelope.currency
                  )}
                </Text>
                <Text style={styles.budgetLabel}>
                  {isGasto ? ' disponibles' : ' falta'}
                </Text>
              </View>
            </View>
          ):
          <Text style={styles.budgetLabel}>
            {isGasto ? 'Presupuesto ilimitado' : 'Meta ilimitada'}
          </Text>
          }
          
          <View style={styles.availableWrapper}>
            <Text style={[styles.availableAmount, { color: textColor }]}>
              {formatAmount(Math.abs(remaining), envelope.currency)}
            </Text>
            <Text style={styles.availableLabel}>
              {isGasto ? (envelope.isUnlimited ? 'gastados' : (isOver ? 'excedidos' : 'disponibles')) : 'ahorrados'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Transacciones recientes</Text>
        <FlatList
          data={envelopeTransactions}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 110 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Sin transacciones aún.</Text>}
          renderItem={({ item }) => {
            const pm = paymentMethods.find(p => p.id === item.paymentMethodId);
            const cat = categories.find(c => c.id === item.categoryId);
            return (
              <TouchableOpacity
                style={styles.transactionItem}
                onPress={() => navigation.navigate('CreateTransaction', { envelopeId, transaction: item })}
                onLongPress={() => setDialog({ type: 'deleteTransaction', transaction: item })}
              >
                <View style={styles.transactionLeft}>
                  <Text style={styles.transactionDesc}>{item.description}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {cat ? ` · ${cat.name}` : ''}
                    {pm ? ` · ${pm.name}` : ''}
                  </Text>
                </View>
                <Text style={[styles.transactionAmount, { color: item.type === 'expense' ? COLORS.redText : (isGasto ? COLORS.green : COLORS.white) }]}>
                  {formatAmount(item.amount, envelope.currency)}
                </Text>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>

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
  summaryCard: { backgroundColor: COLORS.cardBg, marginHorizontal: 20, borderRadius: 24, padding: 24, marginTop: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  cardCurrency: { color: COLORS.secondaryText, fontSize: 14, fontWeight: '600' },
  budgetInfo: {},
  budgetRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  budgetAmount: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  budgetLabel: { color: COLORS.secondaryText, fontSize: 14 },
  availableWrapper: { alignItems: 'flex-end', marginTop: 12 },
  availableAmount: { fontSize: 32, fontWeight: 'bold', color: COLORS.white },
  availableLabel: { color: COLORS.secondaryText, fontSize: 14 },
  transactionsSection: { flex: 1, marginTop: 28, paddingHorizontal: 20 },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: COLORS.secondaryText, fontSize: 15, fontStyle: 'italic' },
  transactionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  transactionLeft: { flex: 1, paddingRight: 12 },
  transactionDesc: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  transactionDate: { color: COLORS.secondaryText, fontSize: 12 },
  transactionAmount: { fontSize: 15, fontWeight: '700' },
  separator: { height: 1, backgroundColor: COLORS.divider },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: COLORS.green, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30 },
  fabText: { color: COLORS.bg, fontSize: 16, fontWeight: 'bold' },
});
