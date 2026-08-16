import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

interface EmptyStateProps {
  message: string;
  ctaLabel?: string;
  onPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, ctaLabel, onPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {ctaLabel && onPress ? (
        <TouchableOpacity style={styles.cta} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  message: { color: COLORS.secondaryText, fontSize: 15, textAlign: 'center', fontStyle: 'italic' },
  cta: {
    marginTop: 16,
    backgroundColor: COLORS.green,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  ctaText: { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
});
