import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';

interface DayGridSheetProps {
  visible: boolean;
  title: string;
  /** Short text shown at the right of the title, e.g. "Cada mes". */
  subtitle?: string;
  /** Note under the grid, e.g. how days 29–31 behave in shorter months. */
  hint?: string;
  value: number | null | undefined;
  onSelect: (day: number) => void;
  onClose: () => void;
}

const OVERLAY = 'rgba(0,0,0,0.6)';
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const COLUMNS = 7;

/** Bottom sheet with the 31 days of a month laid out as a calendar grid; one tap picks a day and closes. */
export const DayGridSheet: React.FC<DayGridSheetProps> = ({
  visible,
  title,
  subtitle,
  hint,
  value,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleSelect = (day: number) => {
    onSelect(day);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.grid}>
          {DAYS.map(day => {
            const isSelected = day === value;
            return (
              <View key={day} style={styles.cell}>
                <TouchableOpacity
                  style={[styles.day, isSelected && styles.daySelected]}
                  onPress={() => handleSelect(day)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.dayText, day > 28 && styles.dayTextTail, isSelected && styles.dayTextSelected]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: OVERLAY },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.modalSheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.progressTrack, alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 12 },
  title: { color: colors.white, fontSize: 18, fontWeight: '700' },
  subtitle: { color: colors.secondaryText, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / COLUMNS}%`, aspectRatio: 1, padding: 3 },
  day: { flex: 1, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  daySelected: { backgroundColor: colors.green },
  dayText: { color: colors.white, fontSize: 16, fontVariant: ['tabular-nums'] },
  dayTextTail: { color: colors.secondaryText },
  dayTextSelected: { color: colors.modalSheet, fontWeight: '700' },
  hint: { color: colors.secondaryText, fontSize: 13, lineHeight: 18, marginTop: 10, paddingHorizontal: 4 },
});
