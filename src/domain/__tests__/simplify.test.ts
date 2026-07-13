import { computeBalances } from '../balances';
import {
  OPTIMAL_MEMBER_LIMIT,
  partitionIntoZeroSumGroups,
  settleGreedily,
  simplifyDebts,
  transferCountComparison,
} from '../simplify';
import type { Transfer } from '../types';

const balancesOf = (record: Record<string, number>) => new Map(Object.entries(record));

/** Applies transfers to balances; a correct plan leaves every balance at zero. */
function apply(balances: Map<string, number>, transfers: readonly Transfer[]) {
  const result = new Map(balances);
  for (const t of transfers) {
    result.set(t.from, (result.get(t.from) ?? 0) + t.amount);
    result.set(t.to, (result.get(t.to) ?? 0) - t.amount);
  }
  return result;
}

const allZero = (balances: Map<string, number>) => [...balances.values()].every((v) => v === 0);

/** Exhaustive minimum transfer count for tiny inputs, used as an oracle. */
function bruteForceMinimum(values: number[]): number {
  const nonZero = values.filter((v) => v !== 0);
  if (nonZero.length === 0) return 0;
  let best = Infinity;
  const search = (remaining: number[], count: number) => {
    const index = remaining.findIndex((v) => v !== 0);
    if (index === -1) {
      best = Math.min(best, count);
      return;
    }
    if (count >= best) return;
    for (let j = index + 1; j < remaining.length; j += 1) {
      if (remaining[j]! * remaining[index]! < 0) {
        const next = [...remaining];
        next[j] = next[j]! + next[index]!;
        next[index] = 0;
        search(next, count + 1);
      }
    }
  };
  search(nonZero, 0);
  return best;
}

/** Small deterministic PRNG so the property test is reproducible. */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('simplifyDebts', () => {
  it('returns nothing when everyone is settled', () => {
    expect(simplifyDebts(balancesOf({ a: 0, b: 0 }))).toEqual([]);
    expect(simplifyDebts(new Map())).toEqual([]);
  });

  it('settles a simple two-person debt', () => {
    expect(simplifyDebts(balancesOf({ a: 500, b: -500 }))).toEqual([{ from: 'b', to: 'a', amount: 500 }]);
  });

  it('routes around the middleman in a chain', () => {
    // b owes a 10, c owes b 10 → c can pay a directly.
    const balances = computeBalances(
      ['a', 'b', 'c'],
      [
        { payers: [{ memberId: 'a', amount: 1000 }], shares: [{ memberId: 'b', amount: 1000 }] },
        { payers: [{ memberId: 'b', amount: 1000 }], shares: [{ memberId: 'c', amount: 1000 }] },
      ],
      [],
    );
    expect(simplifyDebts(balances)).toEqual([{ from: 'c', to: 'a', amount: 1000 }]);
  });

  it('finds disjoint zero-sum groups that greedy misses', () => {
    // Greedy pairs the largest amounts first and needs 4 transfers here; the optimum is 3
    // because {a:+5, d:-5} and {b:+4, c:+3, e:-7} settle independently.
    const balances = balancesOf({ a: 5, b: 4, c: 3, d: -5, e: -7 });
    const greedy = simplifyDebts(balances, 'greedy');
    const optimal = simplifyDebts(balances, 'optimal');
    expect(allZero(apply(balances, greedy))).toBe(true);
    expect(allZero(apply(balances, optimal))).toBe(true);
    expect(optimal).toHaveLength(3);
    expect(greedy.length).toBeGreaterThanOrEqual(optimal.length);
  });

  it('throws on balances that do not add up to zero', () => {
    expect(() => simplifyDebts(balancesOf({ a: 10, b: -5 }))).toThrow(/add up to zero/);
  });

  it('is deterministic regardless of insertion order', () => {
    const one = simplifyDebts(balancesOf({ a: 300, b: -100, c: -200 }));
    const two = simplifyDebts(balancesOf({ c: -200, a: 300, b: -100 }));
    expect(one).toEqual(two);
  });

  it('matches the brute-force optimum on random ledgers', () => {
    const random = mulberry32(42);
    for (let round = 0; round < 200; round += 1) {
      const size = 2 + Math.floor(random() * 6);
      const values = Array.from({ length: size - 1 }, () => Math.round((random() - 0.5) * 20) * 50);
      values.push(-values.reduce((acc, v) => acc + v, 0));
      const balances = new Map(values.map((value, index) => [`m${index}`, value]));

      const transfers = simplifyDebts(balances);
      expect(allZero(apply(balances, transfers))).toBe(true);
      expect(transfers.every((t) => t.amount > 0 && t.from !== t.to)).toBe(true);
      expect(transfers).toHaveLength(bruteForceMinimum(values));
    }
  });

  it('falls back to greedy for very large groups', () => {
    const entries: [string, number][] = [];
    for (let i = 0; i < OPTIMAL_MEMBER_LIMIT + 4; i += 1) {
      entries.push([`p${i}`, i % 2 === 0 ? 100 : -100]);
    }
    const balances = new Map(entries);
    const transfers = simplifyDebts(balances);
    expect(allZero(apply(balances, transfers))).toBe(true);
  });
});

describe('partitionIntoZeroSumGroups', () => {
  it('finds the maximum number of zero-sum groups', () => {
    const groups = partitionIntoZeroSumGroups([
      ['a', 5],
      ['b', -5],
      ['c', 3],
      ['d', -1],
      ['e', -2],
    ]);
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect(group.reduce((acc, [, v]) => acc + v, 0)).toBe(0);
    }
  });

  it('refuses inputs above the limit', () => {
    const entries = Array.from({ length: OPTIMAL_MEMBER_LIMIT + 1 }, (_, i) => [`m${i}`, 0] as const);
    expect(() => partitionIntoZeroSumGroups(entries)).toThrow(RangeError);
  });
});

describe('settleGreedily', () => {
  it('pairs the largest debtor with the largest creditor', () => {
    expect(
      settleGreedily([
        ['a', 700],
        ['b', 300],
        ['c', -1000],
      ]),
    ).toEqual([
      { from: 'c', to: 'a', amount: 700 },
      { from: 'c', to: 'b', amount: 300 },
    ]);
  });
});

describe('transferCountComparison', () => {
  it('reports both counts', () => {
    const balances = balancesOf({ a: 1000, b: 0, c: -1000 });
    expect(
      transferCountComparison(balances, [
        { from: 'b', to: 'a', amount: 1000 },
        { from: 'c', to: 'b', amount: 1000 },
      ]),
    ).toEqual({ pairwise: 2, simplified: 1 });
  });
});
