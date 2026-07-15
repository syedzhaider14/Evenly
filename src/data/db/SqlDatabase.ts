export type SqlValue = string | number | null;

export interface SqlRunResult {
  changes: number;
  lastInsertRowId: number;
}

/**
 * The slice of a SQLite connection the repositories rely on. Production code adapts
 * `expo-sqlite`; tests use an in-memory fake. Keeping the surface this small is what lets the
 * whole data layer run under plain Node in Jest.
 */
export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: readonly SqlValue[]): Promise<SqlRunResult>;
  getAllAsync<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  /** Runs `task` inside a transaction, rolling back if it throws. */
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export function bool(value: boolean): number {
  return value ? 1 : 0;
}

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}
