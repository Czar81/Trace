## Purpose

Lets a savings goal carry an optional deadline so the app can show the days left and how much to save per month to reach it.

## Requirements

### Requirement: Savings goals MAY have a deadline
A savings envelope that is not unlimited SHALL accept an optional `goalDeadline` (ISO date), editable and removable from the envelope form.

#### Scenario: User sets a deadline
- **WHEN** a user saves a limited savings envelope with a deadline
- **THEN** the system stores `goalDeadline` and shows it on the envelope detail

### Requirement: Detail shows progress against the deadline
The envelope detail SHALL show days left and the suggested amount per month (missing amount divided by remaining months, minimum one month); once the deadline passes with the goal unmet it SHALL show how many days overdue; once the goal is met it SHALL show that it was reached.
