import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Trash2, Plus } from 'lucide-react-native';
import { ConfirmDialog } from '../feedback/ConfirmDialog';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

interface ListItem {
  id: string;
  name: string;
}

export interface ListSectionConfig {
  groupTitle?: string;
  existingSectionTitle: string;
  addSectionTitle: string;
  addPlaceholder: string;
  items: ListItem[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface SimpleListSettingsScreenProps {
  navigation: any;
  title: string;
  deleteConfirmMessage?: string;
  /** Extra lists rendered after the main one, each under its own group title. */
  extraSections?: ListSectionConfig[];
  /** Title shown above the main list; only used together with extraSections. */
  groupTitle?: string;
  existingSectionTitle: string;
  addSectionTitle: string;
  addPlaceholder: string;
  items: ListItem[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface PendingDelete {
  id: string;
  name: string;
  onDelete: (id: string) => Promise<void>;
}

const ListSection: React.FC<ListSectionConfig & { onRequestDelete: (p: PendingDelete) => void; styles: ReturnType<typeof makeStyles>; }> = ({
  groupTitle, existingSectionTitle, addSectionTitle, addPlaceholder, items, onAdd, onDelete, onRequestDelete, styles,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [newItemName, setNewItemName] = useState('');

  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    await onAdd(newItemName.trim());
    setNewItemName('');
  };

  return (
    <>
      {groupTitle ? <Text style={styles.groupTitle}>{groupTitle}</Text> : null}
      <Text style={styles.sectionTitle}>{existingSectionTitle}</Text>
      {items.map(item => (
        <View key={item.id} style={styles.listItem}>
          <Text style={styles.listItemText}>{item.name}</Text>
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 16, right: 10 }}
            onPress={() => onRequestDelete({ id: item.id, name: item.name, onDelete })}
            accessibilityRole="button"
            accessibilityLabel={t('common.deleteNamed', { name: item.name })}
          >
            <Trash2 color={colors.red} size={20} />
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.sectionTitle}>{addSectionTitle}</Text>
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0, marginRight: SPACING.md }]}
          value={newItemName}
          onChangeText={setNewItemName}
          placeholder={addPlaceholder}
          placeholderTextColor={colors.secondaryText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} accessibilityRole="button" accessibilityLabel={t('common.add')}>
          <Plus color={colors.bg} size={22} />
        </TouchableOpacity>
      </View>
    </>
  );
};

export const SimpleListSettingsScreen: React.FC<SimpleListSettingsScreenProps> = ({
  navigation,
  title,
  deleteConfirmMessage,
  extraSections,
  groupTitle,
  existingSectionTitle,
  addSectionTitle,
  addPlaceholder,
  items,
  onAdd,
  onDelete,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await pendingDelete.onDelete(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ConfirmDialog
        visible={!!pendingDelete}
        title={t('common.deleteNamed', { name: pendingDelete?.name ?? '' })}
        message={deleteConfirmMessage ?? t('common.irreversible')}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={1}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ListSection
            groupTitle={groupTitle}
            existingSectionTitle={existingSectionTitle}
            addSectionTitle={addSectionTitle}
            addPlaceholder={addPlaceholder}
            items={items}
            onAdd={onAdd}
            onDelete={onDelete}
            onRequestDelete={setPendingDelete}
            styles={styles}
          />
          {extraSections?.map((section, index) => (
            <ListSection key={index} {...section} onRequestDelete={setPendingDelete} styles={styles} />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: FONT_SIZE.xxl, fontWeight: 'bold' },
  keyboardAvoiding: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  groupTitle: { color: colors.green, fontSize: FONT_SIZE.sm, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 28, marginBottom: -12 },
  sectionTitle: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '700', marginTop: 28, marginBottom: SPACING.md },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  listItemText: { color: colors.white, fontSize: FONT_SIZE.lg, flex: 1, paddingRight: SPACING.md },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  input: { backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: 14, color: colors.white, fontSize: FONT_SIZE.lg, marginBottom: SPACING.md },
  addBtn: { width: 48, height: 48, borderRadius: RADIUS.sheet, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center' },
});
