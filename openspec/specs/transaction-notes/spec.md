## Purpose

Lets a user add free-form notes to a transaction.

## Requirements

### Requirement: Multiline notes
The expense/income form and the transfer form SHALL include an optional multiline notes field stored as `Transaction.notes`. When an expense is split, every part carries the same notes. The envelope detail list SHALL show the notes (up to two lines) under the transaction's description.
