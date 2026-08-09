## Purpose

Replaces plain italic-text empty states across list/section views with a component that includes a call-to-action, so an empty screen gives the user something to do instead of just stating there's nothing there.

## Requirements

### Requirement: Empty states include a call-to-action where a next action exists
When a list or section has no items to display and there is a clear next action available to the user (e.g. creating the first envelope, the first recurring transaction), the system SHALL show an empty-state view with a call-to-action for that next step, instead of plain text alone.

#### Scenario: Main envelope list has no envelopes
- **WHEN** a user has no envelopes and views the main screen
- **THEN** the empty state shows a call-to-action to create the first envelope

#### Scenario: Recurring transactions list is empty
- **WHEN** a user has no recurring transaction templates and views the recurring transactions screen
- **THEN** the empty state shows a call-to-action to create the first recurring transaction

### Requirement: Empty states without a clear next action remain informational
When a list or section has no items and there is no clear next action for the user to take from that screen (e.g. a reports view or a filtered/period-scoped transaction list with no results for that filter), the system SHALL show an empty-state view without a misleading or irrelevant call-to-action.

#### Scenario: Reports screen has no data for the selected period
- **WHEN** a user views a report section with no data for the currently selected period
- **THEN** the empty state communicates there's no data for that period, without a call-to-action that doesn't apply to a reports view

#### Scenario: Envelope transaction history has no results for the selected filter
- **WHEN** a user filters an envelope's transaction history to a period with no matching transactions
- **THEN** the empty state communicates there are no transactions for that filter, without prompting an action unrelated to the current filter
