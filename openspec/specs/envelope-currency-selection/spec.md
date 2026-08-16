## Purpose

Lets a user pick the currency for an envelope while creating it, instead of being locked to the app's default currency and having to change it elsewhere after the fact.

## Requirements

### Requirement: Envelope currency is selectable during creation
The system SHALL let a user choose the envelope's currency while creating it, without leaving the envelope creation screen. If the user does not change it, the envelope SHALL default to `settings.defaultCurrency`, matching current behavior.

#### Scenario: User creates an envelope without changing currency
- **WHEN** a user creates a new envelope and does not interact with the currency selector
- **THEN** the envelope is saved with `settings.defaultCurrency`, exactly as before this change

#### Scenario: User picks a different currency during creation
- **WHEN** a user creates a new envelope and selects a currency other than the app default from the currency selector
- **THEN** the envelope is saved with the selected currency, without navigating away from the creation screen
