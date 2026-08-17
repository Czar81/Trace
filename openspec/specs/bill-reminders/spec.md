## Purpose

Warns the user proactively, via a scheduled local device notification, a few days before an active recurring transaction template is about to generate its transaction, so they can make sure funds are available before the charge lands.

## Requirements

### Requirement: Bill reminders are opt-in and off by default
The system SHALL keep bill reminders disabled by default for both new and existing installs, and SHALL only enable them when the user explicitly turns on the "Recordatorios de facturas" setting.

#### Scenario: Existing user opens the app after this feature ships
- **WHEN** a user who already had the app installed opens it after this update
- **THEN** bill reminders remain off until they explicitly enable the setting

### Requirement: Enabling reminders requests notification permission
The first time the user enables bill reminders, the system SHALL request OS notification permission if it has not already been granted or denied.

#### Scenario: User enables reminders for the first time, permission not yet requested
- **WHEN** the user turns on "Recordatorios de facturas" and the app has not yet asked for notification permission
- **THEN** the system requests permission from the OS before the setting takes effect

#### Scenario: Permission already granted via budget alerts
- **WHEN** the user turns on "Recordatorios de facturas" and OS notification permission was already granted (e.g. via enabling budget alerts previously)
- **THEN** the system does not re-prompt and reminders take effect immediately

#### Scenario: User has denied permission previously
- **WHEN** the user turns on "Recordatorios de facturas" but OS notification permission was previously denied
- **THEN** the system leaves the setting on (reflecting user intent) but no notification is delivered until the user grants permission via OS settings; the system SHALL NOT crash or repeatedly re-prompt

### Requirement: Reminder is scheduled 2 days before an active template's due date
When bill reminders are enabled, the system SHALL schedule a local notification 2 days before each active recurring template's clamped day of month for its next upcoming occurrence, naming the template's description and amount.

#### Scenario: Active template due on the 15th
- **WHEN** bill reminders are enabled and a template is active with clamped day of month 15 for the current period, and no reminder has been scheduled yet for that occurrence
- **THEN** the system schedules a local notification for the 13th naming the template's description and amount

#### Scenario: Reminder date would fall in the past
- **WHEN** bill reminders are enabled and the computed reminder date (due date minus 2 days) for the template's current-period occurrence has already passed
- **THEN** the system does not schedule a reminder for that occurrence

### Requirement: No duplicate reminder for the same occurrence
The system SHALL NOT schedule more than one reminder for the same template's occurrence in a given period.

#### Scenario: App reopened after a reminder was already scheduled this period
- **WHEN** the user reopens the app and a reminder was already scheduled for a template's current-period occurrence
- **THEN** the system does not schedule a second reminder for that occurrence

### Requirement: Reminder is cancelled when its template is paused, edited, or deleted
The system SHALL cancel a template's pending scheduled reminder when the template is paused (deactivated), deleted, or edited in a way that changes its day of month, and SHALL reschedule per the current settings when applicable.

#### Scenario: User pauses a template with a pending reminder
- **WHEN** the user deactivates a recurring template that has a reminder scheduled for its upcoming occurrence
- **THEN** the system cancels that scheduled reminder

#### Scenario: User deletes a template with a pending reminder
- **WHEN** the user deletes a recurring template that has a reminder scheduled for its upcoming occurrence
- **THEN** the system cancels that scheduled reminder

#### Scenario: User changes a template's day of month
- **WHEN** the user edits an active template's day of month and it previously had a reminder scheduled for the old date
- **THEN** the system cancels the old scheduled reminder and schedules a new one based on the updated day of month, per the "Reminder is scheduled" requirement

### Requirement: Reminders only apply to active templates
The system SHALL NOT schedule reminders for paused (inactive) recurring templates.

#### Scenario: Template is paused when reminders are enabled
- **WHEN** bill reminders are enabled and a recurring template is paused (`isActive: false`)
- **THEN** the system does not schedule a reminder for that template
