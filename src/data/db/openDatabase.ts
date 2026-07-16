import * as SQLite from 'expo-sqlite';

import { migrate } from './migrations';
import type { SqlDatabase, SqlValue } from './SqlDatabase';

export const DATABASE_NAME = 'evenly.db';

/** Wraps an `expo-sqlite` connection in the app's {@link SqlDatabase} interface. */
export function adaptExpoDatabase(db: SQLite.SQLiteDatabase): SqlDatabase {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params = []) => {
      const result = await db.runAsync(sql, params as SqlValue[]);
      return { changes: result.changes, lastInsertRowId: result.lastInsertRowId };
    },
    getAllAsync: <T>(sql: string, params: readonly SqlValue[] = []) =>
      db.getAllAsync<T>(sql, params as SqlValue[]),
    getFirstAsync: <T>(sql: string, params: readonly SqlValue[] = []) =>
      db.getFirstAsync<T>(sql, params as SqlValue[]),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

let connection: Promise<SqlDatabase> | null = null;

/** Opens (once) and migrates the app database. Safe to call from multiple places. */
export function openDatabase(name: string = DATABASE_NAME): Promise<SqlDatabase> {
  if (!connection) {
    connection = (async () => {
      const raw = await SQLite.openDatabaseAsync(name);
      await raw.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const db = adaptExpoDatabase(raw);
      await migrate(db);
      return db;
    })().catch((error: unknown) => {
      connection = null;
      throw error;
    });
  }
  return connection;
}
