## Purpose

Lets a user move an amount directly from one envelope to another, of any type and in either direction, without it being recorded as spend or income anywhere in the app.

## Requirements

### Requirement: User can transfer between any two envelopes
The system SHALL let the user create a transfer moving a positive amount from a source envelope to a destination envelope, where source and destination may be any two distinct envelopes regardless of type (`gasto` or `ahorro`).

#### Scenario: Transfer between two gasto envelopes
- **WHEN** the user creates a transfer of an amount from a `gasto` envelope to a different `gasto` envelope
- **THEN** the system records the transfer, decreasing the source envelope's balance and increasing the destination envelope's balance by that amount

#### Scenario: Transfer between two ahorro envelopes
- **WHEN** the user creates a transfer of an amount from an `ahorro` envelope to a different `ahorro` envelope
- **THEN** the system records the transfer, decreasing the source envelope's balance and increasing the destination envelope's balance by that amount

#### Scenario: Transfer between a gasto and an ahorro envelope
- **WHEN** the user creates a transfer between a `gasto` envelope and an `ahorro` envelope, in either direction
- **THEN** the system records the transfer, decreasing the source envelope's balance and increasing the destination envelope's balance by that amount

#### Scenario: User attempts to transfer to the same envelope
- **WHEN** the user selects the same envelope as both source and destination
- **THEN** the system prevents confirming the transfer and indicates that source and destination must differ

### Requirement: Transfers require matching currency
The system SHALL only allow a transfer between two envelopes that share the same currency.

#### Scenario: Source and destination have different currencies
- **WHEN** the user selects a source and destination envelope with different currencies
- **THEN** the system prevents confirming the transfer and indicates the envelopes must share a currency

### Requirement: Preview shows both envelopes' resulting balances
Before confirming a transfer, the system SHALL show the resulting balance of both the source and destination envelopes given the entered amount.

#### Scenario: User has entered a valid amount and selected both envelopes
- **WHEN** the user has selected a source envelope, a destination envelope, and entered a valid positive amount
- **THEN** the system displays a preview of each envelope's balance after the transfer

### Requirement: Transfers are excluded from expense and income totals
The system SHALL NOT count a transfer as an expense or as income in any report, summary total, or budget-alert calculation for either the source or destination envelope.

#### Scenario: Transfer out of a gasto envelope with budget alerts enabled
- **WHEN** budget alerts are enabled and a transfer moves money out of a `gasto` envelope
- **THEN** the system does not evaluate or send a budget alert for that transfer

#### Scenario: Transfer appears in envelope history but not in expense/income reports
- **WHEN** a transfer has been created between two envelopes
- **THEN** the transfer appears in each envelope's transaction history, but is not included in expense or income totals in the Reportes screen

### Requirement: Transfers are excluded from expense-cutoff-period filtering
A transfer's effect on an envelope's balance SHALL NOT be filtered by the expense-cutoff-period setting; it always applies to the envelope's current balance regardless of the transfer's date relative to the cutoff.

#### Scenario: Cutoff enabled and a transfer is dated before the current cutoff period start
- **WHEN** expense cutoff is enabled and a transfer's date falls before the current cutoff period's start
- **THEN** the transfer still affects both envelopes' current balances (it is not excluded the way a pre-cutoff expense would be)

### Requirement: Transfer entry point from an envelope's detail screen
The system SHALL provide a way to start a transfer from an envelope's detail screen, with that envelope preselected as the source.

#### Scenario: User starts a transfer from an envelope's detail screen
- **WHEN** the user opens the transfer action from an envelope's detail screen
- **THEN** the system preselects that envelope as the source and lets the user choose the destination envelope, amount, and an optional note

### Requirement: Transfers appear in both envelopes' transaction history
A recorded transfer SHALL appear in the transaction history of both the source and the destination envelope, identifiable as a transfer rather than an expense or income.

#### Scenario: User views the destination envelope's history after a transfer
- **WHEN** the user opens the destination envelope's transaction history after a transfer into it
- **THEN** the transfer is listed there, visually distinguishable from an expense or income entry
