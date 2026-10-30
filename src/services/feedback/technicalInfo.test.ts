import { buildTechnicalInfo, sanitizeError, daysBetween, TechnicalInfoInput } from './technicalInfo';
import { checkSendLimit, recordSend } from './sendLimit';

const input: TechnicalInfoInput = {
  language: 'es', locale: 'es-CR', timezone: 'America/Costa_Rica', theme: 'dark', defaultCurrency: 'CRC',
  appLock: true, autoBackup: false, envelopes: 14, transactions: 1250, recurring: 6,
  daysSinceFirstOpen: 42, originScreen: 'Settings', lastError: null,
};

describe('buildTechnicalInfo', () => {
  it('writes one key: value line per datum and skips empty ones', () => {
    const lines = buildTechnicalInfo({ ...input, timezone: '' }).split('\n');
    expect(lines).toContain('language: es');
    expect(lines).toContain('app_lock: on');
    expect(lines).toContain('auto_backup: off');
    expect(lines).toContain('envelopes: 14');
    expect(lines.some(l => l.startsWith('timezone'))).toBe(false);
    expect(lines.some(l => l.startsWith('last_error'))).toBe(false);
  });

  it('keeps only the first line of the last error and truncates it', () => {
    expect(sanitizeError('TypeError: x\n    at /data/user/0/app/file.js:1')).toBe('TypeError: x');
    expect(sanitizeError('a'.repeat(400))).toHaveLength(301);
    expect(buildTechnicalInfo({ ...input, lastError: 'Boom\nstack' })).toContain('last_error: Boom');
  });
});

describe('daysBetween', () => {
  it('counts whole days and ignores invalid dates', () => {
    expect(daysBetween('2026-10-01T00:00:00.000Z', new Date('2026-10-30T12:00:00.000Z'))).toBe(29);
    expect(daysBetween('nope', new Date())).toBeNull();
  });
});

describe('send limit', () => {
  const now = Date.UTC(2026, 9, 30, 12);
  it('allows a first send and blocks a second within a minute', () => {
    expect(checkSendLimit([], now)).toBe('ok');
    expect(checkSendLimit([now - 30_000], now)).toBe('minute');
  });
  it('blocks the sixth send within 24 hours', () => {
    const five = [1, 2, 3, 4, 5].map(h => now - h * 3600_000);
    expect(checkSendLimit(five, now)).toBe('day');
    expect(checkSendLimit(five.slice(1), now)).toBe('ok');
  });
  it('drops sends older than a day when recording', () => {
    expect(recordSend([now - 25 * 3600_000, now - 3600_000], now)).toEqual([now - 3600_000, now]);
  });
});
