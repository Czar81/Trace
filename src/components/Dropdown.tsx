import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  StyleSheet, SafeAreaView, TextInput,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value: string;             // currently selected value
  onSelect: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
}

const COLORS = {
  bg: '#092230',
  cardBg: '#1F3A47',
  green: '#A7E7B4',
  white: '#FFFFFF',
  secondaryText: '#A6B9C7',
  divider: '#142E3D',
  overlay: 'rgba(0,0,0,0.6)',
};

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  value,
  onSelect,
  placeholder = 'Seleccionar...',
  searchable = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find(o => o.value === value);
  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = (val: string) => {
    onSelect(val);
    setSearch('');
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[styles.triggerText, !selected && { color: COLORS.secondaryText }]}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown color={COLORS.secondaryText} size={18} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}

          {searchable && (
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar..."
              placeholderTextColor={COLORS.secondaryText}
              autoFocus
            />
          )}

          <FlatList
            data={filtered}
            keyExtractor={item => item.value}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <TouchableOpacity style={styles.option} onPress={() => handleSelect(item.value)}>
                  <Text style={[styles.optionText, isSelected && { color: COLORS.green }]}>
                    {item.label}
                  </Text>
                  {isSelected && <Check color={COLORS.green} size={18} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 24 },
  label: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F3A47',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  triggerText: { color: COLORS.white, fontSize: 16, flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.overlay },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0d2e42',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  sheetTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  searchInput: {
    backgroundColor: '#1F3A47',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 15,
    marginBottom: 12,
  },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  optionText: { color: COLORS.white, fontSize: 16 },
  divider: { height: 1, backgroundColor: COLORS.divider },
});
