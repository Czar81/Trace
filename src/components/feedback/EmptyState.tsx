import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

interface EmptyStateProps {
  message: string;
  ctaLabel?: string;
  onPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, ctaLabel, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { alignItems: 'center', marginTop: 40, paddingHorizontal: SPACING.xl },
  message: { color: colors.secondaryText, fontSize: FONT_SIZE.base, textAlign: 'center', fontStyle: 'italic' },
  cta: {
    marginTop: SPACING.lg,
    backgroundColor: colors.green,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.sheet,
  },
  ctaText: { color: colors.bg, fontSize: FONT_SIZE.base, fontWeight: '700' },
});
