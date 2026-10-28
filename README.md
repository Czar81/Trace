# TRACE

**TRACE** is a personal finance app built around envelope budgeting. It has a minimalist, dark, premium look and gives you a clear, visual view of your spending, savings and debts. Everything is stored locally on your device.

![TRACE Logo](https://img.shields.io/badge/App-TRACE-092230?style=for-the-badge)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)

---

## Features

### Envelopes
- **Spending envelopes**: set a budget per period and see what is left, with optional alerts at 80% and 100% usage.
- **Savings envelopes**: set a goal, optionally with a deadline, and track progress.
- **Debt envelopes**: track what you owe and generate a payoff plan.
- **Unlimited mode**: envelopes with no limit, just to track money flows.
- **Transfers** between envelopes and **income distribution** into savings envelopes.
- **Customization**: your own photos or vector icons for each envelope, light/dark themes, drag-to-reorder.

### Transactions
- **Split expenses** into several parts, with a one-tap "Split into equal parts" button.
- **Recurring transactions** (including weekly and biweekly) that catch up on missed periods when you open the app.
- **Notes and receipt photos** on any transaction.
- **Search** with filters by date, category, payment method and more.
- **Bank CSV import** to bring in statements.
- Custom categories and payment methods, and manual dates.

### Reports and data
- **Reports** per currency, with reorderable sections.
- **CSV export** to share via WhatsApp, email or the cloud.
- **Backups**: manual export/import and optional automatic backups, including recurring templates.
- **Smart reset**: reset envelopes one by one or all at once, moving data to the history.

### Money and security
- **Currencies**: 30 currencies with a searchable selector. Pick your default currency in Settings; amounts are never converted or mixed, so totals and reports are shown per currency.
- **App lock** with your fingerprint, face or device PIN.
- **Bill reminders** through local notifications.
- **Languages**: Spanish and English.
- Smooth native animations, swipe-to-delete and haptic feedback.

---

## Tech Stack

- **Framework**: React Native with Expo (SDK 57), TypeScript.
- **Navigation**: React Navigation (native stack).
- **State**: React Context.
- **Storage**: AsyncStorage (local persistence).
- **Animations and gestures**: Reanimated, Gesture Handler, Draggable FlatList.
- **Icons**: Lucide React Native.
- **Device**: `expo-local-authentication`, `expo-notifications`, `expo-haptics`, `expo-image-picker`, `expo-document-picker`, `expo-sharing`, `expo-file-system`, `expo-localization`.
- **Tests**: Jest with `jest-expo` and Testing Library.

---

## Getting Started

```bash
git clone https://github.com/Czar81/Trace.git
cd Trace
npm install
npx expo start
```

Scan the QR code with Expo Go (Android/iOS), or press `a` for an Android emulator.

> Some native modules may require a development build instead of Expo Go. Use the `development` profile in `eas.json` to create one.

### Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` / `npm run ios` / `npm run web` | Start on a specific platform |
| `npm test` | Run the Jest test suite |
| `npx tsc --noEmit` | Type check |

---

## Architecture

Dependencies flow one way (`screens → context → services → domain`):

- `src/domain/`: pure logic with no I/O (`budget/`, `transactions/`, `recurring/`, `reports/`, `backup/`, `shared/`).
- `src/services/`: side effects, grouped by topic (`storage/`, `backup/`, `notifications/`, `scheduling/`, `device/`, `files/`).
- `src/context/`: app state. `useDataStore` serializes changes (`runExclusive` + `commit`); `actions/` has one hook per area (envelopes, transactions, templates, catalogs); `ExpenseContext` composes them and exposes `useAppData`.
- `src/theme/`: per-theme colors (`colors.ts`) and shared scales (`tokens.ts`: spacing, font sizes, radii).
- `src/i18n/`: Spanish and English strings.
- `src/screens/` (`settings/`, `envelopes/`, `transactions/`, `reports/`) and `src/components/` (`forms/`, `feedback/`, `envelope/`, `layout/`): UI.

Behavior is documented as specs in [`openspec/specs`](openspec/specs).

---

## Builds and CI

- **CI** (`.github/workflows/ci.yml`): type check and tests on every push and pull request.
- **Android builds** (`.eas/workflows/build-main.yml`): an EAS Workflow builds the `preview` profile on every push to `main`.
- **Releases**: work happens on `dev` and is released through a version-titled pull request into `main`, tagged `vX.Y.Z`.
