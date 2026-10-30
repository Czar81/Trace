import {
  buildFeedbackBody, isFeedbackConfigured, isValidFeedbackEmail,
  FEEDBACK_KINDS, FEEDBACK_SCREENS, FORM_KIND_LABELS, FORM_SCREEN_LABELS, FeedbackInput,
} from './feedbackForm';

const IDS = {
  kind: 'entry.1', screen: 'entry.2', message: 'entry.3', steps: 'entry.4',
  version: 'entry.5', device: 'entry.6', email: 'entry.7',
};

const input: FeedbackInput = {
  kind: 'bug', screen: 'budgets', message: ' No guarda & falla ', steps: '1. Abrir\n2. Guardar',
  email: ' a@b.co ', version: '3.5.0', device: 'Google Pixel 7, android 14',
};

describe('buildFeedbackBody', () => {
  it('maps neutral codes to the form option text and url-encodes values', () => {
    const body = new URLSearchParams(buildFeedbackBody(input, IDS));
    expect(body.get('entry.1')).toBe('Error');
    expect(body.get('entry.2')).toBe('Presupuestos');
    expect(body.get('entry.3')).toBe('No guarda & falla');
    expect(body.get('entry.4')).toBe('1. Abrir\n2. Guardar');
    expect(body.get('entry.7')).toBe('a@b.co');
  });

  it('drops steps unless the feedback is a bug', () => {
    const body = new URLSearchParams(buildFeedbackBody({ ...input, kind: 'idea' }, IDS));
    expect(body.has('entry.4')).toBe(false);
  });

  it('omits empty optional fields and fields without an entry id', () => {
    const body = new URLSearchParams(buildFeedbackBody({ ...input, email: '' }, { ...IDS, device: null as never }));
    expect(body.has('entry.7')).toBe(false);
    expect(body.has('entry.6')).toBe(false);
  });
});

describe('feedback options', () => {
  it('have a form label for every kind and screen', () => {
    for (const kind of FEEDBACK_KINDS) expect(FORM_KIND_LABELS[kind]).toBeTruthy();
    for (const screen of FEEDBACK_SCREENS) expect(FORM_SCREEN_LABELS[screen]).toBeTruthy();
  });

  it('knows the form is not configured until every entry id is set', () => {
    expect(isFeedbackConfigured()).toBe(false);
  });
});

describe('isValidFeedbackEmail', () => {
  it('accepts empty or well-formed emails only', () => {
    expect(isValidFeedbackEmail('')).toBe(true);
    expect(isValidFeedbackEmail('a@b.co')).toBe(true);
    expect(isValidFeedbackEmail('nope')).toBe(false);
  });
});
