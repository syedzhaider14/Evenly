import type { Group, Member } from '@/domain/types';

import { bool, type SqlDatabase } from '../db/SqlDatabase';
import { toGroup, type GroupRow } from './mappers';
import { insertMember } from './MemberRepository';

export class GroupRepository {
  constructor(private readonly db: SqlDatabase) {}

  async list(): Promise<Group[]> {
    const rows = await this.db.getAllAsync<GroupRow>(
      'SELECT * FROM groups ORDER BY archived ASC, updated_at DESC',
    );
    return rows.map(toGroup);
  }

  async get(id: string): Promise<Group | null> {
    const row = await this.db.getFirstAsync<GroupRow>('SELECT * FROM groups WHERE id = ?', [id]);
    return row ? toGroup(row) : null;
  }

  /** Creates a group together with its initial members atomically. */
  async create(group: Group, members: readonly Member[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT INTO groups (id, name, emoji, currency, simplify_debts, archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          group.id,
          group.name,
          group.emoji,
          group.currency,
          bool(group.simplifyDebts),
          bool(group.archived),
          group.createdAt,
          group.updatedAt,
        ],
      );
      for (const member of members) {
        await insertMember(this.db, member);
      }
    });
  }

  async update(group: Group): Promise<void> {
    await this.db.runAsync(
      `UPDATE groups
         SET name = ?, emoji = ?, currency = ?, simplify_debts = ?, archived = ?, updated_at = ?
       WHERE id = ?`,
      [
        group.name,
        group.emoji,
        group.currency,
        bool(group.simplifyDebts),
        bool(group.archived),
        group.updatedAt,
        group.id,
      ],
    );
  }

  async touch(id: string, at: number): Promise<void> {
    await this.db.runAsync('UPDATE groups SET updated_at = ? WHERE id = ?', [at, id]);
  }

  /**
   * Deletes a group and everything in it. Child rows are removed explicitly (deepest first)
   * so the operation does not depend on `foreign_keys` being enabled on the connection.
   */
  async delete(id: string): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      const expenseIds = 'SELECT id FROM expenses WHERE group_id = ?';
      await this.db.runAsync(`DELETE FROM expense_payers WHERE expense_id IN (${expenseIds})`, [id]);
      await this.db.runAsync(`DELETE FROM expense_shares WHERE expense_id IN (${expenseIds})`, [id]);
      await this.db.runAsync('DELETE FROM expenses WHERE group_id = ?', [id]);
      await this.db.runAsync('DELETE FROM settlements WHERE group_id = ?', [id]);
      await this.db.runAsync('DELETE FROM members WHERE group_id = ?', [id]);
      await this.db.runAsync('DELETE FROM groups WHERE id = ?', [id]);
    });
  }
}
