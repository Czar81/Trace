import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Currency } from '../types';

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
  const symbol = SYMBOLS[currency] ?? '₡';
  const display = formatDisplay(value);

  const handleChange = useCallback((text: string) => {
    onChangeText(sanitize(text));
  }, [onChangeText]);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <Text style={styles.symbol}>{symbol}</Text>
        <TextInput
          {...rest}
          value={display}
          onChangeText={handleChange}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor="#A6B9C7"
          style={[styles.input, style]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 24 },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F3A47',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  symbol: { color: '#A6B9C7', fontSize: 20, fontWeight: '700', marginRight: 8 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 22, fontWeight: '700', padding: 0 },
});
