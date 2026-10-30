import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Currency } from '../../types';
import { ConceptSuggestion } from '../../domain/transactions/conceptSuggestions';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { useAppData } from '../../context/ExpenseContext';
import { ThemeColors } from '../../theme/colors';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

interface Props {
  suggestions: ConceptSuggestion[];
  currency: Currency;
  onPick: (suggestion: ConceptSuggestion) => void;
}

/** Tappable chips with concepts used before; picking one prefills the form. */
export const ConceptSuggestions = ({ suggestions, currency, onPick }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatAmount } = useAppData();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (suggestions.length === 0) return null;
  return (
    <View style={styles.row}>
      {suggestions.map(s => (
        <TouchableOpacity
          key={s.description.toLowerCase()}
          style={styles.chip}
          onPress={() => onPick(s)}
          accessibilityRole="button"
          accessibilityLabel={t('tx.suggestionLabel', { description: s.description, amount: formatAmount(s.latest.amount, currency) })}
        >
          <Text style={styles.chipText} numberOfLines={1}>{s.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: -SPACING.lg, marginBottom: SPACING.xxl },
  chip: {
    minHeight: 40, justifyContent: 'center', maxWidth: '100%', paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.green,
  },
  chipText: { color: colors.green, fontSize: FONT_SIZE.md, fontWeight: '600' },
});
