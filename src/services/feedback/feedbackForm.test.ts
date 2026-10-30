import {
  buildFeedbackBody, isFeedbackConfigured, isValidFeedbackEmail,
  FEEDBACK_KINDS, FEEDBACK_SCREENS, FORM_KIND_LABELS, FORM_SCREEN_LABELS, FeedbackInput,
} from './feedbackForm';

const IDS = {
  kind: 'entry.1', screen: 'entry.2', message: 'entry.3', steps: 'entry.4',
  email: 'entry.5', version: 'entry.6', device: 'entry.7', tech: 'entry.8',
};

const input: FeedbackInput = {
  kind: 'bug', screen: 'budgets', message: ' No guarda & falla ', steps: '1. Abrir\n2. Guardar',
  email: ' a@b.co ', version: '3.5.0', device: 'Google Pixel 7, android 14', tech: 'language: es',
};

describe('buildFeedbackBody', () => {
  it('maps neutral codes to the form option text and url-encodes values', () => {
    const body = new URLSearchParams(buildFeedbackBody(input, IDS));
    expect(body.get('entry.1')).toBe('Bug');
    expect(body.get('entry.2')).toBe('Budgets');
    expect(body.get('entry.3')).toBe('No guarda & falla');
    expect(body.get('entry.4')).toBe('1. Abrir\n2. Guardar');
    expect(body.get('entry.5')).toBe('a@b.co');
    expect(body.get('entry.6')).toBe('3.5.0');
    expect(body.get('entry.8')).toBe('language: es');
  });

  it('drops steps unless the feedback is a bug', () => {
    const body = new URLSearchParams(buildFeedbackBody({ ...input, kind: 'idea' }, IDS));
    expect(body.has('entry.4')).toBe(false);
  });

  it('omits empty optional fields and fields without an entry id', () => {
    const body = new URLSearchParams(buildFeedbackBody({ ...input, email: '', tech: '' }, { ...IDS, device: null as never }));
    expect(body.has('entry.5')).toBe(false);
    expect(body.has('entry.8')).toBe(false);
    expect(body.has('entry.7')).toBe(false);
  });
});

describe('feedback options', () => {
  it('have a form label for every kind and screen', () => {
    for (const kind of FEEDBACK_KINDS) expect(FORM_KIND_LABELS[kind]).toBeTruthy();
    for (const screen of FEEDBACK_SCREENS) expect(FORM_SCREEN_LABELS[screen]).toBeTruthy();
  });

  it('is configured once every question id is set', () => {
    expect(isFeedbackConfigured()).toBe(true);
  });
});

describe('isValidFeedbackEmail', () => {
  it('accepts empty or well-formed emails only', () => {
    expect(isValidFeedbackEmail('')).toBe(true);
    expect(isValidFeedbackEmail('a@b.co')).toBe(true);
    expect(isValidFeedbackEmail('nope')).toBe(false);
  });
});
