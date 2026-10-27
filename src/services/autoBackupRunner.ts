import { AppData } from './appData';
import { createAutomaticBackup, isBackupDue } from './autoBackup';
import {
  AutoBackupState, loadAutoBackupState, saveAutoBackupLastSuccessAt, saveAutoBackupLastError,
} from './storage';

/**
 * Makes an automatic backup when one is due and returns the resulting state
 * (null if the state could not even be read). Never rejects.
 */
export async function runAutoBackup(data: AppData, now: Date): Promise<AutoBackupState | null> {
  try {
    const state = await loadAutoBackupState();
    if (!state.enabled || !isBackupDue(state.lastSuccessAt, state.intervalDays, now)) return state;
    try {
      await createAutomaticBackup(data, now, state.folderUri);
      const lastSuccessAt = now.toISOString();
      await saveAutoBackupLastSuccessAt(lastSuccessAt);
      await saveAutoBackupLastError(null);
      return { ...state, lastSuccessAt, lastError: null };
    } catch (e) {
      const lastError = e instanceof Error ? e.message : String(e);
      console.error('Automatic backup failed', e);
      await saveAutoBackupLastError(lastError);
      return { ...state, lastError };
    }
  } catch (e) {
    console.error('Automatic backup check failed', e);
    return null;
  }
}
