import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../../context/ExpenseContext';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Download from 'lucide-react-native/icons/download';
import Upload from 'lucide-react-native/icons/upload';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import FileSpreadsheet from 'lucide-react-native/icons/file-spreadsheet';
import Share2 from 'lucide-react-native/icons/share-2';
import FolderOpen from 'lucide-react-native/icons/folder-open';
import X from 'lucide-react-native/icons/x';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { exportBackupJson } from '../../services/backup/exportData';
import { getLatestAutomaticBackupUri, AUTO_BACKUP_INTERVAL_OPTIONS, canUseBackupFolder, pickBackupFolder, backupFolderLabel } from '../../services/backup/autoBackup';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { SPACING } from '../../theme/tokens';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { makeStyles } from './SettingsScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BackupSettings'>;

export const BackupSettingsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    envelopes, transactions, paymentMethods, categories, incomeCategories, recurringTemplates, settings,
    importFromBackup, resetAllEnvelopes, autoBackup, updateAutoBackup,
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

  const handleExport = async () => {
    try {
      await exportBackupJson({ envelopes, transactions, paymentMethods, categories, incomeCategories, recurringTemplates, settings });
      showInfo(t('settings.exportTitle'), t('settings.exportDone'));
    } catch (e) {
      console.error('Error exporting data:', e);
      showInfo(t('settings.exportTitle'), t('settings.exportFailed'));
    }
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

  const handlePickBackupFolder = async () => {
    try {
      const folderUri = await pickBackupFolder();
      if (folderUri) await updateAutoBackup({ folderUri });
    } catch (e) {
      console.error('Error picking backup folder', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.dataBackups')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ImportBankCsv')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconWrapper}>
            <FileSpreadsheet color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.importBankCsv')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.importBankCsvSubtitle')}</Text>
          </View>
        </TouchableOpacity>

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
              {canUseBackupFolder && (
                <>
                  <View style={styles.reminderDivider} />
                  <TouchableOpacity style={styles.reminderRow} onPress={handlePickBackupFolder} activeOpacity={0.8}>
                    <View style={styles.toggleTextWrapper}>
                      <Text style={styles.leadDaysLabel}>{t('settings.backupFolder')}</Text>
                      <Text style={styles.menuSubtitle}>
                        {autoBackup.folderUri
                          ? t('settings.backupFolderSet', { folder: backupFolderLabel(autoBackup.folderUri) })
                          : t('settings.backupFolderNone')}
                      </Text>
                    </View>
                    {autoBackup.folderUri ? (
                      <TouchableOpacity
                        onPress={() => updateAutoBackup({ folderUri: null })}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={t('settings.backupFolderRemove')}
                      >
                        <X color={colors.secondaryText} size={18} />
                      </TouchableOpacity>
                    ) : (
                      <FolderOpen color={colors.secondaryText} size={18} />
                    )}
                  </TouchableOpacity>
                </>
              )}
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
          <Text style={[styles.menuSubtitle, { padding: SPACING.lg }]}>
            {autoBackup.enabled && autoBackup.folderUri ? t('settings.autoBackupNoteFolder') : t('settings.autoBackupNote')}
          </Text>
        </View>

        <SettingsSectionHeader icon={<TriangleAlert color={colors.red} size={14} />} title={t('settings.dangerZone')} danger />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setShowResetConfirm(true)}
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
