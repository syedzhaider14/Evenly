import type { Minor } from './money';
import type { ID, Transfer } from './types';
import { sortTransfers } from './balances';

export type SimplifyStrategy = 'optimal' | 'greedy';

/**
 * The exact algorithm is exponential in the number of members with a non-zero balance.
 * 2^16 subsets is ~65k states, which runs in a few milliseconds on a phone. Beyond that we
 * fall back to the greedy strategy, which is never worse than `n - 1` transfers.
 */
export const OPTIMAL_MEMBER_LIMIT = 16;

type Entry = readonly [ID, Minor];

/**
 * Produces a list of transfers that settles every balance to zero.
 *
 * `optimal` finds the minimum possible number of transfers. The minimum equals
 * `n - k`, where `n` is the number of members with a non-zero balance and `k` is the largest
 * number of disjoint zero-sum subsets those balances can be partitioned into. We find `k`
 * with a dynamic programme over subsets, then settle each subset greedily (a subset of size
 * `m` always settles in `m - 1` transfers).
 *
 * `greedy` repeatedly pairs the largest debtor with the largest creditor. It is fast and
 * intuitive but can use more transfers than necessary.
 *
 * @throws if the balances do not add up to zero.
 */
export function simplifyDebts(
  balances: ReadonlyMap<ID, Minor>,
  strategy: SimplifyStrategy = 'optimal',
): Transfer[] {
  const entries: Entry[] = [...balances]
    .filter(([, amount]) => amount !== 0)
    .sort(([a], [b]) => a.localeCompare(b));

  const total = entries.reduce((acc, [, amount]) => acc + amount, 0);
  if (total !== 0) {
    throw new Error(`Balances must add up to zero, but they add up to ${total}`);
  }

  if (entries.length === 0) return [];

  if (strategy === 'greedy' || entries.length > OPTIMAL_MEMBER_LIMIT) {
    return sortTransfers(settleGreedily(entries));
  }

  return sortTransfers(partitionIntoZeroSumGroups(entries).flatMap(settleGreedily));
}

/** Largest debtor pays largest creditor until everyone is square. Ties break by member id. */
export function settleGreedily(entries: readonly Entry[]): Transfer[] {
  const byAmountThenId = (a: { id: ID; amount: Minor }, b: { id: ID; amount: Minor }) =>
    b.amount - a.amount || a.id.localeCompare(b.id);

  const creditors = entries
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ id, amount }));
  const debtors = entries
    .filter(([, amount]) => amount < 0)
    .map(([id, amount]) => ({ id, amount: -amount }));

  const transfers: Transfer[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort(byAmountThenId);
    debtors.sort(byAmountThenId);
    const creditor = creditors[0]!;
    const debtor = debtors[0]!;
    const amount = Math.min(creditor.amount, debtor.amount);

    transfers.push({ from: debtor.id, to: creditor.id, amount });
    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount === 0) creditors.shift();
    if (debtor.amount === 0) debtors.shift();
  }

  return transfers;
}

function lowestBitIndex(mask: number): number {
  return 31 - Math.clz32(mask & -mask);
}

/**
 * Splits the entries into the maximum number of disjoint groups that each sum to zero.
 *
 * dp[mask] = the largest number of zero-sum groups that can be formed by adding the members
 * of `mask` one at a time, counting a group every time the running total returns to zero.
 * Walking the chain of choices back from the full set recovers an order of members whose
 * running total hits zero exactly at group boundaries.
 */
export function partitionIntoZeroSumGroups(entries: readonly Entry[]): Entry[][] {
  const count = entries.length;
  if (count > OPTIMAL_MEMBER_LIMIT) {
    throw new RangeError(`Cannot partition more than ${OPTIMAL_MEMBER_LIMIT} balances exactly`);
  }

  const full = (1 << count) - 1;
  const totals = new Float64Array(full + 1);
  const best = new Int8Array(full + 1);

  for (let mask = 1; mask <= full; mask += 1) {
    const lowest = lowestBitIndex(mask);
    totals[mask] = totals[mask & (mask - 1)]! + entries[lowest]![1];

    let bestWithoutOne = 0;
    for (let rest = mask; rest !== 0; rest &= rest - 1) {
      const bit = rest & -rest;
      bestWithoutOne = Math.max(bestWithoutOne, best[mask ^ bit]!);
    }
    best[mask] = bestWithoutOne + (totals[mask] === 0 ? 1 : 0);
  }

  const removalOrder: number[] = [];
  let mask = full;
  while (mask !== 0) {
    const target = best[mask]! - (totals[mask] === 0 ? 1 : 0);
    let chosen = -1;
    for (let rest = mask; rest !== 0; rest &= rest - 1) {
      const index = lowestBitIndex(rest);
      if (best[mask ^ (1 << index)] === target) {
        chosen = index;
        break;
      }
    }
    removalOrder.push(chosen);
    mask ^= 1 << chosen;
  }

  const groups: Entry[][] = [];
  let current: Entry[] = [];
  let running = 0;
  for (const index of removalOrder.reverse()) {
    const entry = entries[index]!;
    current.push(entry);
    running += entry[1];
    if (running === 0) {
      groups.push(current);
      current = [];
    }
  }

  return groups;
}

/**
 * Compares how many payments the group needs with and without simplification, so the UI can
 * say things like "3 payments instead of 7".
 */
export function transferCountComparison(
  balances: ReadonlyMap<ID, Minor>,
  pairwiseTransfers: readonly Transfer[],
) {
  return {
    pairwise: pairwiseTransfers.length,
    simplified: simplifyDebts(balances, 'optimal').length,
  };
}
