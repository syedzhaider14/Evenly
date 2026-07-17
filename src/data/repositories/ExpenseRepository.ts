import type { Expense } from '@/domain/types';

import type { SqlDatabase } from '../db/SqlDatabase';
import { groupAllocations, toExpense, type AllocationRow, type ExpenseRow } from './mappers';

/*
 * Payer and share rows are always read in insertion order (rowid), which is the order the
 * domain layer produced them in. That keeps round-trips exact and lists stable in the UI.
 */
export class ExpenseRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listAll(): Promise<Expense[]> {
    const [rows, payers, shares] = await Promise.all([
      this.db.getAllAsync<ExpenseRow>(
        'SELECT * FROM expenses ORDER BY occurred_at DESC, created_at DESC',
      ),
      this.db.getAllAsync<AllocationRow>('SELECT * FROM expense_payers ORDER BY rowid'),
      this.db.getAllAsync<AllocationRow>('SELECT * FROM expense_shares ORDER BY rowid'),
    ]);
    return this.assemble(rows, payers, shares);
  }

  async listByGroup(groupId: string): Promise<Expense[]> {
    const [rows, payers, shares] = await Promise.all([
      this.db.getAllAsync<ExpenseRow>(
        'SELECT * FROM expenses WHERE group_id = ? ORDER BY occurred_at DESC, created_at DESC',
        [groupId],
      ),
      this.db.getAllAsync<AllocationRow>(
        `SELECT p.* FROM expense_payers p JOIN expenses e ON e.id = p.expense_id
         WHERE e.group_id = ? ORDER BY p.rowid`,
        [groupId],
      ),
      this.db.getAllAsync<AllocationRow>(
        `SELECT s.* FROM expense_shares s JOIN expenses e ON e.id = s.expense_id
         WHERE e.group_id = ? ORDER BY s.rowid`,
        [groupId],
      ),
    ]);
    return this.assemble(rows, payers, shares);
  }

  async get(id: string): Promise<Expense | null> {
    const row = await this.db.getFirstAsync<ExpenseRow>('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!row) return null;
    const [payers, shares] = await Promise.all([
      this.db.getAllAsync<AllocationRow>(
        'SELECT * FROM expense_payers WHERE expense_id = ? ORDER BY rowid',
        [id],
      ),
      this.db.getAllAsync<AllocationRow>(
        'SELECT * FROM expense_shares WHERE expense_id = ? ORDER BY rowid',
        [id],
      ),
    ]);
    return this.assemble([row], payers, shares)[0] ?? null;
  }

  /** Inserts or fully replaces an expense, including its payer and share rows. */
  async save(expense: Expense): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT INTO expenses
           (id, group_id, description, amount, category, split_json, notes, occurred_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           description = excluded.description,
           amount = excluded.amount,
           category = excluded.category,
           split_json = excluded.split_json,
           notes = excluded.notes,
           occurred_at = excluded.occurred_at,
           updated_at = excluded.updated_at`,
        [
          expense.id,
          expense.groupId,
          expense.description,
          expense.amount,
          expense.category,
          JSON.stringify(expense.split),
          expense.notes,
          expense.occurredAt,
          expense.createdAt,
          expense.updatedAt,
        ],
      );

      await this.db.runAsync('DELETE FROM expense_payers WHERE expense_id = ?', [expense.id]);
      await this.db.runAsync('DELETE FROM expense_shares WHERE expense_id = ?', [expense.id]);

      for (const payer of expense.payers) {
        await this.db.runAsync(
          'INSERT INTO expense_payers (expense_id, member_id, amount) VALUES (?, ?, ?)',
          [expense.id, payer.memberId, payer.amount],
        );
      }
      for (const share of expense.shares) {
        await this.db.runAsync(
          'INSERT INTO expense_shares (expense_id, member_id, amount) VALUES (?, ?, ?)',
          [expense.id, share.memberId, share.amount],
        );
      }

      await this.db.runAsync('UPDATE groups SET updated_at = ? WHERE id = ?', [
        expense.updatedAt,
        expense.groupId,
      ]);
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM expense_payers WHERE expense_id = ?', [id]);
      await this.db.runAsync('DELETE FROM expense_shares WHERE expense_id = ?', [id]);
      await this.db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
    });
  }

  private assemble(
    rows: readonly ExpenseRow[],
    payerRows: readonly AllocationRow[],
    shareRows: readonly AllocationRow[],
  ): Expense[] {
    const payers = groupAllocations(payerRows);
    const shares = groupAllocations(shareRows);
    return rows.map((row) => toExpense(row, payers.get(row.id) ?? [], shares.get(row.id) ?? []));
  }
}
