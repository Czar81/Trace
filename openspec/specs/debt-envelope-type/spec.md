## Purpose

Lets users track a debt (a credit card balance, a personal loan) using the same envelope mental model already used for spending and savings — payments and new charges as ordinary transactions, a limit representing the total debt amount, and a balance that reflects progress toward paying it off — with optional interest rate, minimum payment, and due day fields for debts that carry them.

## Requirements

### Requirement: `deuda` is a valid envelope type
The system SHALL accept `'deuda'` as a value of `EnvelopeType`, alongside the existing `'gasto'` and `'ahorro'`, usable anywhere an envelope's type is set or read (creation, editing, storage, backup import/export).

#### Scenario: User creates a debt envelope
- **WHEN** a user creates a new envelope with type `deuda`
- **THEN** the system saves it with `type: 'deuda'` using the same `Envelope` fields (`name`, `currency`, `limit`, `isUnlimited`, `icon`, `imageUri`, `color`) as any other envelope type

#### Scenario: Backup containing a debt envelope round-trips
- **WHEN** a backup file is exported or imported that contains an envelope with `type: 'deuda'`
- **THEN** the system preserves it unchanged, exactly as it does for `gasto` and `ahorro` envelopes today

### Requirement: A debt envelope's limit represents the total debt amount
For a debt envelope, the `limit` field SHALL represent the total amount owed (the original debt or credit line), not a recurring monthly budget. A debt envelope MAY be marked `isUnlimited` for a debt whose total amount is not tracked (e.g. an open line of credit), in which case no "amount remaining to pay" is computed.

#### Scenario: User sets a limit when creating a debt envelope
- **WHEN** a user creates a debt envelope with `isUnlimited: false` and enters a limit
- **THEN** the system treats that limit as the total debt amount, labeled distinctly from a spending budget or a savings goal

#### Scenario: User marks a debt envelope unlimited
- **WHEN** a user creates or edits a debt envelope with `isUnlimited: true`
- **THEN** the system tracks payments and charges against it without computing or displaying an "amount remaining to pay" figure, consistent with how unlimited `gasto` envelopes omit a spending limit

### Requirement: Income transactions on a debt envelope represent payments
A transaction of type `income` recorded against a debt envelope SHALL represent a payment made toward that debt, and SHALL reduce the amount still owed by its `amount`.

#### Scenario: User records a payment toward a debt
- **WHEN** a user adds an `income` transaction of amount X against a debt envelope
- **THEN** the envelope's computed balance increases by X, and the amount still owed (limit minus balance) decreases by X

### Requirement: Expense transactions on a debt envelope represent new charges
A transaction of type `expense` recorded against a debt envelope SHALL represent a new charge added to that debt (e.g. a new credit card purchase), and SHALL increase the amount still owed by its `amount`.

#### Scenario: User records a new charge against a debt
- **WHEN** a user adds an `expense` transaction of amount X against a debt envelope
- **THEN** the envelope's computed balance decreases by X, and the amount still owed (limit minus balance) increases by X

### Requirement: Debt envelope balance formula matches the existing income-minus-expense computation
A debt envelope's balance SHALL be computed with the same formula used for every other envelope type — the sum of its `income` transaction amounts minus the sum of its `expense` transaction amounts (excluding archived transactions) — with no debt-specific arithmetic and no expense-cutoff-period filtering applied.

#### Scenario: Debt envelope balance reflects payments and charges together
- **WHEN** a debt envelope has recorded payments (income) totaling P and new charges (expense) totaling C
- **THEN** the envelope's computed balance equals P minus C, using the same computation path as `gasto` and `ahorro` envelope balances

### Requirement: "Amount remaining to pay" is limit minus balance
For a debt envelope with `isUnlimited: false`, the system SHALL compute and display the amount still owed as `limit - balance`.

#### Scenario: Amount owed decreases as payments accumulate
- **WHEN** a debt envelope's balance increases (net of payments and charges) toward its limit
- **THEN** the displayed "amount remaining to pay" decreases correspondingly, reaching zero when balance equals limit

