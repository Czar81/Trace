import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { ThemeColors } from '../../theme/colors';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';
import { TranslationKey } from '../../i18n';
import { FIRST_STEP_IDS, FirstStepId, countCompletedSteps } from '../../domain/onboarding/firstSteps';
import { FirstStepsState } from '../../services/storage/storage';

interface FirstStepsCardProps {
  progress: Record<FirstStepId, boolean>;
  state: FirstStepsState;
  onStepPress: (id: FirstStepId) => void;
  onStateChange: (state: FirstStepsState) => void;
}

/** Checklist shown on Home until the user hides it. Each step is ticked from real data, so it never needs its own storage. */
export const FirstStepsCard: React.FC<FirstStepsCardProps> = ({ progress, state, onStepPress, onStateChange }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const done = countCompletedSteps(progress);
  const total = FIRST_STEP_IDS.length;
  const allDone = done === total;
  if (state === 'closed') return null;

  const progressLabel = t('firstSteps.progress', { done, total });

  if (state === 'collapsed' && !allDone) {
    return (
      <TouchableOpacity style={styles.collapsed} onPress={() => onStateChange('open')} accessibilityRole="button" activeOpacity={0.85}>
        <Text style={styles.collapsedText}>{t('firstSteps.title')} · {progressLabel}</Text>
        <Text style={styles.link}>{t('firstSteps.show')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{allDone ? t('firstSteps.doneTitle') : `${t('firstSteps.title')} · ${progressLabel}`}</Text>
        <TouchableOpacity
          onPress={() => onStateChange(allDone ? 'closed' : 'collapsed')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
        >
          <Text style={styles.link}>{t(allDone ? 'firstSteps.close' : 'firstSteps.hide')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${(done / total) * 100}%` }]} /></View>
      {allDone ? null : FIRST_STEP_IDS.map(id => {
        const isDone = progress[id];
        return (
          <TouchableOpacity
            key={id}
            style={styles.step}
            onPress={() => onStepPress(id)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ checked: isDone }}
          >
            <View style={[styles.circle, isDone && styles.circleDone]}>
              {isDone ? <Check color={colors.onAccent} size={14} /> : null}
            </View>
            <View style={styles.stepText}>
              <Text style={[styles.stepTitle, isDone && styles.stepTitleDone]}>{t(`firstSteps.${id}.title` as TranslationKey)}</Text>
              {isDone ? null : <Text style={styles.stepHint}>{t(`firstSteps.${id}.hint` as TranslationKey)}</Text>}
            </View>
            {isDone ? null : <Text style={styles.link}>{t(`firstSteps.${id}.cta` as TranslationKey)}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.cardBg, borderRadius: RADIUS.pill, padding: SPACING.lg, marginBottom: SPACING.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md },
  title: { flex: 1, color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  link: { color: colors.green, fontSize: FONT_SIZE.md, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.progressTrack, marginVertical: SPACING.md, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.green },
  step: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 52, paddingVertical: SPACING.sm },
  circle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.progressTrack, alignItems: 'center', justifyContent: 'center' },
  circleDone: { backgroundColor: colors.green, borderColor: colors.green },
  stepText: { flex: 1 },
  stepTitle: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '600' },
  stepTitleDone: { color: colors.secondaryText, textDecorationLine: 'line-through', fontWeight: '400' },
  stepHint: { color: colors.secondaryText, fontSize: FONT_SIZE.sm },
  collapsed: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: RADIUS.sheet, paddingHorizontal: SPACING.lg, minHeight: 48, marginBottom: SPACING.md },
  collapsedText: { color: colors.secondaryText, fontSize: FONT_SIZE.md },
});
