import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Currency, Envelope, EnvelopeType } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { ThemeColors } from '../../theme/colors';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';
import { TranslationKey } from '../../i18n';
import { formatCurrency } from '../../domain/shared/formatCurrency';
import { computeSummaryProgress, daysUntilNextCutoff } from '../../domain/budget/summaryProgress';

const WARN_COLOR = '#E3B341';

const SUB_KEYS: Record<EnvelopeType, TranslationKey> = {
  gasto: 'main.progressSpentSub',
  ahorro: 'main.progressSavedSub',
  deuda: 'main.progressPaidSub',
};

interface Props {
  type: EnvelopeType;
  label: string;
  totals: { currency: Currency; total: number }[];
  envelopes: Envelope[];
  getEnvelopeBalance: (envelopeId: string) => number;
}

/** «Total» card of the home screen: progress on the left, the total on the right, one currency at a time. */
export const SummaryCard: React.FC<Props> = ({ type, label, totals, envelopes, getEnvelopeBalance }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [picked, setPicked] = useState<Partial<Record<EnvelopeType, Currency>>>({});

  const entry = totals.find(x => x.currency === picked[type]) ?? totals[0];
  const progress = computeSummaryProgress(type, entry.currency, envelopes, getEnvelopeBalance);

  const pct = progress ? Math.round(progress.percent) : 0;
  const barColor = type === 'gasto' && progress
    ? (progress.percent > 90 ? colors.red : progress.percent > 75 ? WARN_COLOR : colors.green)
    : colors.green;
  const days = daysUntilNextCutoff(new Date());
  const money = (n: number) => formatCurrency(n, entry.currency);

  const caption = !progress ? null
    : type === 'gasto' ? t('main.progressUsed', { pct })
    : type === 'ahorro' ? t('main.progressGoals', { pct })
    : t('main.progressPaid', { pct });
  const trailing = !progress ? null
    : type === 'gasto' ? t(days === 1 ? 'main.progressDayLeft' : 'main.progressDaysLeft', { n: days })
    : t('main.progressMissing', { amount: money(progress.remaining) });

  return (
    <View style={styles.card}>
      <View style={styles.flap} pointerEvents="none" />
      <View style={styles.row}>
        {progress ? (
          <View style={styles.left}>
            <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>
              {money(progress.done)} <Text style={styles.bigSmall}>{t('main.progressOf', { total: money(progress.total) })}</Text>
            </Text>
            <Text style={styles.sub}>{t(SUB_KEYS[type])}</Text>
          </View>
        ) : <View style={styles.left} />}
        <View style={styles.right}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.total, entry.total < 0 && { color: colors.red }]}>{formatCurrency(Math.abs(entry.total), entry.currency)}</Text>
        </View>
      </View>
      {progress && (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress.percent}%`, backgroundColor: barColor }]} />
          </View>
          <View style={styles.captionRow}>
            <Text style={styles.caption}>{caption}</Text>
            <Text style={styles.caption}>{trailing}</Text>
          </View>
        </>
      )}
      {totals.length > 1 && (
        <View style={styles.chips}>
          {totals.map(x => {
            const active = x.currency === entry.currency;
            return (
              <TouchableOpacity
                key={x.currency}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setPicked(p => ({ ...p, [type]: x.currency }))}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{x.currency}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.cardBg, marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.lg, overflow: 'hidden' },
  flap: { position: 'absolute', top: -20, left: '50%', width: 40, height: 40, marginLeft: -20, backgroundColor: colors.cardHighlight, transform: [{ rotate: '45deg' }] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  left: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end', flexShrink: 0 },
  label: { color: colors.secondaryText, fontSize: FONT_SIZE.sm, marginBottom: SPACING.xs },
  total: { color: colors.white, fontSize: 22, fontWeight: 'bold' },
  big: { color: colors.white, fontSize: 17, fontWeight: 'bold' },
  bigSmall: { color: colors.secondaryText, fontSize: FONT_SIZE.sm, fontWeight: 'normal' },
  sub: { color: colors.secondaryText, fontSize: FONT_SIZE.xs, marginTop: 3 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.progressTrack, overflow: 'hidden', marginTop: SPACING.md },
  fill: { height: '100%', borderRadius: 4 },
  captionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  caption: { color: colors.secondaryText, fontSize: FONT_SIZE.xs },
  chips: { flexDirection: 'row', gap: 6, marginTop: SPACING.md },
  chip: { borderWidth: 1, borderColor: colors.progressTrack, borderRadius: RADIUS.md, paddingVertical: 1, paddingHorizontal: 10 },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.secondaryText, fontSize: FONT_SIZE.xs },
  chipTextActive: { color: colors.bg, fontWeight: '600' },
});
