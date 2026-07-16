import type { Member } from '@/domain/types';

import { bool, type SqlDatabase } from '../db/SqlDatabase';
import { toMember, type MemberRow } from './mappers';

export async function insertMember(db: SqlDatabase, member: Member): Promise<void> {
  await db.runAsync(
    `INSERT INTO members (id, group_id, name, color, is_self, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [member.id, member.groupId, member.name, member.color, bool(member.isSelf), member.createdAt],
  );
}

export class MemberInUseError extends Error {
  constructor(readonly memberId: string) {
    super('This member is part of expenses or payments and cannot be removed.');
    this.name = 'MemberInUseError';
  }
}

export class MemberRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listAll(): Promise<Member[]> {
    const rows = await this.db.getAllAsync<MemberRow>(
      'SELECT * FROM members ORDER BY group_id, is_self DESC, created_at ASC, rowid ASC',
    );
    return rows.map(toMember);
  }

  async listByGroup(groupId: string): Promise<Member[]> {
    const rows = await this.db.getAllAsync<MemberRow>(
      'SELECT * FROM members WHERE group_id = ? ORDER BY is_self DESC, created_at ASC, rowid ASC',
      [groupId],
    );
    return rows.map(toMember);
  }

  async add(member: Member): Promise<void> {
    await insertMember(this.db, member);
  }

  async rename(id: string, name: string): Promise<void> {
    await this.db.runAsync('UPDATE members SET name = ? WHERE id = ?', [name, id]);
  }

  /** Whether the member appears in any expense or payment and therefore affects balances. */
  async isReferenced(id: string): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ used: number }>(
      `SELECT EXISTS (
         SELECT 1 FROM expense_payers WHERE member_id = ?1
         UNION ALL SELECT 1 FROM expense_shares WHERE member_id = ?1
         UNION ALL SELECT 1 FROM settlements WHERE from_member = ?1 OR to_member = ?1
       ) AS used`,
      [id],
    );
    return (row?.used ?? 0) === 1;
  }

  /** @throws {MemberInUseError} when the member is still referenced by the ledger. */
  async remove(id: string): Promise<void> {
    if (await this.isReferenced(id)) {
      throw new MemberInUseError(id);
    }
    await this.db.runAsync('DELETE FROM members WHERE id = ?', [id]);
  }
}
