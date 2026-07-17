import type { Settlement } from '@/domain/types';

import type { SqlDatabase } from '../db/SqlDatabase';
import { toSettlement, type SettlementRow } from './mappers';

export class SettlementRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listAll(): Promise<Settlement[]> {
    const rows = await this.db.getAllAsync<SettlementRow>(
      'SELECT * FROM settlements ORDER BY occurred_at DESC, created_at DESC',
    );
    return rows.map(toSettlement);
  }

  async listByGroup(groupId: string): Promise<Settlement[]> {
    const rows = await this.db.getAllAsync<SettlementRow>(
      'SELECT * FROM settlements WHERE group_id = ? ORDER BY occurred_at DESC, created_at DESC',
      [groupId],
    );
    return rows.map(toSettlement);
  }

  async add(settlement: Settlement): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT INTO settlements (id, group_id, from_member, to_member, amount, note, occurred_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          settlement.id,
          settlement.groupId,
          settlement.from,
          settlement.to,
          settlement.amount,
          settlement.note,
          settlement.occurredAt,
          settlement.createdAt,
        ],
      );
      await this.db.runAsync('UPDATE groups SET updated_at = ? WHERE id = ?', [
        settlement.createdAt,
        settlement.groupId,
      ]);
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM settlements WHERE id = ?', [id]);
  }
}
