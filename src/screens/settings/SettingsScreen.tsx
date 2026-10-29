import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../../context/ExpenseContext';
import { authenticate, isDeviceAuthAvailable } from '../../services/device/deviceAuth';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CreditCard from 'lucide-react-native/icons/credit-card';
import Tag from 'lucide-react-native/icons/tag';
import BookOpen from 'lucide-react-native/icons/book-open';
import Palette from 'lucide-react-native/icons/palette';
import Settings2 from 'lucide-react-native/icons/settings-2';
import Wallet from 'lucide-react-native/icons/wallet';
import Shield from 'lucide-react-native/icons/shield';
import Database from 'lucide-react-native/icons/database';
import DatabaseBackup from 'lucide-react-native/icons/database-backup';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { CurrencySelector } from '../../components/forms/CurrencySelector';
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


export const SettingsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t, preference, setPreference } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { settings, updateSettings } = useAppData();

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

        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <Text style={styles.leadDaysLabel}>{t('currency.default')}</Text>
            <CurrencySelector
              compact
              label={t('currency.default')}
              value={settings.defaultCurrency}
              onSelect={(defaultCurrency) => updateSettings({ defaultCurrency })}
            />
          </View>
          <View style={styles.settingsRowDivider} />
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
            <BookOpen color={colors.white} size={18} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={styles.menuTitle}>{t('settings.tutorial')}</Text>
            <Text style={styles.menuSubtitle}>{t('settings.tutorialSubtitle')}</Text>
          </View>
          <ChevronRight color={colors.secondaryText} size={20} />
        </TouchableOpacity>

        <SettingsSectionHeader icon={<Wallet color={colors.secondaryText} size={14} />} title={t(sectionTitleKey('finance'))} />

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
