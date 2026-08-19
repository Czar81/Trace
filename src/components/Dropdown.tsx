import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, SectionList,
  StyleSheet, SafeAreaView, TextInput,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';

export interface DropdownOption {
  label: string;
  value: string;
  /** Optional section header to group this option under. Options without a group render as one flat, headerless list. */
  group?: string;
}

const UNGROUPED = '__ungrouped__';

function toSections(options: DropdownOption[]): { title: string; data: DropdownOption[] }[] {
  const order: string[] = [];
  const byGroup = new Map<string, DropdownOption[]>();
  options.forEach(opt => {
    const key = opt.group ?? UNGROUPED;
    if (!byGroup.has(key)) {
      order.push(key);
      byGroup.set(key, []);
    }
    byGroup.get(key)!.push(opt);
  });
  return order.map(key => ({ title: key === UNGROUPED ? '' : key, data: byGroup.get(key)! }));
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value: string;             // currently selected value
  onSelect: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
}

const OVERLAY = 'rgba(0,0,0,0.6)';

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  value,
  onSelect,
  placeholder = 'Seleccionar...',
  searchable = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find(o => o.value === value);
  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;
  const sections = useMemo(() => toSections(filtered), [filtered]);

  const handleSelect = (val: string) => {
    onSelect(val);
    setSearch('');
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[styles.triggerText, !selected && { color: colors.secondaryText }]}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown color={colors.secondaryText} size={18} />
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
              placeholderTextColor={colors.secondaryText}
              autoFocus
            />
          )}

          <SectionList
            sections={sections}
            keyExtractor={item => item.value}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
            renderSectionHeader={({ section }) =>
              section.title ? <Text style={styles.sectionHeader}>{section.title}</Text> : null
            }
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <TouchableOpacity style={styles.option} onPress={() => handleSelect(item.value)}>
                  <Text style={[styles.optionText, isSelected && { color: colors.green }]}>
                    {item.label}
                  </Text>
                  {isSelected && <Check color={colors.green} size={18} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: { marginBottom: 24 },
  label: { color: colors.white, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  triggerText: { color: colors.white, fontSize: 16, flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: OVERLAY },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.modalSheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  sheetTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  searchInput: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 15,
    marginBottom: 12,
  },
  sectionHeader: {
    color: colors.secondaryText, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4,
    backgroundColor: colors.modalSheet, paddingTop: 14, paddingBottom: 6,
  },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  optionText: { color: colors.white, fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.divider },
});
