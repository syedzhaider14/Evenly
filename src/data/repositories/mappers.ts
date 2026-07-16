import { isCategoryId, type CategoryId } from '@/domain/categories';
import type { SplitInput } from '@/domain/split';
import type { Allocation, Expense, Group, Member, Settlement } from '@/domain/types';

export interface GroupRow {
  id: string;
  name: string;
  emoji: string;
  currency: string;
  simplify_debts: number;
  archived: number;
  created_at: number;
  updated_at: number;
}

export interface MemberRow {
  id: string;
  group_id: string;
  name: string;
  color: string;
  is_self: number;
  created_at: number;
}

export interface ExpenseRow {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  category: string;
  split_json: string;
  notes: string | null;
  occurred_at: number;
  created_at: number;
  updated_at: number;
}

export interface AllocationRow {
  expense_id: string;
  member_id: string;
  amount: number;
}

export interface SettlementRow {
  id: string;
  group_id: string;
  from_member: string;
  to_member: string;
  amount: number;
  note: string | null;
  occurred_at: number;
  created_at: number;
}

export function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    currency: row.currency,
    simplifyDebts: row.simplify_debts === 1,
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    color: row.color,
    isSelf: row.is_self === 1,
    createdAt: row.created_at,
  };
}

export function toSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    groupId: row.group_id,
    from: row.from_member,
    to: row.to_member,
    amount: row.amount,
    note: row.note,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

function isEntryArray(value: unknown): value is { memberId: string; value: number }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { memberId?: unknown }).memberId === 'string' &&
        typeof (entry as { value?: unknown }).value === 'number',
    )
  );
}

/**
 * Parses the stored split input defensively. Rows written by older builds (or edited by hand)
 * fall back to an exact split that reproduces the stored shares, so balances never change.
 */
export function parseSplitInput(json: string, shares: readonly Allocation[]): SplitInput {
  const fallback: SplitInput = {
    method: 'exact',
    entries: shares.map((share) => ({ memberId: share.memberId, value: share.amount })),
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return fallback;
  }
  if (typeof parsed !== 'object' || parsed === null) return fallback;

  const candidate = parsed as { method?: unknown; participants?: unknown; entries?: unknown };
  switch (candidate.method) {
    case 'equal':
      return Array.isArray(candidate.participants) &&
        candidate.participants.every((id) => typeof id === 'string')
        ? { method: 'equal', participants: candidate.participants as string[] }
        : fallback;
    case 'exact':
    case 'percentage':
    case 'shares':
      return isEntryArray(candidate.entries)
        ? { method: candidate.method, entries: candidate.entries }
        : fallback;
    default:
      return fallback;
  }
}

export function toExpense(
  row: ExpenseRow,
  payers: readonly Allocation[],
  shares: readonly Allocation[],
): Expense {
  const category: CategoryId = isCategoryId(row.category) ? row.category : 'other';
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: row.amount,
    category,
    payers: [...payers],
    shares: [...shares],
    split: parseSplitInput(row.split_json, shares),
    notes: row.notes,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function groupAllocations(rows: readonly AllocationRow[]): Map<string, Allocation[]> {
  const byExpense = new Map<string, Allocation[]>();
  for (const row of rows) {
    const list = byExpense.get(row.expense_id) ?? [];
    list.push({ memberId: row.member_id, amount: row.amount });
    byExpense.set(row.expense_id, list);
  }
  return byExpense;
}
