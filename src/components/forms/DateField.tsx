import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Calendar from 'lucide-react-native/icons/calendar';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

export interface DateQuickOption {
  label: string;
  /** Evaluated on press so "today" is never stale. */
  getDate: () => Date;
  /** Handles the press instead of `onChange`, e.g. to also update related state. */
  onSelect?: (date: Date) => void;
}

interface DateFieldProps {
  /** Undefined renders `placeholder` (for optional filters). */
  value?: Date;
  placeholder?: string;
  onChange: (date: Date) => void;
  quickOptions?: DateQuickOption[];
  /** Include the weekday name in the displayed date. */
  showWeekday?: boolean;
  /** Short month and a single line, for fields that sit side by side. */
  compact?: boolean;
}

export const DateField: React.FC<DateFieldProps> = ({ value, placeholder, onChange, quickOptions, showWeekday = false, compact = false }) => {
  const { colors } = useTheme();
  const { locale } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showPicker, setShowPicker] = useState(false);

  const label = value?.toLocaleDateString(locale, {
    weekday: showWeekday ? 'long' : undefined,
    day: 'numeric',
    month: compact ? 'short' : 'long',
    year: 'numeric',
  }) ?? placeholder ?? '';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => setShowPicker(true)}>
        <Calendar color={colors.secondaryText} size={20} />
        <Text style={styles.text} numberOfLines={compact ? 1 : undefined}>{label}</Text>
      </TouchableOpacity>

      {quickOptions && quickOptions.length > 0 && (
        <View style={styles.quickRow}>
          {quickOptions.map(option => (
            <TouchableOpacity key={option.label} style={styles.chip} onPress={() => {
              const date = option.getDate();
              if (option.onSelect) option.onSelect(date);
              else onChange(date);
            }}>
              <Text style={styles.chipText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showPicker && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { marginBottom: SPACING.sm },
  button: {
    backgroundColor: colors.cardBg,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  text: { color: colors.white, fontSize: FONT_SIZE.lg, flexShrink: 1 },
  quickRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  chip: {
    backgroundColor: colors.cardBg,
    borderRadius: RADIUS.xl,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipText: { color: colors.white, fontSize: FONT_SIZE.md },
});
