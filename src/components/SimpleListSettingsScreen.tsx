import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Trash2, Plus } from 'lucide-react-native';
import { ConfirmDialog } from './ConfirmDialog';
import { COLORS as SHARED } from '../theme/colors';

const COLORS = {
  bg: SHARED.bg,
  cardBg: SHARED.cardBg,
  inputBg: SHARED.cardBg,
  green: SHARED.green,
  redText: SHARED.red,
  white: SHARED.white,
  secondaryText: SHARED.secondaryText,
  divider: SHARED.divider,
};

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
          <ArrowLeft color={COLORS.white} size={24} />
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
                <Trash2 color={COLORS.redText} size={20} />
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
              placeholderTextColor={COLORS.secondaryText}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Plus color={COLORS.bg} size={22} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  keyboardAvoiding: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  listItemText: { color: COLORS.white, fontSize: 16, flex: 1, paddingRight: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14, color: COLORS.white, fontSize: 16, marginBottom: 12 },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.green, justifyContent: 'center', alignItems: 'center' },
});
