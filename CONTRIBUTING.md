# Contributing to Evenly

Thanks for taking the time to contribute.

## Setup

```bash
npm install
npm start
```

Node 20 or newer is required (see `.nvmrc`).

## Before opening a pull request

```bash
npm run verify   # typecheck + lint + tests
```

CI runs the same command, so a green `verify` locally means a green build.

## Guidelines

- **Keep business logic in `src/domain`.** It must stay free of React, Expo and Redux imports.
  If you find yourself computing money in a component, move it to the domain and test it there.
- **Money is always integer minor units.** Never store or add floats. Use `parseAmount`,
  `formatMoney` and `allocate`.
- **Schema changes need a new migration.** Never edit a migration that has already shipped;
  append a new one to `MIGRATIONS` and add a repository test that covers it.
- **User-facing copy lives in `src/utils/messages.ts`** (for errors) or the screen itself. Domain
  functions return error codes, not sentences.
- **Accessibility:** every pressable needs an `accessibilityRole` and a meaningful label.
- Follow the existing formatting (`npm run format`).

## Commit messages

Use the imperative mood and keep the subject under 72 characters, e.g.
`Add percentage validation to split editor`.

## Reporting bugs

Please include the steps to reproduce, what you expected, what happened, and your device / OS
version. If the bug is about a wrong balance, an exported CSV of the group helps a lot.
