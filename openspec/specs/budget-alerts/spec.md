## Purpose

Warns the user proactively, via a local device notification, when a spending envelope's usage crosses 80% or 100% of its limit, so overspending is noticed at the moment it happens instead of discovered later in a report.

## Requirements

### Requirement: Budget alerts are opt-in and off by default
The system SHALL keep budget alerts disabled by default for both new and existing installs, and SHALL only enable them when the user explicitly turns on the "Alertas de presupuesto" setting.

#### Scenario: Existing user opens the app after this feature ships
- **WHEN** a user who already had the app installed opens it after this update
- **THEN** budget alerts remain off until they explicitly enable the setting

### Requirement: Enabling alerts requests notification permission
The first time the user enables budget alerts, the system SHALL request OS notification permission if it has not already been granted or denied.

#### Scenario: User enables alerts for the first time
- **WHEN** the user turns on "Alertas de presupuesto" and the app has not yet asked for notification permission
- **THEN** the system requests permission from the OS before the setting takes effect

#### Scenario: User has denied permission previously
- **WHEN** the user turns on "Alertas de presupuesto" but OS notification permission was previously denied
- **THEN** the system leaves the setting on (reflecting user intent) but no notification is delivered until the user grants permission via OS settings; the system SHALL NOT crash or repeatedly re-prompt

### Requirement: Alert fires when crossing 80% of a spending envelope's limit
When budget alerts are enabled and a new or edited expense transaction causes a `gasto` envelope with a limit (not unlimited) to go from below 80% to 80% or more of its limit spent, the system SHALL send a local notification naming the envelope and its current percentage spent.

#### Scenario: Expense pushes an envelope from 70% to 85% spent
- **WHEN** budget alerts are enabled and adding or editing an expense transaction changes a limited `gasto` envelope's spend from 70% to 85% of its limit
- **THEN** the system sends one local notification indicating the envelope is at 85% of its budget

### Requirement: Alert fires when crossing 100% of a spending envelope's limit
When budget alerts are enabled and a new or edited expense transaction causes a `gasto` envelope with a limit to go from under 100% to 100% or more of its limit spent, the system SHALL send a local notification indicating the envelope has been exceeded, distinct from the 80% alert.

#### Scenario: Expense pushes an envelope from 90% to 110% spent
- **WHEN** budget alerts are enabled and an expense transaction changes a limited `gasto` envelope's spend from 90% to 110% of its limit
- **THEN** the system sends one local notification indicating the envelope has exceeded its budget (in addition to the 80% alert already having fired earlier when it first crossed that threshold)

### Requirement: No duplicate alerts for the same threshold
The system SHALL NOT send a repeat 80% or 100% alert for an envelope that is already at or above that threshold; the alert only fires on the transition into the threshold band.

#### Scenario: Envelope is already over 100% and another expense is added
- **WHEN** budget alerts are enabled and an expense is added to a `gasto` envelope that was already at or above 100% of its limit before the transaction
- **THEN** the system does not send another alert for the 100% (or 80%) threshold for that transaction

### Requirement: Alerts only apply to limited spending envelopes
The system SHALL NOT send budget alerts for `ahorro` envelopes or for `gasto` envelopes marked unlimited.

#### Scenario: Expense added to an unlimited gasto envelope
- **WHEN** an expense transaction is added to a `gasto` envelope with `isUnlimited: true`
- **THEN** the system does not evaluate or send any budget alert for that transaction