#### Scenario: New charges push the debt envelope over its original limit
- **WHEN** a debt envelope's balance is negative or below zero because charges have exceeded recorded payments, causing `limit - balance` to exceed the original limit
- **THEN** the system SHALL still display the resulting (larger) "amount remaining to pay" figure rather than clamping it to the original limit

### Requirement: Debt envelope progress indicator fills as the debt is paid down
The progress indicator shown on a debt envelope's card and detail view SHALL fill in proportion to `balance / limit` (0 when nothing has been paid net of charges, approaching or reaching 1 as the debt is paid off) — the same direction and formula used for `ahorro` envelope progress, visually distinguished from savings by a different progress color.

#### Scenario: Progress ring fills as debt is paid down
- **WHEN** a debt envelope's balance grows from 0 toward its limit through net payments
- **THEN** the progress indicator fills correspondingly, reaching full when the debt is fully paid off

### Requirement: Debt envelopes appear in their own section on the main screen
The system SHALL show a "Deudas" tab/section on the main envelope list, alongside the existing "Gastos" and "Ahorros" tabs, listing only envelopes with `type: 'deuda'`.

#### Scenario: User has both spending and debt envelopes
- **WHEN** a user has at least one `gasto` envelope and at least one `deuda` envelope
- **THEN** the main screen shows three tabs ("Gastos", "Ahorros", "Deudas"), and the "Deudas" tab lists only the debt envelopes

#### Scenario: User has no debt envelopes yet
- **WHEN** a user has not created any `deuda` envelope
- **THEN** the "Deudas" tab shows the same empty-state pattern used by the other envelope-type tabs, with a call to action to create a debt envelope

### Requirement: Summary total for the Deudas tab shows total amount still owed
When the "Deudas" tab is active, the main screen's summary total SHALL show the sum of "amount remaining to pay" (`limit - balance`) across all non-unlimited `deuda` envelopes, converted to the display currency — analogous to how the "Gastos" tab totals available budget and the "Ahorros" tab totals amount saved.

#### Scenario: User views the summary total on the Deudas tab
- **WHEN** the user has the "Deudas" tab active and has one or more non-unlimited debt envelopes
- **THEN** the summary total shown is the sum of each envelope's remaining-to-pay amount, converted to the currently selected display currency

#### Scenario: Unlimited debt envelopes are excluded from the total
- **WHEN** one or more `deuda` envelopes are marked `isUnlimited`
- **THEN** those envelopes are excluded from the Deudas tab's summary total, consistent with how unlimited `gasto` envelopes are excluded from the Gastos total

### Requirement: Debt envelope creation and editing use debt-specific copy
The envelope creation/editing screen SHALL show debt-specific copy when `envelopeType` (or the envelope being edited) is `deuda`: a distinct screen title, a limit field labeled for total debt amount rather than a monthly budget or savings goal, and unlimited-switch label/hint text describing an open-ended debt rather than an unlimited spending budget or savings goal.

#### Scenario: User opens the creation screen for a new debt envelope
- **WHEN** a user navigates to create a new envelope with `envelopeType: 'deuda'`
- **THEN** the screen title, limit field label, and unlimited-switch copy all describe a debt, not a spending budget or a savings goal

#### Scenario: New debt envelope gets a distinct default color
- **WHEN** a user creates a new debt envelope without picking a custom color
- **THEN** the envelope is assigned a default color distinct from both the `gasto` and `ahorro` default colors

### Requirement: Debt envelopes are excluded from savings-linked expense funding
A `deuda` envelope SHALL NOT be selectable as a funding source (`sourceSavingsEnvelopeId`) for a `gasto` expense, and the "fund this expense from savings" feature SHALL NOT be offered when creating a transaction on a `deuda` envelope, consistent with that feature being `gasto`-and-`ahorro`-only today.

#### Scenario: Creating a gasto expense does not list debt envelopes as a funding source
- **WHEN** a user creates an expense transaction on a `gasto` envelope and opens the "fund from savings" envelope picker
- **THEN** the picker lists only `ahorro` envelopes, never `deuda` envelopes

#### Scenario: Creating a transaction on a debt envelope offers no funding-source toggle
- **WHEN** a user creates a transaction on a `deuda` envelope
- **THEN** the system does not show the "fund this expense from savings" toggle, the same as it does not show it for `ahorro` envelopes today
