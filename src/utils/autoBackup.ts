import { documentDirectory, writeAsStringAsync, readDirectoryAsync, deleteAsync, EncodingType } from 'expo-file-system/legacy';
import { BackupData, buildFullBackupJson } from './exportData';

export const AUTO_BACKUP_PREFIX = 'trace-auto-backup-';
export const AUTO_BACKUP_SUFFIX = '.json';
export const AUTO_BACKUP_KEEP = 5;
export const AUTO_BACKUP_INTERVAL_OPTIONS = [1, 7, 15, 30];

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when no backup was ever made, or at least `intervalDays` have elapsed. */
export const isBackupDue = (lastSuccessAt: string | null, intervalDays: number, now: Date): boolean => {
  if (!lastSuccessAt) return true;
  const last = new Date(lastSuccessAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= intervalDays * DAY_MS;
};

const isAutoBackupFile = (name: string) =>
  name.startsWith(AUTO_BACKUP_PREFIX) && name.endsWith(AUTO_BACKUP_SUFFIX);

/** Lists automatic backup file names, newest first (the timestamp in the name sorts lexicographically). */
const listAutoBackupNames = async (): Promise<string[]> => {
  const names = await readDirectoryAsync(documentDirectory as string);
  return names.filter(isAutoBackupFile).sort().reverse();
};

export const pruneAutomaticBackups = async (keep: number = AUTO_BACKUP_KEEP): Promise<void> => {
  const names = await listAutoBackupNames();
  for (const name of names.slice(keep)) {
    await deleteAsync((documentDirectory as string) + name, { idempotent: true });
  }
};

/** Uri of the most recent automatic backup, or null when none exists. */
export const getLatestAutomaticBackupUri = async (): Promise<string | null> => {
  try {
    const [latest] = await listAutoBackupNames();
    return latest ? (documentDirectory as string) + latest : null;
  } catch {
    return null;
  }
};

/** Writes a timestamped full backup and prunes old ones. Throws on failure. */
export const createAutomaticBackup = async (data: BackupData, now: Date = new Date()): Promise<string> => {
  const json = buildFullBackupJson(data, now);
  // ':' and '.' are replaced to keep the name safe on every filesystem; order is preserved.
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const uri = `${documentDirectory}${AUTO_BACKUP_PREFIX}${stamp}${AUTO_BACKUP_SUFFIX}`;
  await writeAsStringAsync(uri, json, { encoding: EncodingType.UTF8 });
  await pruneAutomaticBackups();
  return uri;
};
