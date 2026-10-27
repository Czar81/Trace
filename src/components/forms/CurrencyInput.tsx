import React, { useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Currency } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

const SYMBOLS: Record<Currency, string> = { CRC: '₡', USD: '$', EUR: '€' };

interface CurrencyInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;               // raw numeric string, e.g. "12500.5"
  onChangeText: (raw: string) => void;
  currency: Currency;
  label?: string;
  style?: any;
}

/**
 * Formats a raw numeric string with thousands separators.
 * e.g. "12500.5" → "12,500.5"
 */
function formatDisplay(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

/**
 * Turns what the field now shows into a raw numeric string. Commas in the
 * display are thousands separators, but a comma the user just typed, or one
 * pasted before the last one or two digits (e.g. "12,50"), is read as the
 * decimal point, since many keyboards in Spanish only offer a comma.
 */
export function parseCurrencyInput(text: string, previousRaw: string): string {
  const previousDisplay = formatDisplay(previousRaw);
  let normalized = text;
  if (text.length === previousDisplay.length + 1) {
    let i = 0;
    while (i < previousDisplay.length && text[i] === previousDisplay[i]) i++;
    if (text[i] === ',') normalized = text.slice(0, i) + '.' + text.slice(i + 1);
  } else if (text.length > previousDisplay.length + 1 && !text.includes('.')) {
    normalized = text.replace(/,(\d{1,2})$/, '.$1');
  }
  return sanitize(normalized);
}

/**
 * Strips everything except digits and the first decimal point.
 */
function sanitize(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChangeText,
  currency,
  label,
  style,
  placeholder = '0.00',
  ...rest
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const symbol = SYMBOLS[currency] ?? '₡';
  const display = formatDisplay(value);

  const handleChange = useCallback((text: string) => {
    onChangeText(parseCurrencyInput(text, value));
  }, [onChangeText, value]);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <Text style={styles.symbol}>{symbol}</Text>
        <TextInput
          {...rest}
          value={display}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryText}
          style={[styles.input, style]}
        />
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: { marginBottom: SPACING.xxl },
  label: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '600', marginBottom: SPACING.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  symbol: { color: colors.secondaryText, fontSize: FONT_SIZE.xxl, fontWeight: '700', marginRight: SPACING.sm },
  input: { flex: 1, color: colors.white, fontSize: 22, fontWeight: '700', padding: 0 },
});
