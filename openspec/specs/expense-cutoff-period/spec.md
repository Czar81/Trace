# expense-cutoff-period Specification

## Purpose
TBD - created by archiving change fix-expense-cutoff-period. Update Purpose after archive.
## Requirements
### Requirement: Gasto envelope balance only counts expenses from the current cutoff period
When `settings.expenseCutoffEnabled` is true and `settings.expenseCutoffDay` is set, the system SHALL exclude a `gasto` envelope's expense transactions dated before the start of the current billing period (the most recent date on which the day-of-month equals `expenseCutoffDay`, at or before today) from that envelope's computed balance.

#### Scenario: Expense from before this period's cutoff day is excluded
- **WHEN** `expenseCutoffDay` is 15, today is any date in the current period (on/after day 15 of this month, or before day 15 meaning the period started on day 15 of last month), and a `gasto` envelope has an expense transaction dated before that period's start date
- **THEN** that transaction SHALL NOT be included in the envelope's computed balance

#### Scenario: Expense from a previous period is excluded even if its day-of-month is on or after the cutoff day
- **WHEN** `expenseCutoffDay` is 15 and a `gasto` envelope has an expense transaction dated on day 20 of a month before the current period
- **THEN** that transaction SHALL NOT be included in the envelope's computed balance, even though 20 >= 15

#### Scenario: Expense from the current period is included
- **WHEN** `expenseCutoffDay` is 15 and a `gasto` envelope has an expense transaction dated on or after the current period's start date
- **THEN** that transaction SHALL be included in the envelope's computed balance

#### Scenario: Cutoff day exceeding the target month's length is clamped
- **WHEN** `expenseCutoffDay` is 31 and the target month for the period start has fewer than 31 days (e.g. February)
- **THEN** the period SHALL start on that month's last day, not roll over into the next month

#### Scenario: Cutoff disabled or unset leaves balance unaffected
- **WHEN** `expenseCutoffEnabled` is false, or `expenseCutoffDay` is null
- **THEN** all non-archived expense transactions for the envelope SHALL be counted regardless of date, as before this change

#### Scenario: Savings envelopes are unaffected
- **WHEN** an envelope's type is `ahorro`
- **THEN** the cutoff filter SHALL NOT apply to that envelope's balance computation, regardless of cutoff settings
