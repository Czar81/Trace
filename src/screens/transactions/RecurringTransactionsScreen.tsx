import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../../context/ExpenseContext';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Plus from 'lucide-react-native/icons/plus';
import Trash2 from 'lucide-react-native/icons/trash-2';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { HelpButton } from '../../components/feedback/HelpButton';
import { RecurringTransactionTemplate } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { formatCadence } from '../../domain/recurring/recurrence';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Recurring'>;

export const RecurringTransactionsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('recurring.title')}</Text>
        <HelpButton title="help.recurring.title" body="help.recurring.body" style={{ width: 32, alignItems: 'center' }} />
      </View>

      <FlatList
        data={recurringTemplates}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            message={t('recurring.empty')}
            ctaLabel={t('recurring.emptyCta')}
            onPress={() => navigation.navigate('CreateRecurringTransaction', {})}
          />
        }
        renderItem={({ item }) => {
          const envelope = envelopes.find(e => e.id === item.envelopeId);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('CreateRecurringTransaction', { template: item })}
            >
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle}>{envelope?.name ?? t('common.deletedEnvelope')}</Text>
                <Text style={styles.cardSubtitle}>
                  {formatAmount(item.amount, envelope?.currency ?? 'CRC')} · {formatCadence(item, t)}
                </Text>
                <Text style={[styles.statusText, item.isActive ? styles.statusActive : styles.statusPaused]}>
                  {item.isActive ? t('recurring.active') : t('recurring.paused')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => handleToggleActive(item)}
                accessibilityRole="button"
                accessibilityLabel={item.isActive ? t('a11y.pause') : t('a11y.resume')}
              >
                {item.isActive ? (
                  <Pause color={colors.secondaryText} size={20} />
                ) : (
                  <Play color={colors.green} size={20} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setTemplateToDelete(item)}
                accessibilityRole="button"
                accessibilityLabel={t('recurring.deleteTitle')}
              >
                <Trash2 color={colors.red} size={20} />
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
        <Plus color={colors.bg} size={20} />
        <Text style={styles.fabText}>{t('recurring.newTemplate')}</Text>
      </TouchableOpacity>

      <ConfirmDialog
        visible={!!templateToDelete}
        title={t('recurring.deleteTitle')}
        message={templateToDelete ? t('recurring.deleteMessage', { name: templateToDelete.description }) : ''}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setTemplateToDelete(null)}
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: FONT_SIZE.xxl, fontWeight: 'bold' },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
  emptyText: { color: colors.secondaryText, fontSize: FONT_SIZE.base, textAlign: 'center', marginTop: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg,
    borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: 14, borderWidth: 1, borderColor: colors.divider,
  },
  cardMain: { flex: 1 },
  cardTitle: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '700', marginBottom: SPACING.xs },
  cardSubtitle: { color: colors.secondaryText, fontSize: FONT_SIZE.md, marginBottom: 6 },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  statusActive: { color: colors.green },
  statusPaused: { color: colors.secondaryText },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.xs },
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: colors.green, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 22,
  },
  fabText: { color: colors.bg, fontSize: FONT_SIZE.base, fontWeight: '700' },
});
