## Purpose

Defines how the envelope detail screen lists, sorts, limits, and lets users filter by month/year the transactions belonging to an envelope, so long transaction histories stay reviewable.

## Requirements

### Requirement: Default transactions list is the current month
The envelope detail screen's "Transacciones" section SHALL always default to filtering by the current calendar month and year, showing the envelope's non-archived transactions from that period sorted by `date` descending (most recent first), paginated in pages of at most 10 transactions. The user is never required to pick a month to see this default view.

#### Scenario: Opening the screen with transactions this month
- **WHEN** the user opens the detail screen of an envelope that has non-archived transactions dated in the current month and year
- **THEN** the system displays page 1 of those transactions, ordered most recent to oldest, with the month/year pill showing the current month and year

#### Scenario: Opening the screen with no transactions this month
- **WHEN** the user opens the detail screen of an envelope that has no non-archived transactions dated in the current month and year
- **THEN** the system shows the empty-state message for that period, per "Empty state for filtered period", without any action from the user

### Requirement: Numbered page navigation
When the transaction list for the selected month/year spans more than one page of 10 transactions, the system SHALL show numbered page controls (1, 2, 3, ...) that let the user jump directly to any page.

#### Scenario: List spans multiple pages
- **WHEN** the currently displayed month/year's transaction list has more than 10 transactions
- **THEN** the system shows numbered page controls for every page and highlights the currently active page

#### Scenario: Selecting a page number
- **WHEN** the user taps a page number
- **THEN** the system displays that page's transactions (up to 10), still ordered most recent to oldest

#### Scenario: Changing the month/year filter
- **WHEN** the user selects a different month/year from the picker
- **THEN** the system resets page navigation back to page 1 for the newly selected month

### Requirement: Month/year filter control
The "Transacciones" section SHALL show a single pill control displaying the currently selected month and year, which opens a full-screen month picker when tapped.

#### Scenario: Opening the month picker
- **WHEN** the user taps the month/year pill
- **THEN** the system opens a full-screen picker titled "Seleccione el mes que desea visualizar", listing only years and months for which the envelope has at least one transaction, grouped by year (most recent year first) with months in descending order within each year

#### Scenario: Selecting a month from the picker
- **WHEN** the user taps a month in the picker
- **THEN** the system closes the picker, applies that month/year as the active filter, and updates the month/year pill's label to match

### Requirement: Filtered transaction list
The "Transacciones" section SHALL show only the envelope's non-archived transactions dated within the selected month and year, sorted most recent to oldest, paginated in pages of at most 10 transactions per the "Numbered page navigation" requirement.

#### Scenario: Selected period has transactions
- **WHEN** the selected month and year has 1-10 matching transactions
- **THEN** the system shows only that period's transactions, sorted most recent to oldest, with no page navigation shown

#### Scenario: Selected period has more than 10 transactions
- **WHEN** the selected month and year has more than 10 matching transactions
- **THEN** the system shows page 1 (the 10 most recent) transactions of that period and shows numbered page controls to navigate the rest of that period's transactions

### Requirement: Empty state for filtered period
The system SHALL show a clear empty-state message when the selected month/year has no transactions for the envelope, distinct from the message shown when the envelope has no transactions at all.

#### Scenario: Selected period has no transactions, envelope has transactions elsewhere
- **WHEN** the selected month and year (including the default current month) has no non-archived transactions, but the envelope has non-archived transactions in other periods
- **THEN** the system displays an empty-state message specific to the period (e.g. "No hay transacciones en este período") instead of a transaction list

#### Scenario: Envelope has no transactions at all
- **WHEN** the envelope has zero non-archived transactions in any period
- **THEN** the system displays a generic empty-state message (e.g. "Sin transacciones aún") regardless of the selected period
