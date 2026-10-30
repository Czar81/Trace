import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Inbox from 'lucide-react-native/icons/inbox';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

interface EmptyStateProps {
  message: string;
  hint?: string;
  ctaLabel?: string;
  onPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, hint, ctaLabel, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Inbox color={colors.secondaryText} size={40} strokeWidth={1.5} style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
  icon: { opacity: 0.6, marginBottom: SPACING.md },
  hint: { color: colors.secondaryText, fontSize: FONT_SIZE.sm, textAlign: 'center', marginTop: SPACING.sm },
  message: { color: colors.secondaryText, fontSize: FONT_SIZE.base, textAlign: 'center', fontStyle: 'italic' },
  cta: {
    marginTop: SPACING.lg,
    backgroundColor: colors.green,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.sheet,
  },
  ctaText: { color: colors.onAccent, fontSize: FONT_SIZE.base, fontWeight: '700' },
});
