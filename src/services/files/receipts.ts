import { documentDirectory, makeDirectoryAsync, copyAsync, deleteAsync, getInfoAsync } from 'expo-file-system/legacy';

const RECEIPTS_DIR = `${documentDirectory ?? ''}receipts/`;

/** Copies a picked/captured image into app storage (picker URIs live in a cache the OS may clear) and returns its new URI. */
export const saveReceiptImage = async (sourceUri: string): Promise<string> => {
  await makeDirectoryAsync(RECEIPTS_DIR, { intermediates: true }).catch(() => {});
  const ext = /\.(jpe?g|png|webp|heic)$/i.exec(sourceUri.split('?')[0])?.[0] ?? '.jpg';
  const dest = `${RECEIPTS_DIR}${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
  await copyAsync({ from: sourceUri, to: dest });
  return dest;
};

/**
 * Deletes the `candidates` that no transaction in `remaining` still references
 * (a split expense shares its photos across several transactions).
 */
export const deleteUnreferencedReceipts = async (
  candidates: string[] | undefined,
  remaining: { receiptUris?: string[] }[]
): Promise<void> => {
  if (!candidates || candidates.length === 0) return;
  const inUse = new Set(remaining.flatMap(t => t.receiptUris ?? []));
  await Promise.all(candidates.filter(uri => !inUse.has(uri)).map(deleteReceiptImage));
};

/** Best-effort removal; only touches files inside the receipts folder. */
export const deleteReceiptImage = async (uri?: string): Promise<void> => {
  if (!uri || !uri.startsWith(RECEIPTS_DIR)) return;
  try {
    const info = await getInfoAsync(uri);
    if (info.exists) await deleteAsync(uri, { idempotent: true });
  } catch {
    // A leftover file is harmless; never fail a transaction operation over it.
  }
};
