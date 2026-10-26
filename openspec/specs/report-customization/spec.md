## Purpose
TBD

## Requirements

### Requirement: Reports screen shows summary metrics for the selected period
The system SHALL show, at the top of the Reports screen, total income, total expenses, net balance (income minus expenses), average expense per transaction, and the number of expense transactions for the selected period. All amounts SHALL be converted to the common currency, and archived transactions SHALL be excluded.

#### Scenario: Summary reflects the selected period
- **WHEN** the user selects a reporting period
- **THEN** the summary metrics SHALL recompute using only transactions within that period

#### Scenario: No transactions in the period
- **WHEN** the selected period has no transactions
- **THEN** the summary SHALL show zero totals and SHALL NOT show an average expense

### Requirement: User can show or hide report sections
The system SHALL let the user show or hide each report section on the Reports screen. Hidden sections SHALL remain available in the layout editor.

#### Scenario: User hides a section
- **WHEN** the user turns off the "Top transactions" section in the layout editor
- **THEN** that section SHALL NOT appear on the Reports screen until the user turns it back on

### Requirement: User can reorder report sections
The system SHALL let the user change the order of the report sections on the Reports screen.

#### Scenario: User moves a section up
- **WHEN** the user moves "Spending by month" above "Spending by category"
- **THEN** the Reports screen SHALL display "Spending by month" first

### Requirement: Report layout can be reset to the default
The system SHALL provide a reset action that restores the default section order and visibility.

#### Scenario: User resets the layout
- **WHEN** the user taps reset in the layout editor
- **THEN** all sections SHALL be visible in the default order

### Requirement: Report layout persists across app restarts
The system SHALL store the report layout locally and restore it on the next launch. A missing or corrupted stored layout SHALL fall back to the default layout without an error.

#### Scenario: Corrupted layout data
- **WHEN** the stored layout cannot be parsed
- **THEN** the Reports screen SHALL show the default layout
