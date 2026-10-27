## Purpose

Protects the app's financial data with the device's own fingerprint, face or PIN.

## Requirements

### Requirement: Optional app lock
The settings SHALL offer an "App lock" switch (off by default, `appLockEnabled`). Turning it on or off SHALL require a successful device authentication (biometrics with device PIN/pattern/password fallback); it SHALL be refused with an explanation when the device has no enrolled credential. The app does not store its own PIN.

#### Scenario: Opening the app
- **WHEN** the lock is on and the app starts
- **THEN** content stays hidden until the device authentication succeeds, with a button to retry

#### Scenario: Returning from the background
- **WHEN** the app returns to the foreground after 30 seconds or more
- **THEN** it locks again
