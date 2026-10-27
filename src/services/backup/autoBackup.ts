import { Platform } from 'react-native';
import { documentDirectory, writeAsStringAsync, readDirectoryAsync, deleteAsync, EncodingType, StorageAccessFramework } from 'expo-file-system/legacy';
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

/** Whether backups can also go to a folder the user picks (Android's Storage Access Framework). */
export const canUseBackupFolder = Platform.OS === 'android';

/** Asks the user for a folder outside the app; resolves its URI, or null when they cancel. */
export const pickBackupFolder = async (): Promise<string | null> => {
  if (!canUseBackupFolder) return null;
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  return permission.granted ? permission.directoryUri : null;
};

/** Readable name for a folder URI, e.g. ".../tree/primary%3ADocuments%2FTrace" -> "Documents/Trace". */
export const backupFolderLabel = (folderUri: string): string => {
  const decoded = decodeURIComponent(folderUri);
  const tree = decoded.split('/tree/').pop() ?? decoded;
  return tree.includes(':') ? tree.slice(tree.indexOf(':') + 1) || tree : tree;
};

/** Copies the backup into the user's folder and keeps only the newest `keep` there. */
const writeToBackupFolder = async (folderUri: string, baseName: string, json: string, keep: number) => {
  const fileUri = await StorageAccessFramework.createFileAsync(folderUri, baseName, 'application/json');
  await writeAsStringAsync(fileUri, json, { encoding: EncodingType.UTF8 });
  // SAF lists content URIs whose (encoded) last segment carries the file name.
  const names = await StorageAccessFramework.readDirectoryAsync(folderUri);
  const backups = names
    .filter(uri => decodeURIComponent(uri).includes(AUTO_BACKUP_PREFIX))
    .sort((a, b) => decodeURIComponent(a).localeCompare(decodeURIComponent(b)))
    .reverse();
  for (const uri of backups.slice(keep)) {
    await deleteAsync(uri, { idempotent: true });
  }
};

/**
 * Writes a timestamped full backup in the app's storage, and also in
 * `folderUri` when the user picked one, pruning old ones. Throws on failure;
 * the copy in the app's storage is kept even when the folder copy fails.
 */
export const createAutomaticBackup = async (
  data: BackupData,
  now: Date = new Date(),
  folderUri: string | null = null
): Promise<string> => {
  const json = buildFullBackupJson(data, now);
  // ':' and '.' are replaced to keep the name safe on every filesystem; order is preserved.
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const uri = `${documentDirectory}${AUTO_BACKUP_PREFIX}${stamp}${AUTO_BACKUP_SUFFIX}`;
  await writeAsStringAsync(uri, json, { encoding: EncodingType.UTF8 });
  await pruneAutomaticBackups();
  if (folderUri) {
    await writeToBackupFolder(folderUri, `${AUTO_BACKUP_PREFIX}${stamp}`, json, AUTO_BACKUP_KEEP);
  }
  return uri;
};
