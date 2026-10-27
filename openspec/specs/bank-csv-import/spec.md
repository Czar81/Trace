## Purpose

Lets a user bring transactions from a bank statement CSV into an envelope.

## Requirements

### Requirement: Import transactions from a bank CSV
The system SHALL let the user pick a CSV file (comma, semicolon or tab delimited), confirm or change which columns hold the date, description and amount (guessed from header names), choose a destination non-debt envelope, categories and payment method, and optionally invert signs. Negative amounts SHALL become expenses and positive amounts incomes. Dates SHALL accept `YYYY-MM-DD` and day-first `DD/MM/YYYY`; amounts SHALL accept both `1,234.56` and `1.234,56`.

#### Scenario: Preview before import
- **WHEN** a file and envelope are chosen
- **THEN** the screen shows how many transactions will be imported, total expenses and income, and how many rows are skipped

#### Scenario: Duplicates
- **WHEN** a row matches an existing transaction of the same envelope, type, day, amount and description
- **THEN** it is skipped and counted as a duplicate

#### Scenario: Invalid rows
- **WHEN** a row has no parseable date or a zero/missing amount
- **THEN** it is skipped and counted
