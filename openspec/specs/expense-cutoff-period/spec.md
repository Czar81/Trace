# expense-cutoff-period Specification

## Purpose
TBD - created by archiving change fix-expense-cutoff-period. Update Purpose after archive.
## Requirements
### Requirement: Gasto envelope balance only counts expenses from the current calendar month
The monthly cutoff is fixed at day 1 and is not configurable: there is no setting for it, and any `expenseCutoffEnabled`, `expenseCutoffDay` or `expenseCutoffDate` found in stored settings or an imported backup is ignored. The system SHALL exclude a `gasto` envelope's expense transactions dated before the first day of the current month from that envelope's computed balance. This filtering SHALL apply only to `gasto` envelopes; `ahorro` and `deuda` envelopes are never subject to it.

#### Scenario: Expense from a previous month is excluded
- **WHEN** a `gasto` envelope has an expense transaction dated before the first day of the current month
- **THEN** that transaction SHALL NOT be included in the envelope's computed balance

#### Scenario: Expense from the current month is included
- **WHEN** a `gasto` envelope has an expense transaction dated on or after the first day of the current month
- **THEN** that transaction SHALL be included in the envelope's computed balance

#### Scenario: Old settings and backups with another cutoff day
- **WHEN** stored settings or an imported backup carry `expenseCutoffEnabled: false` or an `expenseCutoffDay` other than 1
- **THEN** the cutoff still applies on day 1 and those fields are dropped

#### Scenario: Savings envelopes are unaffected
- **WHEN** an envelope's type is `ahorro`
- **THEN** the cutoff filter SHALL NOT apply to that envelope's balance computation

#### Scenario: Debt envelopes are unaffected
- **WHEN** an envelope's type is `deuda`
- **THEN** the cutoff filter SHALL NOT apply to that envelope's balance computation — a debt envelope's balance always reflects the full history of payments and charges, not a single billing period
