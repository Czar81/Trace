import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { useAppData } from '../../context/ExpenseContext';
import { getDeviceLocale } from '../../i18n';
import { ThemeColors } from '../../theme/colors';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';
import { Dropdown } from '../../components/forms/Dropdown';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { HelpButton } from '../../components/feedback/HelpButton';
import {
  FEEDBACK_FORM_VIEW_URL, FEEDBACK_KINDS, FEEDBACK_SCREENS, FeedbackKind, FeedbackTarget,
  getAppVersion, getDeviceDescription, isFeedbackConfigured, isValidFeedbackEmail, submitFeedback,
} from '../../services/feedback/feedbackForm';
import { buildTechnicalInfo, daysBetween, getTimezone } from '../../services/feedback/technicalInfo';
import { getLastError } from '../../services/feedback/errorCapture';
import { checkSendLimit, recordSend } from '../../services/feedback/sendLimit';
import { ensureFirstOpenAt, loadFeedbackSentAt, saveFeedbackSentAt } from '../../services/storage/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Feedback'>;

export const FeedbackScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const { settings, autoBackup, envelopes, transactions, recurringTemplates } = useAppData();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [screen, setScreen] = useState<FeedbackTarget>('na');
  const [message, setMessage] = useState('');
  const [steps, setSteps] = useState('');
  const [email, setEmail] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [firstOpenAt, setFirstOpenAt] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => { ensureFirstOpenAt().then(setFirstOpenAt); }, []);

  // The screen we came from, e.g. "Settings".
  const originScreen = (() => {
    const state = navigation.getState();
    return state.routes[state.index - 1]?.name ?? '';
  })();
  const techInfo = buildTechnicalInfo({
    language,
    locale: getDeviceLocale(),
    timezone: getTimezone(),
    theme: settings.themeId,
    defaultCurrency: settings.defaultCurrency,
    appLock: !!settings.appLockEnabled,
    autoBackup: autoBackup.enabled,
    envelopes: envelopes.length,
    transactions: transactions.length,
    recurring: recurringTemplates.length,
    daysSinceFirstOpen: firstOpenAt ? daysBetween(firstOpenAt, new Date()) : null,
    originScreen,
    lastError: getLastError(),
  });
  const [dialog, setDialog] = useState<{ title: string; message: string; done: boolean } | null>(null);

  const screenOptions = FEEDBACK_SCREENS.map(value => ({ value, label: t(`feedback.screen.${value}`) }));

  const handleSend = async () => {
    if (sending) return;
    if (!message.trim()) return setDialog({ title: t('feedback.title'), message: t('feedback.messageRequired'), done: false });
    if (!isValidFeedbackEmail(email)) return setDialog({ title: t('feedback.title'), message: t('feedback.emailInvalid'), done: false });

    // Without the form's question ids we can't post directly, so hand the user the form itself.
    if (!isFeedbackConfigured()) {
      Linking.openURL(FEEDBACK_FORM_VIEW_URL).catch(() => {});
      return;
    }
    setSending(true);
    const sentAt = await loadFeedbackSentAt();
    const limit = checkSendLimit(sentAt, Date.now());
    if (limit !== 'ok') {
      setSending(false);
      return setDialog({ title: t('feedback.title'), message: t(limit === 'minute' ? 'feedback.limitMinute' : 'feedback.limitDay'), done: false });
    }
    const ok = await submitFeedback({
      kind, screen, message, steps, email,
      version: getAppVersion(),
      device: getDeviceDescription(),
      tech: techInfo,
    });
    if (ok) await saveFeedbackSentAt(recordSend(sentAt, Date.now()));
    setSending(false);
    setDialog(ok
      ? { title: t('feedback.sentTitle'), message: t('feedback.sent'), done: true }
      : { title: t('feedback.errorTitle'), message: t('feedback.error'), done: false });
  };

  const closeDialog = () => {
    const done = dialog?.done;
    setDialog(null);
    if (done) navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('feedback.title')}</Text>
        <HelpButton title="help.feedback.title" body="help.feedback.body" />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t('feedback.kind')}</Text>
          <View style={styles.chips}>
            {FEEDBACK_KINDS.map(value => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, kind === value && styles.chipActive]}
                onPress={() => setKind(value)}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === value }}
              >
                <Text style={styles.chipText}>{t(`feedback.kind.${value}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Dropdown label={t('feedback.screen')} options={screenOptions} value={screen} onSelect={value => setScreen(value as FeedbackTarget)} />

          <Text style={styles.label}>{t('feedback.message')}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={message}
            onChangeText={setMessage}
            placeholder={t('feedback.messagePlaceholder')}
            placeholderTextColor={colors.secondaryText}
            multiline
            maxLength={2000}
          />

          {kind === 'bug' && (
            <>
              <Text style={styles.label}>{t('feedback.steps')}</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={steps}
                onChangeText={setSteps}
                placeholder={t('feedback.stepsPlaceholder')}
                placeholderTextColor={colors.secondaryText}
                multiline
                maxLength={2000}
              />
            </>
          )}

          <Text style={styles.label}>{t('feedback.email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('feedback.emailPlaceholder')}
            placeholderTextColor={colors.secondaryText}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.techCard}>
            <Text style={styles.techTitle}>{t('feedback.techTitle')}</Text>
            <Text style={styles.techHint}>{t('feedback.techHint')}</Text>
            <TouchableOpacity onPress={() => setShowPreview(v => !v)} accessibilityRole="button">
              <Text style={styles.techLink}>{t(showPreview ? 'feedback.techPreviewHide' : 'feedback.techPreview')}</Text>
            </TouchableOpacity>
            {showPreview && <Text style={styles.techPreview} selectable>{`${getAppVersion()}\n${getDeviceDescription()}\n${techInfo}`}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.sendText}>{t(sending ? 'feedback.sending' : 'feedback.send')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={t('common.accept')}
        cancelLabel=""
        onConfirm={closeDialog}
        onCancel={closeDialog}
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: FONT_SIZE.xxl, fontWeight: 'bold' },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  label: { color: colors.secondaryText, fontSize: FONT_SIZE.md, fontWeight: '600', marginBottom: SPACING.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: RADIUS.pill, justifyContent: 'center', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.divider },
  chipActive: { backgroundColor: colors.cardHighlight, borderColor: colors.green },
  chipText: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '600' },
  input: { backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: SPACING.lg, color: colors.white, fontSize: FONT_SIZE.lg, marginBottom: SPACING.xl },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  techCard: { backgroundColor: colors.cardBg, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.xl, borderWidth: 1, borderColor: colors.divider },
  techTitle: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '700', marginBottom: SPACING.xs },
  techHint: { color: colors.secondaryText, fontSize: FONT_SIZE.sm },
  techLink: { color: colors.blue, fontSize: FONT_SIZE.md, fontWeight: '600', marginTop: SPACING.md },
  techPreview: { color: colors.secondaryText, fontSize: FONT_SIZE.sm, marginTop: SPACING.md },
  sendBtn: { backgroundColor: colors.green, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: colors.onAccent, fontSize: FONT_SIZE.lg, fontWeight: '700' },
});
