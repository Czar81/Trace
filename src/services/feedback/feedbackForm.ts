import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Public id of the Google Form that collects feedback (the part after /d/e/ in its link). */
const FORM_ID = '1FAIpQLSdB3eWVtvJCPO9jrHoTOyWTvR6FF-0xcACBO0MD4XcMYISrqA';
export const FEEDBACK_FORM_VIEW_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform`;
export const FEEDBACK_FORM_POST_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;

export type FeedbackField = 'kind' | 'screen' | 'message' | 'steps' | 'version' | 'device' | 'email';

/**
 * The form's question ids ("entry.123456"), from Form > ⋮ > Get pre-filled link.
 * The form has no email question yet; set `email` to its id to show the email field in the app.
 * If an id is missing the screen falls back to opening the form in the browser.
 */
export const FEEDBACK_ENTRY_IDS: Record<FeedbackField, string | null> = {
  kind: 'entry.1968508513',
  screen: 'entry.312628860',
  message: 'entry.1752424255',
  steps: 'entry.873668835',
  version: 'entry.2031637266',
  device: 'entry.2056316520',
  email: null,
};

export type FeedbackKind = 'bug' | 'idea' | 'other';
export type FeedbackTarget =
  | 'home' | 'budgets' | 'payments' | 'debts' | 'transfers' | 'import'
  | 'reports' | 'recurring' | 'settings' | 'other' | 'na';

export const FEEDBACK_KINDS: FeedbackKind[] = ['bug', 'idea', 'other'];
export const FEEDBACK_SCREENS: FeedbackTarget[] = [
  'home', 'budgets', 'payments', 'debts', 'transfers', 'import',
  'reports', 'recurring', 'settings', 'other', 'na',
];

/**
 * Multiple-choice answers must match the form's option text exactly, and the form's
 * options are in English, so the app sends these labels whatever language it shows.
 */
export const FORM_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: 'Bug',
  idea: 'Idea or improvement',
  other: 'Other',
};
export const FORM_SCREEN_LABELS: Record<FeedbackTarget, string> = {
  home: 'Home',
  budgets: 'Budgets',
  payments: 'Payments',
  debts: 'Debts',
  transfers: 'Transfers',
  import: 'Import',
  reports: 'Reports',
  recurring: 'Recurring',
  settings: 'Settings',
  other: 'Other',
  na: 'Not applicable',
};

export interface FeedbackInput {
  kind: FeedbackKind;
  screen: FeedbackTarget;
  message: string;
  steps: string;
  email: string;
  version: string;
  device: string;
}

export const hasEmailField = (): boolean => !!FEEDBACK_ENTRY_IDS.email;

export const isFeedbackConfigured = (): boolean =>
  (Object.keys(FEEDBACK_ENTRY_IDS) as FeedbackField[]).every(field => field === 'email' || !!FEEDBACK_ENTRY_IDS[field]);

export const isValidFeedbackEmail = (email: string): boolean =>
  email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/** Steps to reproduce only make sense for bugs, so other kinds drop them. */
export const buildFeedbackBody = (input: FeedbackInput, ids = FEEDBACK_ENTRY_IDS): string => {
  const values: Record<FeedbackField, string> = {
    kind: FORM_KIND_LABELS[input.kind],
    screen: FORM_SCREEN_LABELS[input.screen],
    message: input.message.trim(),
    steps: input.kind === 'bug' ? input.steps.trim() : '',
    version: input.version,
    device: input.device,
    email: input.email.trim(),
  };
  return (Object.keys(values) as FeedbackField[])
    .filter(field => ids[field] && values[field] !== '')
    .map(field => `${encodeURIComponent(ids[field]!)}=${encodeURIComponent(values[field])}`)
    .join('&');
};

export const getAppVersion = (): string => Constants.expoConfig?.version ?? '';

/** e.g. "Google Pixel 7, android 14". Uses RN's Platform so no native module is needed. */
export const getDeviceDescription = (): string => {
  const constants = Platform.constants as { Brand?: string; Model?: string; Release?: string };
  const model = [constants.Brand, constants.Model].filter(Boolean).join(' ');
  const os = `${Platform.OS} ${constants.Release ?? Platform.Version}`;
  return model ? `${model}, ${os}` : os;
};

const TIMEOUT_MS = 15000;

/** Posts the answers to the form. Google replies with a redirect/HTML page, so any response means it was accepted. */
export const submitFeedback = async (input: FeedbackInput): Promise<boolean> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(FEEDBACK_FORM_POST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildFeedbackBody(input),
      signal: controller.signal,
    });
    return response.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};
