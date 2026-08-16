## Purpose

Lets users define transactions that repeat every month (salary, subscriptions, recurring savings contributions) once, instead of re-entering them manually every period, and have them appear automatically when due.

## Requirements

### Requirement: Create a recurring transaction template
The system SHALL let the user create a recurring transaction template specifying an envelope, type (expense/income), amount, description, a day of month (1-31), and, for expense templates, an optional category, payment method, and source savings envelope — the same optional fields available on a regular transaction.

#### Scenario: User creates a monthly recurring expense
- **WHEN** the user fills out the recurring transaction form with an envelope, amount, description, and day of month, and saves
- **THEN** the system creates a new active recurring template with those values

### Requirement: Day-of-month is clamped on short months
When generating a transaction for a month shorter than the template's configured day of month, the system SHALL use the last day of that month instead of an invalid date.

#### Scenario: Template day is 31 and the current month is February
- **WHEN** a template configured for day 31 is due for generation in a month with only 28 or 29 days
- **THEN** the system generates the transaction dated on the last day of that month

### Requirement: Automatic generation on app launch
On app launch, the system SHALL generate a transaction for every active recurring template whose configured day of month (clamped per the current period) has arrived and for which no transaction has yet been generated for the current calendar month, without requiring any user action.

#### Scenario: App opened after a template's day has passed this month
- **WHEN** the user opens the app and an active template's clamped day-of-month for the current month is today or earlier, and no transaction has been generated from it for the current month yet
- **THEN** the system creates a transaction from that template (dated on the template's clamped day for the current month) and records that the current month has been generated for this template

#### Scenario: App opened again the same month after generation already happened
- **WHEN** the user reopens the app later in the same calendar month after a template's transaction has already been generated
- **THEN** the system does not generate a duplicate transaction for that template this month

#### Scenario: Template's day has not arrived yet this month
- **WHEN** an active template's clamped day-of-month for the current month is later than today
- **THEN** the system does not generate a transaction for it this month

### Requirement: Pause and resume a template
The system SHALL let the user pause (deactivate) and resume (reactivate) a recurring template without deleting it. A paused template SHALL NOT generate transactions while paused.

#### Scenario: User pauses a template
- **WHEN** the user toggles an active template to paused
- **THEN** the system stops generating transactions from it on future app launches until it is resumed

### Requirement: Delete a template
The system SHALL let the user permanently delete a recurring template. Deleting a template SHALL NOT delete transactions it already generated.

#### Scenario: User deletes a template
- **WHEN** the user deletes a recurring template
- **THEN** the system removes the template from the list, and any transactions previously generated from it remain unchanged in their envelope's history

### Requirement: Templates list shows all recurring templates
The system SHALL provide a screen, reachable from Settings, listing every recurring template with its envelope, amount, day of month, and active/paused state.

#### Scenario: User opens the recurring transactions list
- **WHEN** the user navigates to Settings → Recurrentes
- **THEN** the system shows every existing template with enough detail to identify it (envelope name, amount, day of month, active/paused)
