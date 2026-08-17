## Purpose

Lets users find a specific transaction across all envelopes by free-text description and optional filters, instead of paging through one envelope's monthly history at a time.

## Requirements

### Requirement: Search entry point on the main screen
The system SHALL provide a way to open the transaction search screen from `MainScreen`'s header, alongside the existing settings entry point.

#### Scenario: User opens search from the main screen
- **WHEN** the user taps the search icon in `MainScreen`'s header
- **THEN** the system navigates to the transaction search screen

### Requirement: Free-text search on description
The system SHALL filter transactions by a case-insensitive substring match of the search text against each transaction's `description`. An empty search text SHALL NOT filter out any transaction on that basis alone.

#### Scenario: User types a matching search term
- **WHEN** the user enters text that is a case-insensitive substring of one or more non-archived transactions' `description`
- **THEN** the system shows only those matching transactions (subject to any other active filters)

#### Scenario: User types a term with no matches
- **WHEN** the user enters text that is not a substring of any non-archived transaction's `description`
- **THEN** the system shows an empty-state message indicating no results, distinct from the empty state shown before any search has been entered

#### Scenario: Search text is empty
- **WHEN** the search text field is empty and no filters are active
- **THEN** the system shows an initial empty state prompting the user to search or filter, without listing every transaction unfiltered

### Requirement: Combinable filters
The system SHALL let the user narrow results with any combination of: category, payment method, date range (from/to), and minimum/maximum amount, applied together with the free-text search (a transaction must satisfy the text match AND every active filter to appear in results).

#### Scenario: Text search combined with a category filter
- **WHEN** the user has entered search text and also selected a category filter
- **THEN** the system shows only transactions matching both the text and the selected category

#### Scenario: Category filter alone, no search text
- **WHEN** the user selects a category filter without entering any search text
- **THEN** the system shows all non-archived transactions in that category (subject to any other active filters)

#### Scenario: Date range filter excludes out-of-range transactions
- **WHEN** the user sets a "from" and/or "to" date
- **THEN** the system shows only transactions whose `date` falls within the selected range (inclusive), excluding transactions before "from" or after "to"

#### Scenario: Amount range filter excludes out-of-range transactions
- **WHEN** the user sets a minimum and/or maximum amount
- **THEN** the system shows only transactions whose `amount` is within the selected range (inclusive)

#### Scenario: Clearing all filters
- **WHEN** the user clears every active filter and the search text
- **THEN** the system returns to the initial empty state described in "Free-text search on description"

### Requirement: Results grouped by day and sorted most-recent-first
The system SHALL group matching results by calendar day and order both the groups and the transactions within each group from most recent to oldest.

#### Scenario: Results span multiple days
- **WHEN** matching transactions fall on more than one calendar day
- **THEN** the system displays them in day-labeled groups ordered from the most recent day to the oldest, with each group's transactions also ordered most recent to oldest

### Requirement: Results show resolved names, not raw ids
Each result SHALL display its description, amount, and date, plus the names of its associated envelope, category, and payment method (resolved from their ids), matching how the same information is displayed on the envelope detail screen. A transaction whose category or payment method has been deleted SHALL show a placeholder (e.g. "Sin categoría" / "Sin método") instead of omitting the field or displaying a stale id.

#### Scenario: Result with all fields present
- **WHEN** a matching transaction has a valid `categoryId` and `paymentMethodId`
- **THEN** the system shows the transaction with its envelope name, category name, and payment method name

#### Scenario: Result with a deleted category or payment method
- **WHEN** a matching transaction's `categoryId` or `paymentMethodId` no longer corresponds to an existing category or payment method
- **THEN** the system shows a placeholder label for that field instead of an id or a blank value

### Requirement: Archived transactions are excluded
The system SHALL exclude transactions with `isArchived: true` from search results and from the filter option lists (e.g. it SHALL NOT be possible to filter to an archived-only state).

#### Scenario: Search term matches only an archived transaction
- **WHEN** the user's search text and filters would only match a transaction that has `isArchived: true`
- **THEN** the system shows the empty "no results" state, not the archived transaction

### Requirement: Tapping a result opens it for editing
Tapping a result SHALL navigate to the transaction edit screen (`CreateTransaction`), passing that transaction's `envelopeId` and the transaction itself, consistent with how the envelope detail screen opens a transaction for editing.

#### Scenario: User taps a search result
- **WHEN** the user taps a transaction in the search results
- **THEN** the system navigates to `CreateTransaction` with `envelopeId` set to the result's `envelopeId` and `transaction` set to the result, pre-filling the edit form

#### Scenario: User saves an edit and returns to search
- **WHEN** the user edits and saves a transaction opened from search results, then navigates back
- **THEN** the search screen reflects the updated transaction data (or removes it from results if it no longer matches the active search/filters)
