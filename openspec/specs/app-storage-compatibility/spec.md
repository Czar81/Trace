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
- **THEN** the default currency, exchange rates, and cutoff settings fall back to the same default values as before this change (`defaultCurrency: 'CRC'`, `exchangeRates: { USD_TO_CRC: 510, EUR_TO_CRC: 550 }`, `expenseCutoffEnabled: false`, `expenseCutoffDay: null`) whenever no stored value exists

### Requirement: Legacy expenseCutoffDate settings continue to migrate
The system SHALL preserve the existing one-way migration in `loadSettings` that derives `expenseCutoffDay` from a legacy stored `expenseCutoffDate` field when `expenseCutoffDay` is not already present.

#### Scenario: User has only the legacy cutoff date field stored
- **WHEN** a user's stored settings contain `expenseCutoffDate` but no `expenseCutoffDay`
- **THEN** the system SHALL derive `expenseCutoffDay` from the day-of-month of `expenseCutoffDate` and use it, exactly as before this change

### Requirement: Backup import/export shape is unchanged
The system SHALL keep the full-backup JSON shape produced by `exportDataToCSV` and consumed by `parseBackup`/`pickAndImportBackup` unchanged, so backups created before this change can still be imported after it, and backups created after this change remain importable by the same logic.

#### Scenario: Importing a backup created before this refactor
- **WHEN** a user imports a JSON backup file exported by a version of the app prior to this refactor
- **THEN** the import succeeds and populates envelopes, transactions, payment methods, categories, and settings exactly as `parseBackup` did before this change, including the `expenseCutoffDate` migration path

