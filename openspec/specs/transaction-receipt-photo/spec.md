## Purpose

Lets a user attach a photo of a receipt to a transaction.

## Requirements

### Requirement: Attach receipt photos
The transaction form SHALL let the user take photos with the camera or choose several from the gallery. The images SHALL be copied to the app's documents folder and referenced by `Transaction.receiptUris`. When a transaction is split, every part references the same photos.

#### Scenario: Viewing
- **WHEN** a transaction has a receipt
- **THEN** the envelope detail list shows a paperclip (with the count when more than one) that opens the photos full screen, swipeable

#### Scenario: Cleanup
- **WHEN** the receipt is removed or replaced, the transaction or its envelope is deleted, or the form is closed without saving
- **THEN** the stored image file is deleted, unless another transaction still references it

### Requirement: Receipts are not part of backups
Backup export/import SHALL NOT include receipt image files; imported transactions may reference files that do not exist on the device.
