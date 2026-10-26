## Purpose
TBD

## Requirements

### Requirement: User can enable automatic backups with an interval
The system SHALL provide a setting to enable automatic backups and choose an interval in days. Automatic backups SHALL be disabled by default.

#### Scenario: User enables automatic backups
- **WHEN** the user turns on automatic backups and selects a 7-day interval
- **THEN** the system stores the setting and creates a backup on the next app launch if no automatic backup exists yet

#### Scenario: Automatic backups are off by default
- **WHEN** the app is opened for the first time after the update
- **THEN** no automatic backup is created until the user enables the setting

### Requirement: Automatic backup runs when the interval has elapsed
The system SHALL create a full backup on app launch when automatic backups are enabled and the last automatic backup is at least the configured number of days old.

#### Scenario: Interval has elapsed
- **WHEN** automatic backups are enabled with a 7-day interval and the last backup was 8 days ago
- **THEN** the system creates a new full backup and records its timestamp

#### Scenario: Interval has not elapsed
- **WHEN** automatic backups are enabled with a 7-day interval and the last backup was 2 days ago
- **THEN** the system creates no backup

### Requirement: Automatic backups are retained with a fixed limit
The system SHALL keep at most 5 automatic backups and SHALL delete the oldest when a new one is created beyond that limit.

#### Scenario: Sixth backup replaces the oldest
- **WHEN** five automatic backups exist and a new one is created
- **THEN** the system keeps the five most recent backups and removes the oldest

### Requirement: Automatic backup failures do not block the app
The system SHALL NOT block app startup or show a blocking error when an automatic backup fails. The failure SHALL be recorded and shown as a non-blocking message in Settings.

#### Scenario: Storage is full during automatic backup
- **WHEN** the automatic backup cannot be written
- **THEN** the app continues to load normally and Settings shows that the last automatic backup failed

### Requirement: User can open the latest automatic backup
The system SHALL show the date of the last successful automatic backup in Settings and SHALL let the user share that backup file.

#### Scenario: User shares the latest backup
- **WHEN** the user taps the latest automatic backup entry in Settings
- **THEN** the system opens the share sheet with that backup file
