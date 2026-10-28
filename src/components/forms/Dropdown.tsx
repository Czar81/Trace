import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, SectionList,
  StyleSheet, SafeAreaView, TextInput,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

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
  placeholder,
  searchable = false,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
          {selected ? selected.label : (placeholder ?? t('common.select'))}
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
              placeholder={t('common.search')}
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
  wrapper: { marginBottom: SPACING.xxl },
  label: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '600', marginBottom: SPACING.sm },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  triggerText: { color: colors.white, fontSize: FONT_SIZE.lg, flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: OVERLAY },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.modalSheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  sheetTitle: { color: colors.white, fontSize: FONT_SIZE.xl, fontWeight: '700', marginBottom: SPACING.lg, textAlign: 'center' },
  searchInput: {
    backgroundColor: colors.cardBg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.white,
    fontSize: FONT_SIZE.base,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    color: colors.secondaryText, fontSize: FONT_SIZE.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4,
    backgroundColor: colors.modalSheet, paddingTop: 14, paddingBottom: 6,
  },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.lg },
  optionText: { color: colors.white, fontSize: FONT_SIZE.lg },
  divider: { height: 1, backgroundColor: colors.divider },
});
