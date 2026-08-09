## Purpose

Keeps corrupted or malformed data (a hand-edited or truncated backup file, an invalid form input) from being silently persisted, so the app never ends up with `NaN` amounts, non-array collections, or negative budgets that would corrupt balance calculations elsewhere.

## Requirements

### Requirement: Backup import validates collection shapes
The system SHALL reject a backup during import if `envelopes`, `transactions`, `paymentMethods`, or `categories` is present but not an array, showing an error instead of accepting the malformed backup.

#### Scenario: Backup has a non-array collection
- **WHEN** a user imports a backup JSON file where `envelopes` (or any of the other three collections) is not an array (e.g. a string or object)
- **THEN** the system rejects the import with an error message and does not modify any existing app data

### Requirement: Backup import validates transaction amounts
The system SHALL reject a backup during import if any transaction's `amount` is not a finite number, showing an error instead of accepting the malformed backup.

#### Scenario: Backup contains a transaction with a non-numeric amount
- **WHEN** a user imports a backup JSON file containing a transaction whose `amount` field is missing, `NaN`, or not a number
- **THEN** the system rejects the import with an error message and does not modify any existing app data

### Requirement: Valid backups are unaffected
The system SHALL continue to accept and import any backup that was valid before this change (all four collections are arrays, all transaction amounts are finite numbers), with no change to the resulting imported data.

#### Scenario: Importing a well-formed backup
- **WHEN** a user imports a backup JSON file with array collections and numeric transaction amounts, exported by this app before or after this change
- **THEN** the import succeeds exactly as it did before this change

### Requirement: Envelope limit must be a valid non-negative number
The system SHALL prevent saving an envelope (new or edited) with a limit that is not a finite, non-negative number, showing an inline error instead of silently saving invalid data.

#### Scenario: User leaves the limit field in an invalid state
- **WHEN** a user submits the envelope form with a limit field that parses to `NaN` or a negative number (and the envelope is not marked unlimited)
- **THEN** the system does not save the envelope and shows an inline validation error

#### Scenario: User enters a valid limit
- **WHEN** a user submits the envelope form with a limit field that parses to a finite, non-negative number, or the envelope is marked unlimited
- **THEN** the system saves the envelope exactly as it did before this change
