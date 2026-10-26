import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/ExpenseContext';
import { ArrowLeft, ChevronRight, CreditCard, DollarSign, Tag, Download, Upload, RefreshCw, BarChart3, Repeat, Minus, Plus, Palette, Share2 } from 'lucide-react-native';
import { exportDataToCSV } from '../utils/exportData';
import { getLatestAutomaticBackupUri, AUTO_BACKUP_INTERVAL_OPTIONS } from '../utils/autoBackup';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { LanguagePreference } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const LANGUAGE_OPTIONS: { value: LanguagePreference; labelKey: 'settings.languageSpanish' | 'settings.languageEnglish' | 'settings.languageSystem' }[] = [
  { value: 'es', labelKey: 'settings.languageSpanish' },
  { value: 'en', labelKey: 'settings.languageEnglish' },
  { value: 'system', labelKey: 'settings.languageSystem' },
];

export const SettingsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t, preference, setPreference } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    envelopes, transactions, paymentMethods, categories, incomeCategories, settings,
    importFromBackup, resetAllEnvelopes, updateSettings, autoBackup, updateAutoBackup,
  } = useAppData();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoDialogTitle, setInfoDialogTitle] = useState('');
  const [infoDialogMessage, setInfoDialogMessage] = useState('');

  const showInfo = (title: string, message: string) => {
    setInfoDialogTitle(title);
    setInfoDialogMessage(message);
    setShowInfoDialog(true);
  };

  const handleImport = async () => {
    const result = await importFromBackup();
    showInfo(
      result.success ? t('settings.importSuccessTitle') : t('settings.importErrorTitle'),
      result.message
    );
  };

  const changeLeadDays = (delta: number) => {
    const next = Math.min(7, Math.max(1, settings.billReminderLeadDays + delta));
    if (next !== settings.billReminderLeadDays) {
      updateSettings({ billReminderLeadDays: next });
    }
  };

  const handleCutoffToggle = (value: boolean) => {
    updateSettings({
      expenseCutoffEnabled: value,
      expenseCutoffDay: value ? (settings.expenseCutoffDay ?? 1) : settings.expenseCutoffDay,
    });
  };

  const changeCutoffDay = (delta: number) => {
    const current = settings.expenseCutoffDay ?? 1;
    const next = Math.min(31, Math.max(1, current + delta));
    if (next !== current) {
      updateSettings({ expenseCutoffDay: next });
    }
  };

  const handleExport = () => {
    exportDataToCSV(envelopes, transactions, paymentMethods, categories, incomeCategories, settings);
    showInfo(t('settings.exportTitle'), t('settings.exportDone'));
  };

  const handleShareLatestBackup = async () => {
    const uri = await getLatestAutomaticBackupUri();
    if (!uri || !(await isAvailableAsync())) {
      showInfo(t('settings.autoBackupTitle'), t('settings.noAutoBackupToShare'));
      return;
    }
    try {
      await shareAsync(uri, { UTI: 'public.json', mimeType: 'application/json' });
    } catch {
      showInfo(t('settings.autoBackupTitle'), t('settings.autoBackupOpenFailed'));
    }
  };

  const handleResetAll = () => {
    setShowResetConfirm(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>{t('settings.configureApp')}</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AppearanceSettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Palette color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.appearance')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.appearanceSubtitle')}</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('CurrencySettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <DollarSign color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.currencies')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.currenciesSubtitle')}</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('PaymentMethodsSettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <CreditCard color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.paymentMethods')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.paymentMethodsSubtitle')}</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('CategoriesSettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Tag color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.categories')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.categoriesSubtitle')}</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Reports')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <BarChart3 color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.reports')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.reportsSubtitle')}</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Recurring')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Repeat color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.recurring')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.recurringSubtitle')}</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>{t('settings.language')}</Text>

        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <Text style={styles.leadDaysLabel}>{t('settings.language')}</Text>
            <View style={styles.stepper}>
              {LANGUAGE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.intervalChip, preference === option.value && styles.intervalChipActive]}
                  onPress={() => setPreference(option.value)}
                >
                  <Text style={styles.stepperValue}>{t(option.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>{t('settings.alerts')}</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.budgetAlerts')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.budgetAlertsSubtitle')}</Text>
          </View>
          <Switch
            value={settings.budgetAlertsEnabled}
            onValueChange={() => updateSettings({ budgetAlertsEnabled: !settings.budgetAlertsEnabled })}
            trackColor={{ false: colors.cardBg, true: colors.green }}
            thumbColor={settings.budgetAlertsEnabled ? colors.green : colors.white}
          />
        </View>

        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.menuTitle}>{t('settings.billReminders')}</Text>
              <Text style={styles.menuSubtitle}>
                {settings.billRemindersEnabled
                  ? t(settings.billReminderLeadDays > 1 ? 'settings.billRemindersOnOther' : 'settings.billRemindersOnOne', { days: settings.billReminderLeadDays })
                  : t('settings.billRemindersOff')}
              </Text>
            </View>
            <Switch
              value={settings.billRemindersEnabled}
              onValueChange={() => updateSettings({ billRemindersEnabled: !settings.billRemindersEnabled })}
              trackColor={{ false: colors.cardBg, true: colors.green }}
              thumbColor={settings.billRemindersEnabled ? colors.green : colors.white}
            />
          </View>

          {settings.billRemindersEnabled && (
            <>
              <View style={styles.reminderDivider} />
              <View style={styles.reminderRow}>
                <Text style={styles.leadDaysLabel}>{t('settings.leadDays')}</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, settings.billReminderLeadDays <= 1 && styles.stepperBtnDisabled]}
                    disabled={settings.billReminderLeadDays <= 1}
                    onPress={() => changeLeadDays(-1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Minus color={settings.billReminderLeadDays <= 1 ? colors.secondaryText : colors.white} size={16} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{settings.billReminderLeadDays}</Text>
                  <TouchableOpacity
                    style={[styles.stepperBtn, settings.billReminderLeadDays >= 7 && styles.stepperBtnDisabled]}
                    disabled={settings.billReminderLeadDays >= 7}
                    onPress={() => changeLeadDays(1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Plus color={settings.billReminderLeadDays >= 7 ? colors.secondaryText : colors.white} size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>{t('settings.cutoffSection')}</Text>

        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.menuTitle}>{t('settings.cutoff')}</Text>
              <Text style={styles.menuSubtitle}>
                {settings.expenseCutoffEnabled
                  ? t('settings.cutoffOn', { day: settings.expenseCutoffDay ?? 1 })
                  : t('settings.cutoffOff')}
              </Text>
            </View>
            <Switch
              value={settings.expenseCutoffEnabled}
              onValueChange={handleCutoffToggle}
              trackColor={{ false: colors.cardBg, true: colors.green }}
              thumbColor={settings.expenseCutoffEnabled ? colors.green : colors.white}
            />
          </View>

          {settings.expenseCutoffEnabled && (
            <>
              <View style={styles.reminderDivider} />
              <View style={styles.reminderRow}>
                <Text style={styles.leadDaysLabel}>{t('settings.cutoffDay')}</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, (settings.expenseCutoffDay ?? 1) <= 1 && styles.stepperBtnDisabled]}
                    disabled={(settings.expenseCutoffDay ?? 1) <= 1}
                    onPress={() => changeCutoffDay(-1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Minus color={(settings.expenseCutoffDay ?? 1) <= 1 ? colors.secondaryText : colors.white} size={16} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{settings.expenseCutoffDay ?? 1}</Text>
                  <TouchableOpacity
                    style={[styles.stepperBtn, (settings.expenseCutoffDay ?? 1) >= 31 && styles.stepperBtnDisabled]}
                    disabled={(settings.expenseCutoffDay ?? 1) >= 31}
                    onPress={() => changeCutoffDay(1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Plus color={(settings.expenseCutoffDay ?? 1) >= 31 ? colors.secondaryText : colors.white} size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>{t('settings.backupSection')}</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleImport}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Upload color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.importBackup')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.importBackupSubtitle')}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleExport}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <Download color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.exportBackup')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.exportBackupSubtitle')}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.menuTitle}>{t('settings.autoBackups')}</Text>
              <Text style={styles.menuSubtitle}>
                {autoBackup.enabled
                  ? t(autoBackup.intervalDays > 1 ? 'settings.autoBackupsOnOther' : 'settings.autoBackupsOnOne', { days: autoBackup.intervalDays })
                  : t('settings.autoBackupsOff')}
              </Text>
            </View>
            <Switch
              value={autoBackup.enabled}
              onValueChange={(value) => updateAutoBackup({ enabled: value })}
              trackColor={{ false: colors.cardBg, true: colors.green }}
              thumbColor={autoBackup.enabled ? colors.green : colors.white}
            />
          </View>

          {autoBackup.enabled && (
            <>
              <View style={styles.reminderDivider} />
              <View style={styles.reminderRow}>
                <Text style={styles.leadDaysLabel}>{t('settings.autoBackupEvery')}</Text>
                <View style={styles.stepper}>
                  {AUTO_BACKUP_INTERVAL_OPTIONS.map(days => (
                    <TouchableOpacity
                      key={days}
                      style={[styles.intervalChip, autoBackup.intervalDays === days && styles.intervalChipActive]}
                      onPress={() => updateAutoBackup({ intervalDays: days })}
                    >
                      <Text style={styles.stepperValue}>{t('settings.autoBackupDaysShort', { days })}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.reminderDivider} />
              <TouchableOpacity style={styles.reminderRow} onPress={handleShareLatestBackup} activeOpacity={0.8}>
                <View style={styles.toggleTextWrapper}>
                  <Text style={styles.leadDaysLabel}>
                    {autoBackup.lastSuccessAt
                      ? t('settings.lastBackup', { date: new Date(autoBackup.lastSuccessAt).toLocaleDateString() })
                      : t('settings.noAutoBackups')}
                  </Text>
                  {autoBackup.lastError && (
                    <Text style={[styles.menuSubtitle, { color: colors.red }]}>
                      {t('settings.lastBackupFailed', { error: autoBackup.lastError })}
                    </Text>
                  )}
                </View>
                <Share2 color={colors.secondaryText} size={18} />
              </TouchableOpacity>
            </>
          )}
          <View style={styles.reminderDivider} />
          <Text style={[styles.menuSubtitle, { padding: 16 }]}>
            {t('settings.autoBackupNote')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleResetAll}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <RefreshCw color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={[styles.menuTitle, { color: colors.red }]}>{t('settings.resetAll')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.resetAllSubtitle')}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmDialog
        visible={showResetConfirm}
        title={t('settings.resetDialogTitle')}
        message={t('settings.resetDialogMessage')}
        confirmLabel={t('settings.resetDialogConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={async () => {
          await resetAllEnvelopes();
          setShowResetConfirm(false);
          showInfo(t('common.success'), t('settings.resetDone'));
        }}
        onCancel={() => setShowResetConfirm(false)}
      />

      <ConfirmDialog
        visible={showInfoDialog}
        title={infoDialogTitle}
        message={infoDialogMessage}
        confirmLabel={t('common.accept')}
        cancelLabel=""
        onConfirm={() => setShowInfoDialog(false)}
        onCancel={() => setShowInfoDialog(false)}
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.divider },
  menuIconWrapper: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.cardHighlight, borderWidth: 1, borderColor: colors.divider, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuTextWrapper: { flex: 1 },
  menuTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  menuSubtitle: { color: colors.secondaryText, fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.divider },
  toggleTextWrapper: { flex: 1, paddingRight: 12 },
  reminderCard: { backgroundColor: colors.cardBg, borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.divider, overflow: 'hidden' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  reminderDivider: { height: 1, backgroundColor: colors.divider },
  leadDaysLabel: { color: colors.white, fontSize: 15, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.bg, borderRadius: 20, padding: 4 },
  stepperBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardHighlight },
  intervalChip: { minWidth: 38, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  intervalChipActive: { backgroundColor: colors.cardHighlight },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperValue: { color: colors.white, fontSize: 15, fontWeight: '700', minWidth: 26, textAlign: 'center' },
});
