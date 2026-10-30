import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../theme/colors';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

export const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: FONT_SIZE.xxl, fontWeight: 'bold' },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  sectionTitle: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '700', marginBottom: SPACING.xl },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: 14, borderWidth: 1, borderColor: colors.divider },
  menuIconWrapper: { width: 44, height: 44, borderRadius: RADIUS.lg, backgroundColor: colors.cardHighlight, borderWidth: 1, borderColor: colors.divider, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuTextWrapper: { flex: 1 },
  menuTitle: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '700', marginBottom: SPACING.xs },
  menuSubtitle: { color: colors.secondaryText, fontSize: FONT_SIZE.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardBg, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: 14, borderWidth: 1, borderColor: colors.divider },
  toggleTextWrapper: { flex: 1, paddingRight: SPACING.md },
  reminderCard: { backgroundColor: colors.cardBg, borderRadius: RADIUS.xl, marginBottom: 14, borderWidth: 1, borderColor: colors.divider, overflow: 'hidden' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg },
  reminderDivider: { height: 1, backgroundColor: colors.divider },
  reminderRowStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.md },
  stepperFull: { alignSelf: 'stretch', justifyContent: 'space-between' },
  settingsRowDivider: { height: 1, backgroundColor: colors.divider },
  leadDaysLabel: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xxs, backgroundColor: colors.bg, borderRadius: RADIUS.pill, padding: SPACING.xs },
  stepperBtn: { width: 30, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardHighlight },
  intervalChip: { minWidth: 38, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  intervalChipActive: { backgroundColor: colors.cardHighlight },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperValue: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '700', minWidth: 26, textAlign: 'center' },
});
