import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DATE_LOCALES,
  DEFAULT_LANGUAGE_PREFERENCE,
  DICTIONARIES,
  Language,
  LanguagePreference,
  TranslateFn,
  getDeviceLocale,
  resolveLanguage,
  setActiveLanguage,
  translate,
} from '../i18n';
import { loadLanguagePreference, saveLanguagePreference } from '../utils/storage';

interface LanguageContextType {
  preference: LanguagePreference;
  language: Language;
  /** Locale for formatting dates, e.g. `es-ES`. */
  locale: string;
  t: TranslateFn;
  setPreference: (preference: LanguagePreference) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<LanguagePreference>(DEFAULT_LANGUAGE_PREFERENCE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    loadLanguagePreference().then((stored) => {
      if (!active) return;
      setPreferenceState(stored);
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  const setPreference = useCallback(async (next: LanguagePreference) => {
    setPreferenceState(next);
    await saveLanguagePreference(next);
  }, []);

  const language = useMemo(() => resolveLanguage(preference, getDeviceLocale()), [preference]);

  const value = useMemo<LanguageContextType>(() => {
    setActiveLanguage(language);
    const dict = DICTIONARIES[language];
    return {
      preference,
      language,
      locale: DATE_LOCALES[language],
      t: (key, params) => translate(dict, key, params),
      setPreference,
    };
  }, [preference, language, setPreference]);

  // Wait for the stored preference so English users never see a Spanish flash.
  if (!loaded) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
