const mockDelete = jest.fn(async () => {});
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  deleteAsync: (...args: unknown[]) => (mockDelete as any)(...args),
}));

import { deleteUnreferencedReceipts } from './receipts';

describe('deleteUnreferencedReceipts', () => {
  beforeEach(() => mockDelete.mockClear());

  it('keeps photos still used by another transaction (split expenses share files)', async () => {
    const shared = 'file:///docs/receipts/a.jpg';
    const own = 'file:///docs/receipts/b.jpg';
    await deleteUnreferencedReceipts([shared, own], [{ receiptUris: [shared] }]);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect((mockDelete.mock.calls[0] as unknown[])[0]).toBe(own);
  });

  it('ignores files outside the receipts folder', async () => {
    await deleteUnreferencedReceipts(['file:///other/c.jpg'], []);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
