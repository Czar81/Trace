# reports Specification

## Purpose

Gives users aggregated views of their transaction history — by category, by month, by envelope, by payment method, month-over-month trend, and top transactions — so they can understand spending patterns that individual envelope balances don't show.

## Requirements

### Requirement: Reports screen is reachable from Settings
The system SHALL provide a Reports entry point in the Settings screen that navigates to a Reports screen.

#### Scenario: User opens Reports from Settings
- **WHEN** a user taps the "Reportes" entry on the Settings screen
- **THEN** the system SHALL navigate to the Reports screen

### Requirement: Reports exclude archived transactions
All reports SHALL compute their totals using only transactions where `isArchived` is `false`.

#### Scenario: Archived transaction does not affect totals
- **WHEN** a transaction has been archived (`isArchived: true`)
- **THEN** that transaction's amount SHALL be excluded from every report total

### Requirement: Reports normalize multi-currency amounts
All report totals SHALL convert each transaction's amount to a single common currency before summing, so totals combining transactions in different currencies are accurate.

#### Scenario: Transactions in different currencies are combined
- **WHEN** the transactions included in a report use more than one currency
- **THEN** the report SHALL convert each amount to the common currency before computing totals, and SHALL NOT sum raw amounts across differing currencies

### Requirement: User can select a reporting period
The system SHALL let the user choose a period — current month, last 3 months, last 6 months, or all time — that filters every report on the Reports screen by transaction date.

#### Scenario: User changes the period
- **WHEN** a user selects a different period option on the Reports screen
- **THEN** every report on the screen SHALL recompute using only transactions whose date falls within the newly selected period

### Requirement: Spending by category report
The system SHALL show, for expense transactions in the selected period, the total amount and percentage share for each `TransactionCategory`, sorted from highest to lowest total.

#### Scenario: Multiple categories have expenses in the period
- **WHEN** the selected period contains expense transactions across two or more categories
- **THEN** the report SHALL list each category with its total amount and its percentage of the period's total expenses, ordered from highest total to lowest

#### Scenario: Transaction has no category
- **WHEN** an expense transaction has no `categoryId`
- **THEN** the report SHALL group it under an "Sin categoría" bucket rather than omitting it

### Requirement: Spending by month report
The system SHALL show, for each calendar month with at least one transaction in the selected period, the total expense amount for that month.

#### Scenario: Selected period spans multiple months
- **WHEN** the selected period covers more than one calendar month
- **THEN** the report SHALL show one entry per month with that month's total expenses, ordered chronologically

### Requirement: Spending by envelope report
The system SHALL show, for each envelope with expense transactions in the selected period, the total amount spent and, for envelopes with a limit (`isUnlimited: false`), the percentage of that limit consumed.

#### Scenario: Envelope has a limit
- **WHEN** an envelope has `isUnlimited: false` and a positive `limit`
- **THEN** the report SHALL show that envelope's total spent and the percentage of its `limit` represented by that total

#### Scenario: Envelope is unlimited
- **WHEN** an envelope has `isUnlimited: true`
- **THEN** the report SHALL show that envelope's total spent without a percentage-of-limit figure

### Requirement: Spending by payment method report
The system SHALL show, for expense transactions in the selected period, the total amount for each `PaymentMethod` used, grouping transactions with no `paymentMethodId` under an "Sin método" bucket.

#### Scenario: Transaction has no payment method
- **WHEN** an expense transaction has no `paymentMethodId`
- **THEN** the report SHALL include its amount in an "Sin método" bucket rather than omitting it

### Requirement: Month-over-month trend report
The system SHALL show, for each of the last N calendar months (independent of the selected period), the total income and total expense amounts, allowing the user to see the trend across months.

#### Scenario: User views the trend report
- **WHEN** the user views the Reports screen
- **THEN** the trend report SHALL display total income and total expenses for each of the last N calendar months, ordered chronologically

### Requirement: Top transactions report
The system SHALL show the largest expense transactions within the selected period, ordered from largest to smallest amount, each with its envelope, category, and date.

#### Scenario: Period has more transactions than the display limit
- **WHEN** the selected period contains more expense transactions than the report's display limit
- **THEN** the report SHALL show only the largest transactions up to that limit, ordered from largest to smallest amount
