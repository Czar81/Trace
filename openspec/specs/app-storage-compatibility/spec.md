# app-storage-compatibility Specification

## Purpose
TBD - created by archiving change refactor-app-architecture. Update Purpose after archive.
## Requirements

### Requirement: Existing AsyncStorage data loads unchanged after the update
The system SHALL continue to read envelopes, transactions, payment methods, categories, and settings from the same `AsyncStorage` keys (`@trace_envelopes`, `@trace_transactions`, `@trace_payment_methods`, `@trace_categories`, `@trace_settings`) used before this refactor, with no key renames and no change to the JSON shape written or expected for any of them.

#### Scenario: User updates the app with existing data
- **WHEN** a user who already has envelopes, transactions, payment methods, categories, and settings saved from a prior version opens the app after updating
- **THEN** all of that data loads and displays exactly as it did before the update, with no data loss and no reset to defaults

#### Scenario: Settings default values are unchanged
- **WHEN** the app loads settings via `loadSettings`
- **THEN** the default currency and cutoff settings fall back to the same default values as before this change (`defaultCurrency: 'CRC'`, `expenseCutoffDay: 1`) whenever no stored value exists. The monthly cutoff is always active; a stored or imported `expenseCutoffEnabled` flag (or a null `expenseCutoffDay`) is ignored and the day falls back to 1

### Requirement: Legacy expenseCutoffDate settings continue to migrate
The system SHALL preserve the existing one-way migration in `loadSettings` that derives `expenseCutoffDay` from a legacy stored `expenseCutoffDate` field when `expenseCutoffDay` is not already present.

#### Scenario: User has only the legacy cutoff date field stored
- **WHEN** a user's stored settings contain `expenseCutoffDate` but no `expenseCutoffDay`
- **THEN** the system SHALL derive `expenseCutoffDay` from the day-of-month of `expenseCutoffDate` and use it, exactly as before this change

### Requirement: Backup import/export shape is unchanged
The system SHALL keep the full-backup JSON shape produced by `exportDataToCSV` and consumed by `parseBackup`/`pickAndImportBackup` compatible, changing it only by adding an `incomeCategories` field. Backups created before this change (without `incomeCategories`) SHALL still import while preserving their existing behavior, and backups created after this change remain importable by the same logic.

#### Scenario: Importing a backup created before this refactor
- **WHEN** a user imports a JSON backup file exported by a version of the app prior to this refactor
- **THEN** the import succeeds and populates envelopes, transactions, payment methods, categories, and settings exactly as `parseBackup` did before this change, including the `expenseCutoffDate` migration path

#### Scenario: Importing a legacy backup leaves income categories intact
- **WHEN** a user imports a backup that has no `incomeCategories` field
- **THEN** the import succeeds and does not clear the income categories already on the device

#### Scenario: Exporting includes income categories
- **WHEN** the user exports a backup
- **THEN** the exported JSON includes the current income categories under an `incomeCategories` field
