## Purpose

Governs how a user marks an expense as funded from a savings envelope on the transaction form, so the control matches the rest of the app's visual language and makes the effect on the source envelope visible before saving.

## Requirements

### Requirement: Savings-source toggle is a native Switch
The "Este gasto sale de un sobre de ahorro" control on the transaction form SHALL be a native `Switch` component, matching the toggle style used elsewhere in the app (e.g. the "unlimited" toggle on the envelope form), instead of a custom touchable checkbox.

#### Scenario: User views the transaction form for an expense on a gasto envelope
- **WHEN** the user is creating or editing an expense transaction on a `gasto` envelope
- **THEN** the savings-source control renders as a `Switch`, not a checkbox-style touchable

### Requirement: Preview of impact on the source savings envelope
When a source savings envelope is selected, the system SHALL show a one-line preview of that envelope's resulting balance after this expense is deducted from it, using the current form's amount.

#### Scenario: User selects a source savings envelope with a valid amount entered
- **WHEN** the user has entered a transaction amount and selected a source savings envelope
- **THEN** the system displays a preview showing that envelope's balance after subtracting the entered amount

#### Scenario: No amount entered yet
- **WHEN** a source savings envelope is selected but the amount field is empty or invalid
- **THEN** the system does not show a preview (or shows the envelope's current balance without a projected change), avoiding a misleading calculation
