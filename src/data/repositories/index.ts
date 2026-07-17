import type { SqlDatabase } from '../db/SqlDatabase';
import { ExpenseRepository } from './ExpenseRepository';
import { GroupRepository } from './GroupRepository';
import { MemberRepository } from './MemberRepository';
import { SettingsRepository } from './SettingsRepository';
import { SettlementRepository } from './SettlementRepository';

export interface Repositories {
  groups: GroupRepository;
  members: MemberRepository;
  expenses: ExpenseRepository;
  settlements: SettlementRepository;
  settings: SettingsRepository;
  /** Removes every group, member, expense and payment. Settings are kept. */
  eraseAll(): Promise<void>;
}

export function createRepositories(db: SqlDatabase): Repositories {
  return {
    groups: new GroupRepository(db),
    members: new MemberRepository(db),
    expenses: new ExpenseRepository(db),
    settlements: new SettlementRepository(db),
    settings: new SettingsRepository(db),
    eraseAll: () =>
      db.withTransactionAsync(async () => {
        await db.execAsync(`
          DELETE FROM expense_payers;
          DELETE FROM expense_shares;
          DELETE FROM expenses;
          DELETE FROM settlements;
          DELETE FROM members;
          DELETE FROM groups;
        `);
      }),
  };
}

export { MemberInUseError } from './MemberRepository';
export type { AppSettings, ThemePreference } from './SettingsRepository';
export { DEFAULT_SETTINGS } from './SettingsRepository';
