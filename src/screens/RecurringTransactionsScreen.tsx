import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft, Plus, Trash2, Pause, Play } from 'lucide-react-native';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { RecurringTransactionTemplate } from '../types';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Recurring'>;

export const RecurringTransactionsScreen = ({ navigation }: Props) => {
  const { recurringTemplates, envelopes, updateRecurringTemplate, deleteRecurringTemplate, formatAmount } = useAppData();
  const [templateToDelete, setTemplateToDelete] = useState<RecurringTransactionTemplate | null>(null);

  const handleToggleActive = async (template: RecurringTransactionTemplate) => {
    await updateRecurringTemplate(template.id, { isActive: !template.isActive });
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    await deleteRecurringTemplate(templateToDelete.id);
    setTemplateToDelete(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recurrentes</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={recurringTemplates}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            message="No tienes transacciones recurrentes todavía."
            ctaLabel="Nueva plantilla"
            onPress={() => navigation.navigate('CreateRecurringTransaction', {})}
          />
        }
        renderItem={({ item }) => {
          const envelope = envelopes.find(e => e.id === item.envelopeId);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => handleToggleActive(item)}
            >
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle}>{envelope?.name ?? 'Sobre eliminado'}</Text>
                <Text style={styles.cardSubtitle}>
                  {formatAmount(item.amount, envelope?.currency ?? 'CRC')} · Día {item.dayOfMonth}
                </Text>
                <Text style={[styles.statusText, item.isActive ? styles.statusActive : styles.statusPaused]}>
                  {item.isActive ? 'Activo' : 'Pausado'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => handleToggleActive(item)}
              >
                {item.isActive ? (
                  <Pause color={COLORS.secondaryText} size={20} />
                ) : (
                  <Play color={COLORS.green} size={20} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setTemplateToDelete(item)}
              >
                <Trash2 color={COLORS.red} size={20} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreateRecurringTransaction', {})}
      >
        <Plus color={COLORS.bg} size={20} />
        <Text style={styles.fabText}>Nueva plantilla</Text>
      </TouchableOpacity>

      <ConfirmDialog
        visible={!!templateToDelete}
        title="Eliminar plantilla"
        message={templateToDelete ? `¿Eliminar la plantilla recurrente "${templateToDelete.description}"? Las transacciones ya generadas no se verán afectadas.` : ''}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setTemplateToDelete(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyText: { color: COLORS.secondaryText, fontSize: 15, textAlign: 'center', marginTop: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg,
    borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.divider,
  },
  cardMain: { flex: 1 },
  cardTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { color: COLORS.secondaryText, fontSize: 14, marginBottom: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusActive: { color: COLORS.green },
  statusPaused: { color: COLORS.secondaryText },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.green, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 22,
  },
  fabText: { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
});
