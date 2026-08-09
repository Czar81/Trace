## Purpose

Gives destructive confirmations (e.g. deleting an envelope) tactile and visual feedback when confirmed, so the action registers as significant instead of behaving like any other modal dismissal.

## Requirements

### Requirement: Destructive confirmations trigger haptic feedback
When a user confirms a destructive action through the shared confirmation dialog, the system SHALL trigger a haptic feedback pulse on devices that support it, in addition to performing the action.

#### Scenario: User confirms a destructive action
- **WHEN** a user taps the confirm button on a destructive confirmation dialog (e.g. confirming envelope deletion)
- **THEN** the device provides haptic feedback and the destructive action proceeds

#### Scenario: Haptics unavailable
- **WHEN** a user confirms a destructive action on a device or platform where haptic feedback is unavailable
- **THEN** the destructive action still proceeds normally, with no error surfaced to the user

### Requirement: Destructive confirmations show a confirm animation
When a user confirms a destructive action, the system SHALL play a brief visual confirmation animation before or as the dialog dismisses, distinguishing it from a non-destructive dismissal.

#### Scenario: User confirms a destructive action
- **WHEN** a user taps the confirm button on a destructive confirmation dialog
- **THEN** the dialog plays a brief confirmation animation as it dismisses

#### Scenario: User cancels instead
- **WHEN** a user taps cancel or dismisses the dialog without confirming
- **THEN** no confirmation animation or haptic feedback plays, and no destructive action occurs
