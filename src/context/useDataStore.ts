import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { translateActive } from '../i18n';
import { AppData, EMPTY_DATA } from '../services/storage/appData';
import {
  saveEnvelopes, saveTransactions, savePaymentMethods, saveCategories, saveIncomeCategories,
  saveRecurringTemplates, saveSettings,
} from '../services/storage/storage';

export type Commit = (changes: Partial<AppData>) => Promise<void>;
export type RunExclusive = <T>(task: () => Promise<T>) => Promise<T>;

/** What the action hooks need to change data safely. */
export interface Store {
  /** Always holds the latest committed values; read from it, never from a render's closure. */
  data: { readonly current: AppData };
  runExclusive: RunExclusive;
  commit: Commit;
}

const SAVERS: { [K in keyof AppData]: (value: AppData[K]) => Promise<unknown> } = {
  envelopes: saveEnvelopes,
  transactions: saveTransactions,
  paymentMethods: savePaymentMethods,
  categories: saveCategories,
  incomeCategories: saveIncomeCategories,
  recurringTemplates: saveRecurringTemplates,
  settings: saveSettings,
};

/**
 * Serialized access to the app data. Every change runs through `runExclusive`,
 * one at a time, starting only after `releaseInit()` (the initial load) — so a
 * change made before the load finishes, or two quick changes in a row, never
 * overwrite each other.
 */
export function useDataStore() {
  const [state, setState] = useState<AppData>(EMPTY_DATA);
  const data = useRef<AppData>(EMPTY_DATA);
  // Set when stored data couldn't be read: saving then would replace the
  // user's real data with whatever is in memory.
  const writesBlocked = useRef(false);
  const initGate = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  if (!initGate.current) {
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>(r => { resolve = r; });
    initGate.current = { promise, resolve };
  }
  const queue = useRef<Promise<unknown>>(initGate.current.promise);
  const lastSaveErrorAt = useRef(0);

  const runExclusive = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(task);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  /** Applies changes to memory and state, then persists them (unless writes are blocked). */
  const commit = useCallback<Commit>(async changes => {
    data.current = { ...data.current, ...changes };
    setState(prev => ({ ...prev, ...changes }));
    const saves: Promise<unknown>[] = [];
    if (!writesBlocked.current) {
      for (const key of Object.keys(changes) as (keyof AppData)[]) {
        const value = changes[key];
        // ponytail: one cast, the key/value pairing is guaranteed by SAVERS' mapped type
        if (value) saves.push((SAVERS[key] as (v: unknown) => Promise<unknown>)(value));
      }
    }
    const results = await Promise.allSettled(saves);
    // One alert per burst of failures, not one per collection.
    if (results.some(r => r.status === 'rejected') && Date.now() - lastSaveErrorAt.current > 10_000) {
      lastSaveErrorAt.current = Date.now();
      Alert.alert(translateActive('storage.saveFailedTitle'), translateActive('storage.saveFailedBody'));
    }
  }, []);

  const releaseInit = useCallback(() => initGate.current?.resolve(), []);

  return { state, data, writesBlocked, runExclusive, commit, releaseInit };
}
