## Purpose

Lets a user attach a photo of a receipt to a transaction.

## Requirements

### Requirement: Attach a receipt photo
The transaction form SHALL let the user take a photo with the camera or choose one from the gallery. The image SHALL be copied to the app's documents folder and referenced by `Transaction.receiptUri`. When a transaction is split, the receipt is attached to the first part.

#### Scenario: Viewing
- **WHEN** a transaction has a receipt
- **THEN** the envelope detail list shows a paperclip that opens the image full screen

#### Scenario: Cleanup
- **WHEN** the receipt is removed or replaced, the transaction or its envelope is deleted, or the form is closed without saving
- **THEN** the stored image file is deleted

### Requirement: Receipts are not part of backups
Backup export/import SHALL NOT include receipt image files; imported transactions may reference files that do not exist on the device.
