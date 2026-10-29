import { useCallback, useEffect, useState } from 'react';
import { useAppData } from '../../context/ExpenseContext';
import { FirstStepId, getFirstStepsProgress } from '../../domain/onboarding/firstSteps';
import { FirstStepsState, loadAutoBackupState, loadFirstStepsState, saveFirstStepsState } from '../../services/storage/storage';

/** State for the Home checklist. Call `refresh` when the screen regains focus so the backup step picks up changes made in Settings. */
export const useFirstSteps = () => {
  const { envelopes, transactions } = useAppData();
  const [state, setState] = useState<FirstStepsState | null>(null);
  const [backup, setBackup] = useState({ enabled: false, lastBackupAt: null as string | null });

  const refresh = useCallback(async () => {
    const auto = await loadAutoBackupState();
    setBackup({ enabled: auto.enabled, lastBackupAt: auto.lastSuccessAt });
  }, []);

  useEffect(() => {
    loadFirstStepsState().then(setState);
    refresh();
  }, [refresh]);

  const changeState = useCallback((next: FirstStepsState) => {
    setState(next);
    saveFirstStepsState(next);
  }, []);

  const progress: Record<FirstStepId, boolean> = getFirstStepsProgress({
    envelopes, transactions, backupEnabled: backup.enabled, lastBackupAt: backup.lastBackupAt,
  });
  return { state, progress, changeState, refresh };
};
