import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../../context/ExpenseContext';
import { authenticate, isDeviceAuthAvailable } from '../../services/device/deviceAuth';
import { ArrowLeft, ChevronRight, ChevronDown, CreditCard, DollarSign, Tag, Download, Upload, RefreshCw, TrendingDown, FileSpreadsheet, Palette, Share2, FolderOpen, X } from 'lucide-react-native';
import { exportBackupJson } from '../../services/backup/exportData';
import { getLatestAutomaticBackupUri, AUTO_BACKUP_INTERVAL_OPTIONS, canUseBackupFolder, pickBackupFolder, backupFolderLabel } from '../../services/backup/autoBackup';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { CurrencySelector } from '../../components/forms/CurrencySelector';
import { DayGridSheet } from '../../components/forms/DayGridSheet';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { LanguagePreference } from '../../i18n';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { sectionTitleKey } from './settingsSections';
import { makeStyles } from './SettingsScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const LANGUAGE_OPTIONS: { value: LanguagePreference; labelKey: 'settings.languageSpanish' | 'settings.languageEnglish' | 'settings.languageSystem' }[] = [
  { value: 'es', labelKey: 'settings.languageSpanish' },
  { value: 'en', labelKey: 'settings.languageEnglish' },
  { value: 'system', labelKey: 'settings.languageSystem' },
];

const LEAD_DAYS_OPTIONS = [1, 2, 3, 5, 7];

export const SettingsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t, preference, setPreference } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { settings, updateSettings } = useAppData();

  const [showCutoffSheet, setShowCutoffSheet] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoDialogTitle, setInfoDialogTitle] = useState('');
  const [infoDialogMessage, setInfoDialogMessage] = useState('');

  const handleToggleAppLock = async () => {
    if (settings.appLockEnabled) {
      // Turning the lock off also requires proving it is the owner.
      if (await authenticate(t('lock.prompt'), t('common.cancel'))) await updateSettings({ appLockEnabled: false });
      return;
    }
    if (!(await isDeviceAuthAvailable())) {
      showInfo(t('lock.title'), t('lock.unavailable'));
      return;
    }
    if (await authenticate(t('lock.prompt'), t('common.cancel'))) await updateSettings({ appLockEnabled: true });
  };

  const showInfo = (title: string, message: string) => {
    setInfoDialogTitle(title);
    setInfoDialogMessage(message);
    setShowInfoDialog(true);
  };

  const handleCutoffToggle = (value: boolean) => {
    updateSettings({
      expenseCutoffEnabled: value,
      expenseCutoffDay: value ? (settings.expenseCutoffDay ?? 1) : settings.expenseCutoffDay,
    });
  };

  // Saved values from before the chips (e.g. 4 or 6 days) stay selectable.
  const leadDaysOptions = LEAD_DAYS_OPTIONS.includes(settings.billReminderLeadDays)
    ? LEAD_DAYS_OPTIONS
    : [...LEAD_DAYS_OPTIONS, settings.billReminderLeadDays].sort((a, b) => a - b);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SettingsSectionHeader icon={<Settings2 color={colors.secondaryText} size={14} />} title={t(sectionTitleKey('general'))} />

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

        <CurrencySelector
          label={t('currency.default')}
          value={settings.defaultCurrency}
          onSelect={(defaultCurrency) => updateSettings({ defaultCurrency })}
        />

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

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Onboarding')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <HelpCircle color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.viewTutorial')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.viewTutorialSubtitle')}</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <SettingsSectionHeader icon={<Wallet color={colors.secondaryText} size={14} />} title={t(sectionTitleKey('finance'))} />

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
                <TouchableOpacity style={styles.dayPill} onPress={() => setShowCutoffSheet(true)} activeOpacity={0.8}>
                  <Text style={styles.stepperValue}>{t('settings.dayN', { day: settings.expenseCutoffDay ?? 1 })}</Text>
                  <ChevronDown color={colors.secondaryText} size={16} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

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
          onPress={() => navigation.navigate('DebtPayoffPlan')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <TrendingDown color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.debtPayoff')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.debtPayoffSubtitle')}</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <SettingsSectionHeader icon={<Bell color={colors.secondaryText} size={14} />} title={t(sectionTitleKey('alerts'))} />

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
              <View style={[styles.reminderRow, styles.reminderRowStacked]}>
                <Text style={styles.leadDaysLabel}>{t('settings.leadDays')}</Text>
                <View style={[styles.stepper, styles.stepperFull]}>
                  {leadDaysOptions.map(days => (
                    <TouchableOpacity
                      key={days}
                      style={[styles.intervalChip, settings.billReminderLeadDays === days && styles.intervalChipActive]}
                      onPress={() => updateSettings({ billReminderLeadDays: days })}
                    >
                      <Text style={styles.stepperValue}>{t('settings.autoBackupDaysShort', { days })}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>


        <SettingsSectionHeader icon={<Shield color={colors.secondaryText} size={14} />} title={t(sectionTitleKey('security'))} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrapper}>
            <Text style={styles.menuTitle}>{t('lock.title')}</Text>
            <Text style={styles.menuSubtitle}>{t('lock.subtitle')}</Text>
          </View>
          <Switch
            value={!!settings.appLockEnabled}
            onValueChange={handleToggleAppLock}
            trackColor={{ false: colors.cardBg, true: colors.green }}
            thumbColor={settings.appLockEnabled ? colors.green : colors.white}
          />
        </View>

        <SettingsSectionHeader icon={<Database color={colors.secondaryText} size={14} />} title={t(sectionTitleKey('data'))} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('BackupSettings')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <DatabaseBackup color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.dataBackups')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.dataBackupsSubtitle')}</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>
      </ScrollView>

      <DayGridSheet
        visible={showCutoffSheet}
        title={t('settings.cutoffDay')}
        subtitle={t('settings.cutoffEveryMonth')}
        value={settings.expenseCutoffDay ?? 1}
        onSelect={day => updateSettings({ expenseCutoffDay: day })}
        onClose={() => setShowCutoffSheet(false)}
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
