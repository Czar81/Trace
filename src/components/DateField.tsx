import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';

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
}

export const DateField: React.FC<DateFieldProps> = ({ value, placeholder, onChange, quickOptions, showWeekday = false }) => {
  const { colors } = useTheme();
  const { locale } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showPicker, setShowPicker] = useState(false);

  const label = value?.toLocaleDateString(locale, {
    weekday: showWeekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) ?? placeholder ?? '';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => setShowPicker(true)}>
        <Calendar color={colors.secondaryText} size={20} />
        <Text style={styles.text}>{label}</Text>
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
  container: { marginBottom: 8 },
  button: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: { color: colors.white, fontSize: 16 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipText: { color: colors.white, fontSize: 14 },
});
