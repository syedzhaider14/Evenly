import { allocate, sum, type Minor } from './money';
import type { Allocation, ID, Transfer } from './types';

export interface LedgerExpense {
  payers: readonly Allocation[];
  shares: readonly Allocation[];
}

export interface LedgerSettlement {
  from: ID;
  to: ID;
  amount: Minor;
}

/**
 * Net position of every member: positive means the group owes them money, negative means they
 * owe the group. The values of a consistent ledger always add up to zero.
 */
export function computeBalances(
  memberIds: readonly ID[],
  expenses: readonly LedgerExpense[],
  settlements: readonly LedgerSettlement[],
): Map<ID, Minor> {
  const balances = new Map<ID, Minor>(memberIds.map((id) => [id, 0]));
  const add = (id: ID, delta: Minor) => balances.set(id, (balances.get(id) ?? 0) + delta);

  for (const expense of expenses) {
    for (const payer of expense.payers) add(payer.memberId, payer.amount);
    for (const share of expense.shares) add(share.memberId, -share.amount);
  }

  for (const settlement of settlements) {
    add(settlement.from, settlement.amount);
    add(settlement.to, -settlement.amount);
  }

  return balances;
}

export function isBalanced(balances: ReadonlyMap<ID, Minor>): boolean {
  return sum([...balances.values()]) === 0;
}

/**
 * Who owes whom without any simplification: each consumer owes each payer their portion of
 * every expense, netted per pair. Used when a group has "simplify debts" turned off, because
 * some groups prefer to only ever pay people they actually shared costs with.
 */
export function computePairwiseDebts(
  expenses: readonly LedgerExpense[],
  settlements: readonly LedgerSettlement[],
): Transfer[] {
  const owed = new Map<string, Minor>();
  const key = (from: ID, to: ID) => `${from}\u0000${to}`;
  const add = (from: ID, to: ID, amount: Minor) => {
    if (from === to || amount === 0) return;
    owed.set(key(from, to), (owed.get(key(from, to)) ?? 0) + amount);
  };

  for (const expense of expenses) {
    const payerWeights = expense.payers.map((payer) => payer.amount);
    if (payerWeights.length === 0 || sum(payerWeights) <= 0) continue;

    for (const share of expense.shares) {
      const portions = allocate(share.amount, payerWeights);
      expense.payers.forEach((payer, index) => add(share.memberId, payer.memberId, portions[index] ?? 0));
    }
  }

  for (const settlement of settlements) {
    // A payment from A to B cancels debt A owes B (or creates debt B owes A if overpaid).
    add(settlement.to, settlement.from, settlement.amount);
  }

  const visited = new Set<string>();
  const transfers: Transfer[] = [];

  for (const compound of owed.keys()) {
    const [a = '', b = ''] = compound.split('\u0000');
    const pair = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (visited.has(pair)) continue;
    visited.add(pair);

    const net = (owed.get(key(a, b)) ?? 0) - (owed.get(key(b, a)) ?? 0);
    if (net > 0) transfers.push({ from: a, to: b, amount: net });
    if (net < 0) transfers.push({ from: b, to: a, amount: -net });
  }

  return sortTransfers(transfers);
}

export function sortTransfers(transfers: Transfer[]): Transfer[] {
  return transfers.sort(
    (a, b) => b.amount - a.amount || a.from.localeCompare(b.from) || a.to.localeCompare(b.to),
  );
}

export interface GroupSummary {
  totalSpent: Minor;
  paidBy: Map<ID, Minor>;
  consumedBy: Map<ID, Minor>;
}

export function summarize(expenses: readonly (LedgerExpense & { amount: Minor })[]): GroupSummary {
  const paidBy = new Map<ID, Minor>();
  const consumedBy = new Map<ID, Minor>();
  let totalSpent = 0;

  for (const expense of expenses) {
    totalSpent += expense.amount;
    for (const payer of expense.payers) {
      paidBy.set(payer.memberId, (paidBy.get(payer.memberId) ?? 0) + payer.amount);
    }
    for (const share of expense.shares) {
      consumedBy.set(share.memberId, (consumedBy.get(share.memberId) ?? 0) + share.amount);
    }
  }

  return { totalSpent, paidBy, consumedBy };
}

/** How a single expense affects one member: positive = they lent, negative = they borrowed. */
export function expenseImpact(expense: LedgerExpense, memberId: ID): Minor {
  const paid = sum(expense.payers.filter((p) => p.memberId === memberId).map((p) => p.amount));
  const owes = sum(expense.shares.filter((s) => s.memberId === memberId).map((s) => s.amount));
  return paid - owes;
}
