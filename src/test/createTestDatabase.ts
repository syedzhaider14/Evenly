import initSqlJs from 'sql.js';

import { migrate } from '@/data/db/migrations';
import type { SqlDatabase, SqlValue } from '@/data/db/SqlDatabase';

/**
 * A real SQLite engine (compiled to WebAssembly) behind the app's `SqlDatabase` interface,
 * so repository and store tests exercise the actual SQL, constraints and migrations.
 */
export async function createTestDatabase({ migrated = true } = {}): Promise<SqlDatabase> {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();
  raw.exec('PRAGMA foreign_keys = ON;');

  const query = <T>(sql: string, params: readonly SqlValue[] = []): T[] => {
    const statement = raw.prepare(sql);
    try {
      statement.bind([...params]);
      const rows: T[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as T);
      return rows;
    } finally {
      statement.free();
    }
  };

  const db: SqlDatabase = {
    execAsync: async (sql) => {
      raw.exec(sql);
    },
    runAsync: async (sql, params = []) => {
      raw.run(sql, [...params]);
      return { changes: raw.getRowsModified(), lastInsertRowId: 0 };
    },
    getAllAsync: async <T>(sql: string, params?: readonly SqlValue[]) => query<T>(sql, params),
    getFirstAsync: async <T>(sql: string, params?: readonly SqlValue[]) =>
      query<T>(sql, params)[0] ?? null,
    withTransactionAsync: async (task) => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };

  if (migrated) await migrate(db);
  return db;
}
