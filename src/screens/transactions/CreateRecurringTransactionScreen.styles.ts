import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../theme/colors';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

export const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  keyboardAvoiding: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.lg,
  },
  headerBtn: { padding: SPACING.xs },
  headerTitle: { color: colors.white, fontSize: FONT_SIZE.xl, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  form: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  typeSelector: {
    flexDirection: 'row', backgroundColor: colors.cardBg, borderRadius: RADIUS.lg,
    padding: SPACING.xs, marginBottom: SPACING.xxl, gap: SPACING.xs,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md, borderRadius: RADIUS.sm, gap: SPACING.sm,
  },
  typeBtnExpense: { backgroundColor: colors.red },
  typeBtnIncome: { backgroundColor: colors.blue },
  typeText: { color: colors.secondaryText, fontSize: FONT_SIZE.base, fontWeight: '700' },
  label: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '600', marginTop: SPACING.xxl, marginBottom: SPACING.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.lg },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.secondaryText,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  toggleLabel: { color: colors.white, fontSize: FONT_SIZE.base, flex: 1 },
  fieldLabel: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '600', marginBottom: SPACING.sm },
  dayField: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 14, marginBottom: SPACING.xxl,
  },
  dayFieldText: { color: colors.white, fontSize: FONT_SIZE.lg },
  dayFieldHint: { color: colors.secondaryText, fontSize: FONT_SIZE.sm, marginTop: SPACING.xxs },
  errorText: { color: colors.red, fontSize: FONT_SIZE.sm, marginTop: -20, marginBottom: SPACING.xl },
  input: {
    backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: SPACING.lg,
    color: colors.white, fontSize: FONT_SIZE.lg, marginBottom: SPACING.xxl,
  },
});
