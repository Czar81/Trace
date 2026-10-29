import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import Wallet from 'lucide-react-native/icons/wallet';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import BarChart3 from 'lucide-react-native/icons/chart-column';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { ThemeColors } from '../../theme/colors';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';
import { TranslationKey } from '../../i18n';

const PAGES: { icon: LucideIcon; title: TranslationKey; body: TranslationKey }[] = [
  { icon: Wallet, title: 'onboarding.page1.title', body: 'onboarding.page1.body' },
  { icon: ArrowLeftRight, title: 'onboarding.page2.title', body: 'onboarding.page2.body' },
  { icon: BarChart3, title: 'onboarding.page3.title', body: 'onboarding.page3.body' },
  { icon: ShieldCheck, title: 'onboarding.page4.title', body: 'onboarding.page4.body' },
];

interface OnboardingScreenProps {
  /** Called when the user skips or finishes the last page. */
  onFinish: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const isLast = page === PAGES.length - 1;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const handleNext = () => {
    if (isLast) {
      onFinish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        {!isLast ? (
          <TouchableOpacity onPress={onFinish} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button">
            <Text style={styles.skip}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {PAGES.map(({ icon: Icon, title, body }) => (
          <View key={title} style={[styles.page, { width }]}>
            <View style={styles.iconCircle}>
              <Icon color={colors.green} size={56} />
            </View>
            <Text style={styles.title}>{t(title)}</Text>
            <Text style={styles.body}>{t(body)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessible accessibilityLabel={t('onboarding.pageIndicator', { current: page + 1, total: PAGES.length })}>
          {PAGES.map((p, i) => (
            <View key={p.title} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.nextText}>{t(isLast ? 'onboarding.start' : 'onboarding.next')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { height: 44, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  skip: { color: colors.secondaryText, fontSize: FONT_SIZE.lg, fontWeight: '600' },
  pager: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxl * 1.5 },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: colors.cardBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xxl * 1.5,
  },
  title: { color: colors.white, fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.md },
  body: { color: colors.secondaryText, fontSize: FONT_SIZE.lg, lineHeight: 24, textAlign: 'center' },
  footer: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.divider, marginHorizontal: 4 },
  dotActive: { backgroundColor: colors.green, width: 22 },
  nextBtn: { backgroundColor: colors.green, borderRadius: RADIUS.sheet, paddingVertical: SPACING.lg, alignItems: 'center' },
  nextText: { color: colors.bg, fontSize: FONT_SIZE.lg, fontWeight: '700' },
});
