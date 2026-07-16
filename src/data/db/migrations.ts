import type { SqlDatabase } from './SqlDatabase';

export interface Migration {
  version: number;
  description: string;
  up: string;
}

/**
 * Append-only list of schema migrations. Never edit a migration that has shipped; add a new
 * one instead. The current version is stored in SQLite's `user_version` pragma.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    up: `
      CREATE TABLE groups (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        emoji TEXT NOT NULL,
        currency TEXT NOT NULL,
        simplify_debts INTEGER NOT NULL DEFAULT 1,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE members (
        id TEXT PRIMARY KEY NOT NULL,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        is_self INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX idx_members_group ON members(group_id);

      CREATE TABLE expenses (
        id TEXT PRIMARY KEY NOT NULL,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        category TEXT NOT NULL,
        split_json TEXT NOT NULL,
        notes TEXT,
        occurred_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX idx_expenses_group_date ON expenses(group_id, occurred_at DESC);

      CREATE TABLE expense_payers (
        expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
        amount INTEGER NOT NULL,
        PRIMARY KEY (expense_id, member_id)
      );

      CREATE TABLE expense_shares (
        expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
        amount INTEGER NOT NULL,
        PRIMARY KEY (expense_id, member_id)
      );
      CREATE INDEX idx_expense_shares_member ON expense_shares(member_id);

      CREATE TABLE settlements (
        id TEXT PRIMARY KEY NOT NULL,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        from_member TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
        to_member TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
        amount INTEGER NOT NULL CHECK (amount > 0),
        note TEXT,
        occurred_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        CHECK (from_member <> to_member)
      );
      CREATE INDEX idx_settlements_group_date ON settlements(group_id, occurred_at DESC);
    `,
  },
  {
    version: 2,
    description: 'Key-value settings table',
    up: `
      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

/** Applies every migration newer than the database's `user_version`, each in its own transaction. */
export async function migrate(db: SqlDatabase, migrations: readonly Migration[] = MIGRATIONS) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  const pending = migrations
    .filter((migration) => migration.version > current)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.up);
      // PRAGMA does not accept bound parameters; the version is a trusted integer constant.
      await db.execAsync(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });
  }

  return { from: current, to: pending[pending.length - 1]?.version ?? current };
}
