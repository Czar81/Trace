## Purpose

Lets a user record a single purchase that belongs to several categories or envelopes.

## Requirements

### Requirement: A new expense can be split into parts
When creating (not editing) an expense on a non-debt envelope, the system SHALL offer a split mode with at least two parts, each with an envelope (same currency, non-debt), a category and an amount. Saving SHALL create one expense transaction per part, sharing date, description and payment method.

#### Scenario: Parts add up
- **WHEN** the part amounts sum exactly to the total and the user saves
- **THEN** one expense is created per part in a single save

#### Scenario: Parts do not add up
- **WHEN** the part amounts differ from the total, or a part has no amount
- **THEN** the system shows an error and creates nothing

### Requirement: Split mode replaces funding from savings
While split mode is on, the "pay from savings" option SHALL be hidden.
