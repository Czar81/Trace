import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Trash2, Plus } from 'lucide-react-native';
import { ConfirmDialog } from './ConfirmDialog';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';

interface ListItem {
  id: string;
  name: string;
}

interface SimpleListSettingsScreenProps {
  navigation: any;
  title: string;
  existingSectionTitle: string;
  addSectionTitle: string;
  addPlaceholder: string;
  deleteConfirmMessage?: string;
  items: ListItem[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const SimpleListSettingsScreen: React.FC<SimpleListSettingsScreenProps> = ({
  navigation,
  title,
  existingSectionTitle,
  addSectionTitle,
  addPlaceholder,
  deleteConfirmMessage = 'Esta acción no se puede deshacer.',
  items,
  onAdd,
  onDelete,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [newItemName, setNewItemName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    await onAdd(newItemName.trim());
    setNewItemName('');
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await onDelete(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ConfirmDialog
        visible={!!pendingDelete}
        title={`Eliminar "${pendingDelete?.name}"`}
        message={deleteConfirmMessage}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
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
          <Text style={styles.sectionTitle}>{existingSectionTitle}</Text>
          {items.map(item => (
            <View key={item.id} style={styles.listItem}>
              <Text style={styles.listItemText}>{item.name}</Text>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 16, right: 10 }}
                onPress={() => setPendingDelete({ id: item.id, name: item.name })}
              >
                <Trash2 color={colors.red} size={20} />
              </TouchableOpacity>
            </View>
          ))}

          <Text style={styles.sectionTitle}>{addSectionTitle}</Text>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 12 }]}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder={addPlaceholder}
              placeholderTextColor={colors.secondaryText}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Plus color={colors.bg} size={22} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  keyboardAvoiding: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  listItemText: { color: colors.white, fontSize: 16, flex: 1, paddingRight: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  input: { backgroundColor: colors.cardBg, borderRadius: 12, padding: 14, color: colors.white, fontSize: 16, marginBottom: 12 },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center' },
});
