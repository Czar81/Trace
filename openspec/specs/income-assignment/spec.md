## Purpose

Lets a user split one income (e.g. a paycheck) across several envelopes in a single step, tracking how much is still unassigned.

## Requirements

### Requirement: Income can be split across envelopes
The system SHALL provide a screen where the user enters a total income and a currency, assigns an amount to each non-debt envelope of that currency, and sees the amount still unassigned. Saving SHALL record one `income` transaction per envelope with an amount greater than zero, all sharing the same date, description and income category.

#### Scenario: Valid split
- **WHEN** the user assigns amounts whose sum does not exceed the total and saves
- **THEN** one income transaction is created per envelope with an amount, in a single save

#### Scenario: Over-assignment
- **WHEN** the assigned amounts exceed the total
- **THEN** the system shows how much it is over by and refuses to save

#### Scenario: Leftover
- **WHEN** part of the total remains unassigned
- **THEN** that remainder is not recorded in any envelope
