## Purpose
Lets a user browse the app's predefined visual themes and switch between them from Configuración, with their choice applied across the whole app and remembered between sessions.

## Requirements

### Requirement: Predefined theme catalog
The system SHALL offer exactly 8 predefined themes: Medianoche, Cuarzo Rosa, Papel, Grafito, Índigo, Perla, Lavanda, Arena. Each theme SHALL define values for every themable color role used by the app (background, card background, primary text, secondary text, divider, primary accent, secondary accent).

#### Scenario: Every theme covers all themable roles
- **WHEN** any of the 8 predefined themes is applied
- **THEN** every screen renders with no missing color (no fallback/undefined color reaches a component)

### Requirement: Theme selection screen
The system SHALL provide an "Apariencia" screen, reachable from a new row in Configuración placed above "Monedas", that lists all 8 themes as selectable options. Each option SHALL show a preview of its key colors and SHALL indicate whether it is the currently active theme.

#### Scenario: User opens Apariencia from Configuración
- **WHEN** a user taps the new "Apariencia" row in Configuración
- **THEN** the system navigates to a screen listing all 8 themes with a color preview for each, and the currently active theme visibly marked as selected

#### Scenario: User selects a different theme
- **WHEN** a user taps a theme other than the currently active one on the Apariencia screen
- **THEN** the app immediately re-renders all visible screens using the selected theme's colors, and the Apariencia screen updates which option is marked as selected

### Requirement: Theme choice persists across sessions
The system SHALL persist the selected theme so that closing and reopening the app preserves the user's choice.

#### Scenario: App restarts after a theme change
- **WHEN** a user selects a theme, then fully closes and reopens the app
- **THEN** the app launches using the previously selected theme, not the default

### Requirement: Default theme matches current appearance
The system SHALL default to the Medianoche theme for users who have never chosen a theme, and Medianoche's colors SHALL be visually identical to the app's appearance before this change.

#### Scenario: Existing user opens the app after the update
- **WHEN** a user who has never opened the Apariencia screen updates the app and opens it
- **THEN** the app looks identical to how it looked before the update
