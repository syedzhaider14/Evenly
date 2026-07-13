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
