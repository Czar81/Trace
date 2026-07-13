import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../context/ExpenseContext';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ArrowLeft, Trash2, Plus } from 'lucide-react-native';
import { ConfirmDialog } from '../components/ConfirmDialog';

const COLORS = {
  bg: '#092230',
  cardBg: '#1F3A47',
  inputBg: '#1F3A47',
  green: '#A7E7B4',
  redText: '#E55B5B',
  white: '#FFFFFF',
  secondaryText: '#A6B9C7',
  divider: '#142E3D',
};

export const CategoriesSettingsScreen = ({ navigation }: any) => {
  const { categories, addCategory, deleteCategory } = useAppData();
  const [newCategory, setNewCategory] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await addCategory(newCategory.trim());
    setNewCategory('');
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteCategory(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ConfirmDialog
        visible={!!pendingDelete}
        title={`Eliminar "${pendingDelete?.name}"`}
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categorías</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={1}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Categorías existentes</Text>
          {categories.map(cat => (
            <View key={cat.id} style={styles.listItem}>
              <Text style={styles.listItemText}>{cat.name}</Text>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 16, right: 10 }}
                onPress={() => setPendingDelete({ id: cat.id, name: cat.name })}
              >
                <Trash2 color={COLORS.redText} size={20} />
              </TouchableOpacity>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Agregar categoría</Text>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 12 }]}
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="Nueva categoría..."
              placeholderTextColor={COLORS.secondaryText}
              onSubmitEditing={handleAddCategory}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddCategory}>
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
