import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import HelpCircle from 'lucide-react-native/icons/circle-question-mark';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { ThemeColors } from '../../theme/colors';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';
import { TranslationKey } from '../../i18n';

interface HelpButtonProps {
  title: TranslationKey;
  body: TranslationKey;
  style?: object;
  /** Optional secondary action shown above the close button (e.g. "View tutorial"). */
  actionLabel?: TranslationKey;
  onAction?: () => void;
}

/** A "?" icon that opens a short help dialog for the current screen. */
export const HelpButton: React.FC<HelpButtonProps> = ({ title, body, style, actionLabel, onAction }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={style}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('help.open')}
      >
        <HelpCircle color={colors.secondaryText} size={22} />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)} />
        <View style={styles.center} pointerEvents="box-none">
          <View style={styles.card}>
            <Text style={styles.title}>{t(title)}</Text>
            <Text style={styles.body}>{t(body)}</Text>
            {actionLabel && onAction ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setVisible(false); onAction(); }} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.secondaryBtnText}>{t(actionLabel)}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.btn} onPress={() => setVisible(false)} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.btnText}>{t('help.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)' },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  card: { backgroundColor: colors.cardBg, borderRadius: RADIUS.pill, padding: SPACING.xxl },
  title: { color: colors.white, fontSize: FONT_SIZE.xl, fontWeight: '700', marginBottom: SPACING.sm },
  body: { color: colors.secondaryText, fontSize: FONT_SIZE.md, lineHeight: 21, marginBottom: SPACING.xl },
  btn: { backgroundColor: colors.green, borderRadius: RADIUS.sheet, paddingVertical: SPACING.md, alignItems: 'center' },
  secondaryBtn: { borderWidth: 1, borderColor: colors.progressTrack, borderRadius: RADIUS.sheet, paddingVertical: SPACING.md, alignItems: 'center', marginBottom: SPACING.sm },
  secondaryBtnText: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '600' },
  btnText: { color: colors.bg, fontSize: FONT_SIZE.base, fontWeight: '700' },
});
