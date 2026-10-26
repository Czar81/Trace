## Purpose
TBD

## Requirements

### Requirement: User can choose the app language
The system SHALL let the user choose the app language from Spanish, English, or "system", where "system" follows the device language and falls back to Spanish when the device language is not supported.

#### Scenario: User switches to English
- **WHEN** the user selects English in Settings
- **THEN** all translated screens SHALL display English text without restarting the app

#### Scenario: System language is unsupported
- **WHEN** the language option is "system" and the device language is not supported
- **THEN** the app SHALL display Spanish

### Requirement: Language choice persists across launches
The system SHALL store the selected language locally and apply it on the next launch. Stored language data SHALL NOT be included in backups.

#### Scenario: User reopens the app
- **WHEN** the user previously selected English and relaunches the app
- **THEN** the app SHALL start in English

### Requirement: Missing translations fall back to Spanish
The system SHALL display the Spanish text for any string that has no translation in the selected language.

#### Scenario: Key missing in English
- **WHEN** a string key has no English entry and English is selected
- **THEN** the Spanish text for that key SHALL be displayed

### Requirement: Stored user data is not translated
The system SHALL NOT change any user-entered data, such as transaction descriptions, envelope names, or category names, when the language changes.

#### Scenario: Language switch leaves data unchanged
- **WHEN** the user switches the app language
- **THEN** existing envelope, category, and transaction names SHALL remain exactly as stored
