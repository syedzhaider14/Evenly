import type { SqlDatabase } from '../db/SqlDatabase';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppSettings {
  displayName: string;
  defaultCurrency: string;
  theme: ThemePreference;
  simplifyByDefault: boolean;
  hapticsEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  displayName: 'You',
  defaultCurrency: 'USD',
  theme: 'system',
  simplifyByDefault: true,
  hapticsEnabled: true,
};

/** Settings are stored as JSON values in a key-value table so new keys never need a migration. */
export class SettingsRepository {
  constructor(private readonly db: SqlDatabase) {}

  async load(): Promise<AppSettings> {
    const rows = await this.db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings',
    );
    const stored: Partial<Record<keyof AppSettings, unknown>> = {};
    for (const row of rows) {
      try {
        stored[row.key as keyof AppSettings] = JSON.parse(row.value);
      } catch {
        // Ignore corrupt values; the default is used instead.
      }
    }
    return sanitizeSettings(stored);
  }

  async save(patch: Partial<AppSettings>): Promise<void> {
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return;
    await this.db.withTransactionAsync(async () => {
      for (const [key, value] of entries) {
        await this.db.runAsync(
          `INSERT INTO settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [key, JSON.stringify(value)],
        );
      }
    });
  }
}

export function sanitizeSettings(stored: Partial<Record<keyof AppSettings, unknown>>): AppSettings {
  const theme = stored.theme;
  return {
    displayName:
      typeof stored.displayName === 'string' && stored.displayName.trim().length > 0
        ? stored.displayName.trim()
        : DEFAULT_SETTINGS.displayName,
    defaultCurrency:
      typeof stored.defaultCurrency === 'string' && /^[A-Z]{3}$/.test(stored.defaultCurrency)
        ? stored.defaultCurrency
        : DEFAULT_SETTINGS.defaultCurrency,
    theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : DEFAULT_SETTINGS.theme,
    simplifyByDefault:
      typeof stored.simplifyByDefault === 'boolean'
        ? stored.simplifyByDefault
        : DEFAULT_SETTINGS.simplifyByDefault,
    hapticsEnabled:
      typeof stored.hapticsEnabled === 'boolean'
        ? stored.hapticsEnabled
        : DEFAULT_SETTINGS.hapticsEnabled,
  };
}
