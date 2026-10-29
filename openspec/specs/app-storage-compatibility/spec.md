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
- **THEN** the default currency falls back to the same default value as before this change (`defaultCurrency: 'CRC'`) whenever no stored value exists

### Requirement: Legacy cutoff settings are dropped
The system SHALL ignore `expenseCutoffEnabled`, `expenseCutoffDay` and `expenseCutoffDate` in stored settings and imported backups, because the monthly cutoff is fixed at day 1.

#### Scenario: Stored settings carry legacy cutoff fields
- **WHEN** a user's stored settings contain any of those fields
- **THEN** `loadSettings` returns settings without them and the cutoff applies on day 1

### Requirement: Backup import/export shape is unchanged
The system SHALL keep the full-backup JSON shape produced by `exportDataToCSV` and consumed by `parseBackup`/`pickAndImportBackup` compatible, changing it only by adding an `incomeCategories` field. Backups created before this change (without `incomeCategories`) SHALL still import while preserving their existing behavior, and backups created after this change remain importable by the same logic.

#### Scenario: Importing a backup created before this refactor
- **WHEN** a user imports a JSON backup file exported by a version of the app prior to this refactor
- **THEN** the import succeeds and populates envelopes, transactions, payment methods, categories, and settings exactly as `parseBackup` did before this change, with legacy cutoff fields dropped

#### Scenario: Importing a legacy backup leaves income categories intact
- **WHEN** a user imports a backup that has no `incomeCategories` field
- **THEN** the import succeeds and does not clear the income categories already on the device

#### Scenario: Exporting includes income categories
- **WHEN** the user exports a backup
- **THEN** the exported JSON includes the current income categories under an `incomeCategories` field
