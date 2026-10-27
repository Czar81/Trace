jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockWrite = jest.fn();
const mockReadDir = jest.fn();
const mockDelete = jest.fn();
const mockSafCreate = jest.fn();
const mockSafReadDir = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  writeAsStringAsync: (...a: any[]) => mockWrite(...a),
  readDirectoryAsync: (...a: any[]) => mockReadDir(...a),
  deleteAsync: (...a: any[]) => mockDelete(...a),
  EncodingType: { UTF8: 'utf8' },
  StorageAccessFramework: {
    createFileAsync: (...a: any[]) => mockSafCreate(...a),
    readDirectoryAsync: (...a: any[]) => mockSafReadDir(...a),
  },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

import { BackupData } from './exportData';
import { isBackupDue, pruneAutomaticBackups, createAutomaticBackup, getLatestAutomaticBackupUri, backupFolderLabel } from './autoBackup';
import { DEFAULT_SETTINGS } from './storage';

const name = (d: string) => `trace-auto-backup-${d}.json`;

beforeEach(() => jest.clearAllMocks());

const EMPTY: BackupData = {
  envelopes: [], transactions: [], paymentMethods: [], categories: [], incomeCategories: [], recurringTemplates: [], settings: DEFAULT_SETTINGS,
};

describe('isBackupDue', () => {
  const now = new Date('2026-01-10T00:00:00.000Z');

  it('is due when there is no previous backup', () => {
    expect(isBackupDue(null, 7, now)).toBe(true);
  });

  it('is not due before the interval elapses', () => {
    expect(isBackupDue('2026-01-08T00:00:00.000Z', 7, now)).toBe(false);
    expect(isBackupDue('2026-01-03T00:00:01.000Z', 7, now)).toBe(false);
  });

  it('is due exactly at and after the interval', () => {
    expect(isBackupDue('2026-01-03T00:00:00.000Z', 7, now)).toBe(true);
    expect(isBackupDue('2026-01-02T00:00:00.000Z', 7, now)).toBe(true);
  });

  it('treats an unparseable timestamp as due', () => {
    expect(isBackupDue('garbage', 7, now)).toBe(true);
  });
});

describe('pruneAutomaticBackups', () => {
  it('deletes the oldest beyond the limit and ignores other files', async () => {
    mockReadDir.mockResolvedValue([
      name('2026-01-03'), name('2026-01-01'), 'trace_backup_123.json',
      name('2026-01-06'), name('2026-01-02'), name('2026-01-05'), name('2026-01-04'),
    ]);

    await pruneAutomaticBackups(5);

    const deleted = mockDelete.mock.calls.map(c => c[0]);
    expect(deleted).toEqual(['file:///docs/' + name('2026-01-01')]);
  });

  it('deletes nothing when at or under the limit', async () => {
    mockReadDir.mockResolvedValue([name('2026-01-01'), name('2026-01-02')]);
    await pruneAutomaticBackups(5);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('createAutomaticBackup / getLatestAutomaticBackupUri', () => {
  it('writes a timestamped file then prunes', async () => {
    mockReadDir.mockResolvedValue([]);
    const uri = await createAutomaticBackup(EMPTY, new Date('2026-01-01T10:20:30.456Z'));
    expect(uri).toBe('file:///docs/trace-auto-backup-2026-01-01T10-20-30-456Z.json');
    expect(mockWrite).toHaveBeenCalledWith(uri, expect.any(String), { encoding: 'utf8' });
    expect(mockReadDir).toHaveBeenCalled();
  });

  it('propagates write failures', async () => {
    mockWrite.mockRejectedValueOnce(new Error('disk full'));
    await expect(createAutomaticBackup(EMPTY)).rejects.toThrow('disk full');
  });

  it('returns the newest backup uri, or null when none', async () => {
    mockReadDir.mockResolvedValue([name('2026-01-01'), name('2026-01-03'), name('2026-01-02')]);
    await expect(getLatestAutomaticBackupUri()).resolves.toBe('file:///docs/' + name('2026-01-03'));
    mockReadDir.mockResolvedValue([]);
    await expect(getLatestAutomaticBackupUri()).resolves.toBeNull();
  });
});

describe('backup folder outside the app', () => {
  const folder = 'content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FTrace';
  const safFile = (stamp: string) => `${folder}/document/primary%3ADocuments%2FTrace%2Ftrace-auto-backup-${stamp}.json`;

  it('also writes the backup to the picked folder and keeps the newest there', async () => {
    mockReadDir.mockResolvedValue([]);
    mockSafCreate.mockResolvedValue(safFile('new'));
    const existing = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06'].map(safFile);
    mockSafReadDir.mockResolvedValue([...existing, `${folder}/document/primary%3ADocuments%2FTrace%2Fother.pdf`]);

    await createAutomaticBackup(EMPTY, new Date('2026-01-07T00:00:00.000Z'), folder);

    expect(mockSafCreate).toHaveBeenCalledWith(folder, 'trace-auto-backup-2026-01-07T00-00-00-000Z', 'application/json');
    expect(mockWrite).toHaveBeenCalledWith(safFile('new'), expect.any(String), { encoding: 'utf8' });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith(safFile('2026-01-01'), { idempotent: true });
  });

  it('keeps the in-app copy when the folder write fails', async () => {
    mockReadDir.mockResolvedValue([]);
    mockSafCreate.mockRejectedValue(new Error('permission revoked'));
    await expect(createAutomaticBackup(EMPTY, new Date(), folder)).rejects.toThrow('permission revoked');
    expect(mockWrite).toHaveBeenCalledTimes(1);
  });

  it('shows a readable folder name', () => {
    expect(backupFolderLabel(folder)).toBe('Documents/Trace');
  });
});
