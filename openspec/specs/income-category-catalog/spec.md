## Purpose
Defines the income-only category catalog — a resource kept separate from expense categories — and how users manage it in Settings and apply it to income entries, so income can be classified without changing the expense taxonomy that reports depend on.

## Requirements

### Requirement: Income categories are a separate catalog
The system SHALL maintain an income category catalog that is independent from the expense category catalog. It SHALL persist under its own storage key, SHALL be seeded with a set of default income categories when none has been stored yet, and SHALL NOT share entries with the expense category catalog.

#### Scenario: No income catalog has ever been stored
- **WHEN** a user opens the app for the first time, or updates from a version that had no income category catalog
- **THEN** the system makes a default set of income categories available without any action from the user

#### Scenario: Income and expense catalogs do not share entries
- **WHEN** the user adds a category to the income catalog
- **THEN** the expense category catalog is unchanged, and an expense category never appears as an income category or vice versa

### Requirement: Manage income categories from Settings
The system SHALL show income categories in the existing Categories settings screen, in a group titled "Ingresos" separate from the expense group titled "Gastos", where the user can view the existing income categories, add a new one, and delete one, using the same behavior as expense categories. No separate screen, route, or Settings menu entry is provided for income categories.

#### Scenario: Opening income category management
- **WHEN** the user navigates to Settings and opens the Categories screen
- **THEN** the system lists the existing income categories under the "Ingresos" group, apart from the expense categories under the "Gastos" group

#### Scenario: Adding an income category
- **WHEN** the user enters a non-empty name in the "Ingresos" group of the Categories screen and submits it
- **THEN** the system adds that category to the income catalog, shows it in the list, and persists it for future sessions

#### Scenario: Deleting an income category
- **WHEN** the user deletes an income category and confirms the deletion
- **THEN** the system removes it from the income catalog and persists the removal

#### Scenario: Deleting an income category used by an existing transaction
- **WHEN** the user deletes an income category that an existing income transaction references
- **THEN** the transaction is not deleted or modified, and it continues to reference the stored category id

### Requirement: Assign an income category to an income transaction
When the transaction type is income, the transaction form SHALL offer an optional category selector populated from the income category catalog, and SHALL NOT offer expense categories. When the transaction type is expense, the form SHALL continue to offer only expense categories.

#### Scenario: User records an income with a category
- **WHEN** the user sets the transaction type to income, selects a category, and saves
- **THEN** the system stores the transaction with a `categoryId` referencing a category from the income catalog

#### Scenario: Category options follow the selected type
- **WHEN** the user switches the transaction type between expense and income
- **THEN** the category selector's options change to the catalog that matches the selected type

#### Scenario: Debt repayment income offers no category
- **WHEN** the transaction is an income on a debt envelope (a repayment of the debt)
- **THEN** the form does not offer a category selector for it

### Requirement: Expense categories are unaffected by income categories
The system SHALL keep existing expense-category behavior unchanged: expense forms, the "Gastos" group of the Categories settings screen, and expense reports (such as "Spending by category") SHALL continue to use only the expense category catalog and SHALL NOT include income categories.

#### Scenario: Income category does not leak into expense features
- **WHEN** the user adds an income category
- **THEN** it does not appear in the "Gastos" group of the Categories settings screen, in the expense form's category options, or in the "Spending by category" report
