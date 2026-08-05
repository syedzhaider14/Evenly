# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0]

### Added

- Groups with their own currency, emoji and members; archive or delete groups.
- Expenses split equally, by exact amounts, by percentage or by shares (including half shares).
- Multiple payers on a single expense.
- Exact, integer-only money maths with largest-remainder allocation and per-expense rotation of
  the leftover cent.
- Balances per member and suggested payments with optimal debt simplification, plus a per-group
  switch to show pairwise debts instead.
- Settle-up screen with one-tap suggested payments.
- Insights: spend by category and paid-vs-consumed per person.
- Activity feed across all groups.
- CSV export of a group ledger.
- Light and dark themes, haptics and deep links.
- SQLite persistence with versioned migrations.
