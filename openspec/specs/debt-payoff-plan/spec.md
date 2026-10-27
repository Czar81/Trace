## Purpose

Shows the user how long paying off their debts takes under the avalanche or snowball strategy.

## Requirements

### Requirement: Payoff simulation
The system SHALL simulate month by month, for the limited debt envelopes of the chosen currency with a pending balance, paying each debt's minimum and directing the rest of the monthly budget to the highest-priority open debt. Avalanche prioritises the highest monthly interest rate; snowball the smallest balance. Budget defaults to the sum of minimum payments.

#### Scenario: Result
- **WHEN** the budget clears all debts within 600 months
- **THEN** the screen shows the debt-free month, months needed, total interest, the payment order with each debt's payoff month, and the interest difference between both strategies

#### Scenario: Budget too low
- **WHEN** the debts are not cleared within 600 months
- **THEN** the screen warns that the payment must be raised instead of showing a date

### Requirement: Saved plans
The user SHALL be able to save the current currency, strategy and monthly payment under a name, list saved plans, open one (which restores those inputs and recalculates with current balances) and delete it. Saved plans are stored on the device and are not part of backups.
