import { es, TranslationKey } from './es';
import { getLocales } from 'expo-localization';
import { en } from './en';

export type { TranslationKey };
export type Language = 'es' | 'en';
export type LanguagePreference = Language | 'system';
export type TranslationParams = Record<string, string | number>;
export type Dictionary = Partial<Record<TranslationKey, string>>;

export type TranslateFn = (key: TranslationKey, params?: TranslationParams) => string;

export const DEFAULT_LANGUAGE: Language = 'es';
export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = 'system';
export const SUPPORTED_LANGUAGES: Language[] = ['es', 'en'];

/** Locale used to format dates in each language. */
export const DATE_LOCALES: Record<Language, string> = { es: 'es-ES', en: 'en-US' };

export const DICTIONARIES: Record<Language, Dictionary> = { es, en };

export const isLanguagePreference = (value: unknown): value is LanguagePreference =>
  value === 'system' || SUPPORTED_LANGUAGES.includes(value as Language);

/**
 * Reads the device locale via expo-localization, falling back to Intl when the
 * native module is unavailable. Returns e.g. "en-US", or "" when unknown.
 */
export const getDeviceLocale = (): string => {
  try {
    const tag = getLocales()?.[0]?.languageTag;
    if (tag) return tag;
  } catch {
    // fall through to Intl
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? '';
  } catch {
    return '';
  }
};

/** Turns the stored preference into a concrete supported language. */
export const resolveLanguage = (preference: LanguagePreference, deviceLocale: string): Language => {
  if (preference !== 'system') {
    return SUPPORTED_LANGUAGES.includes(preference) ? preference : DEFAULT_LANGUAGE;
  }
  const code = deviceLocale.toLowerCase().split(/[-_]/)[0] as Language;
  return SUPPORTED_LANGUAGES.includes(code) ? code : DEFAULT_LANGUAGE;
};

/** Looks up `key` in `dict`, falling back to Spanish, and fills `{param}` placeholders. */
export const translate = (dict: Dictionary, key: TranslationKey, params?: TranslationParams): string => {
  const template = dict[key] || es[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
};

/** Spanish `t` for non-React code (utils, tests) that is not given a language. */
export const translateDefault: TranslateFn = (key, params) => translate(es, key, params);

let activeLanguage: Language = DEFAULT_LANGUAGE;

/** Called by LanguageProvider so non-React code (contexts, utils) follows the active language. */
export const setActiveLanguage = (language: Language) => {
  activeLanguage = language;
};

/** `t` bound to the currently active language, for code outside the component tree. */
export const translateActive: TranslateFn = (key, params) =>
  translate(DICTIONARIES[activeLanguage], key, params);
