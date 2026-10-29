import { TranslationKey } from '../../i18n';

/**
 * Layout of the Settings list. Every setting lives in exactly one section; the screen
 * maps each id to its row. "data" opens the BackupSettings sub-screen.
 */
export type SettingsItemId =
  | 'appearance' | 'language' | 'currency' | 'tutorial'
  | 'categories' | 'paymentMethods'
  | 'billReminders'
  | 'appLock'
  | 'dataBackups';

export type SettingsSectionId = 'general' | 'finance' | 'alerts' | 'security' | 'data';

export interface SettingsSection {
  id: SettingsSectionId;
  titleKey: TranslationKey;
  items: SettingsItemId[];
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'general', titleKey: 'settings.sectionGeneral', items: ['appearance', 'language', 'currency', 'tutorial'] },
  { id: 'finance', titleKey: 'settings.sectionFinance', items: ['categories', 'paymentMethods'] },
  { id: 'alerts', titleKey: 'settings.sectionAlerts', items: ['billReminders'] },
  { id: 'security', titleKey: 'settings.sectionSecurity', items: ['appLock'] },
  { id: 'data', titleKey: 'settings.sectionData', items: ['dataBackups'] },
];

export const sectionTitleKey = (id: SettingsSectionId): TranslationKey =>
  SETTINGS_SECTIONS.find(section => section.id === id)!.titleKey;
