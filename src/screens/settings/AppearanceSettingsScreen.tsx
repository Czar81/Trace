import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Check from 'lucide-react-native/icons/check';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { TranslationKey } from '../../i18n';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'AppearanceSettings'>;

export const AppearanceSettingsScreen = ({ navigation }: Props) => {
  const { colors, themeId, themeList, setThemeId } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('appearance.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>{t('appearance.chooseTheme')}</Text>

        {themeList.map((theme) => {
          const selected = theme.id === themeId;
          return (
            <TouchableOpacity
              key={theme.id}
              style={[styles.themeCard, selected && styles.themeCardSelected]}
              onPress={() => setThemeId(theme.id)}
              activeOpacity={0.8}
            >
              <View style={styles.swatch}>
                <View style={[styles.swatchDot, { backgroundColor: theme.colors.bg }]} />
                <View style={[styles.swatchDot, { backgroundColor: theme.colors.cardBg }]} />
                <View style={[styles.swatchDot, { backgroundColor: theme.colors.green }]} />
                <View style={[styles.swatchDot, { backgroundColor: theme.colors.blue }]} />
              </View>
              <View style={styles.themeTextWrapper}>
                <Text style={styles.themeName}>{t(`appearance.theme.${theme.id}` as TranslationKey)}</Text>
                <Text style={styles.themeSubtitle}>{t(theme.isLight ? 'appearance.light' : 'appearance.dark')}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <Check color={colors.bg} size={12} strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: FONT_SIZE.xxl, fontWeight: 'bold' },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  sectionTitle: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '700', marginBottom: SPACING.xl },
  themeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: RADIUS.xl, padding: 14, marginBottom: SPACING.md, borderWidth: 1.5, borderColor: colors.divider },
  themeCardSelected: { borderColor: colors.green },
  swatch: { width: 34, height: 34, borderRadius: RADIUS.sm, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', marginRight: 14 },
  swatchDot: { width: 17, height: 17 },
  themeTextWrapper: { flex: 1 },
  themeName: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '700', marginBottom: SPACING.xxs },
  themeSubtitle: { color: colors.secondaryText, fontSize: FONT_SIZE.sm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.secondaryText, justifyContent: 'center', alignItems: 'center' },
  radioSelected: { borderColor: colors.green, backgroundColor: colors.green },
});
