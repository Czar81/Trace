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
  envelopeContext: { color: colors.secondaryText, fontSize: FONT_SIZE.md, textAlign: 'center', marginBottom: SPACING.xl },
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
  debtPreview: { marginTop: -12, marginBottom: SPACING.lg },
  debtPreviewText: { color: colors.secondaryText, fontSize: FONT_SIZE.sm },
  debtWarning: { color: colors.red, fontSize: FONT_SIZE.sm, marginTop: SPACING.xs },
  label: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '600', marginTop: SPACING.xxl, marginBottom: SPACING.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xl, marginBottom: SPACING.lg },
  toggleLabel: { color: colors.white, fontSize: FONT_SIZE.base, flex: 1, paddingRight: SPACING.md },
  notesInput: { minHeight: 96 },
  splitError: { color: colors.red, fontSize: FONT_SIZE.md, marginBottom: SPACING.lg },
  savingsPreview: { color: colors.secondaryText, fontSize: FONT_SIZE.sm, marginTop: -8, marginBottom: SPACING.lg },
  input: {
    backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: SPACING.lg,
    color: colors.white, fontSize: FONT_SIZE.lg, marginBottom: SPACING.xxl,
  },
});
