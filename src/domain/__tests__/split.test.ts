import { sum } from '../money';
import {
  computeSplit,
  convertSplitInput,
  payerInputFrom,
  resolvePayers,
  rotationFor,
  stableHash,
  type SplitInput,
} from '../split';

const shareMap = (input: SplitInput, total: number, rotation = 0) => {
  const result = computeSplit(total, input, { rotation });
  if (!result.ok) throw new Error(`unexpected error ${result.error.code}`);
  return Object.fromEntries(result.shares.map((share) => [share.memberId, share.amount]));
};

describe('computeSplit', () => {
  describe('equal', () => {
    it('divides the total between participants', () => {
      expect(shareMap({ method: 'equal', participants: ['a', 'b', 'c', 'd'] }, 4000)).toEqual({
        a: 1000,
        b: 1000,
        c: 1000,
        d: 1000,
      });
    });

    it('assigns the odd cent deterministically', () => {
      expect(shareMap({ method: 'equal', participants: ['a', 'b', 'c'] }, 1000)).toEqual({
        a: 334,
        b: 333,
        c: 333,
      });
      expect(shareMap({ method: 'equal', participants: ['a', 'b', 'c'] }, 1000, 1)).toEqual({
        a: 333,
        b: 334,
        c: 333,
      });
    });

    it('requires at least one participant', () => {
      expect(computeSplit(100, { method: 'equal', participants: [] })).toEqual({
        ok: false,
        error: { code: 'no_participants' },
      });
    });

    it('rejects duplicates', () => {
      expect(computeSplit(100, { method: 'equal', participants: ['a', 'a'] })).toEqual({
        ok: false,
        error: { code: 'duplicate_participant', memberId: 'a' },
      });
    });
  });

  describe('exact', () => {
    it('uses the amounts as entered', () => {
      const input: SplitInput = {
        method: 'exact',
        entries: [
          { memberId: 'a', value: 700 },
          { memberId: 'b', value: 300 },
          { memberId: 'c', value: 0 },
        ],
      };
      expect(shareMap(input, 1000)).toEqual({ a: 700, b: 300 });
    });

    it('reports how far off the entries are', () => {
      const result = computeSplit(1000, {
        method: 'exact',
        entries: [
          { memberId: 'a', value: 600 },
          { memberId: 'b', value: 300 },
        ],
      });
      expect(result).toEqual({
        ok: false,
        error: { code: 'exact_mismatch', expected: 1000, actual: 900 },
      });
    });
  });

  describe('percentage', () => {
    it('splits by basis points', () => {
      const input: SplitInput = {
        method: 'percentage',
        entries: [
          { memberId: 'a', value: 5000 },
          { memberId: 'b', value: 2500 },
          { memberId: 'c', value: 2500 },
        ],
      };
      expect(shareMap(input, 1001)).toEqual({ a: 501, b: 250, c: 250 });
    });

    it('requires exactly 100%', () => {
      const result = computeSplit(1000, {
        method: 'percentage',
        entries: [
          { memberId: 'a', value: 5000 },
          { memberId: 'b', value: 4000 },
        ],
      });
      expect(result).toEqual({
        ok: false,
        error: { code: 'percentage_mismatch', totalBasisPoints: 9000 },
      });
    });
  });

  describe('shares', () => {
    it('splits proportionally to shares', () => {
      const input: SplitInput = {
        method: 'shares',
        entries: [
          { memberId: 'a', value: 200 },
          { memberId: 'b', value: 100 },
          { memberId: 'c', value: 100 },
        ],
      };
      expect(shareMap(input, 1000)).toEqual({ a: 500, b: 250, c: 250 });
    });

    it('supports fractional shares', () => {
      const input: SplitInput = {
        method: 'shares',
        entries: [
          { memberId: 'a', value: 150 },
          { memberId: 'b', value: 50 },
        ],
      };
      expect(shareMap(input, 800)).toEqual({ a: 600, b: 200 });
    });

    it('rejects all-zero shares', () => {
      const result = computeSplit(1000, {
        method: 'shares',
        entries: [{ memberId: 'a', value: 0 }],
      });
      expect(result).toEqual({ ok: false, error: { code: 'zero_weight' } });
    });

    it('rejects negative values', () => {
      const result = computeSplit(1000, {
        method: 'shares',
        entries: [
          { memberId: 'a', value: 100 },
          { memberId: 'b', value: -100 },
        ],
      });
      expect(result).toEqual({ ok: false, error: { code: 'invalid_value', memberId: 'b' } });
    });
  });

  it('rejects non-positive totals', () => {
    expect(computeSplit(0, { method: 'equal', participants: ['a'] })).toEqual({
      ok: false,
      error: { code: 'invalid_total' },
    });
  });

  it('always sums to the total for every method', () => {
    const members = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    for (let total = 1; total <= 500; total += 7) {
      for (const method of ['equal', 'percentage', 'shares'] as const) {
        const input = convertSplitInput({ method: 'equal', participants: members }, method, total, members);
        const result = computeSplit(total, input, { rotation: total });
        expect(result.ok).toBe(true);
        if (result.ok) expect(sum(result.shares.map((s) => s.amount))).toBe(total);
      }
    }
  });
});

describe('convertSplitInput', () => {
  const members = ['a', 'b', 'c'];

  it('keeps the participants when switching method', () => {
    const equal: SplitInput = { method: 'equal', participants: ['a', 'c'] };
    expect(convertSplitInput(equal, 'shares', 1000, members)).toEqual({
      method: 'shares',
      entries: [
        { memberId: 'a', value: 100 },
        { memberId: 'c', value: 100 },
      ],
    });
  });

  it('pre-fills exact amounts that already add up', () => {
    const converted = convertSplitInput({ method: 'equal', participants: members }, 'exact', 1000, members);
    expect(converted.method).toBe('exact');
    if (converted.method === 'exact') {
      expect(sum(converted.entries.map((e) => e.value))).toBe(1000);
    }
  });

  it('pre-fills percentages that add up to 100%', () => {
    const converted = convertSplitInput({ method: 'equal', participants: members }, 'percentage', 1000, members);
    if (converted.method === 'percentage') {
      expect(sum(converted.entries.map((e) => e.value))).toBe(10_000);
    }
  });

  it('falls back to everyone when nobody is selected', () => {
    expect(convertSplitInput({ method: 'equal', participants: [] }, 'equal', 0, members)).toEqual({
      method: 'equal',
      participants: members,
    });
  });
});

describe('resolvePayers', () => {
  it('assigns the whole amount to a single payer', () => {
    expect(resolvePayers(1000, { mode: 'single', memberId: 'a' })).toEqual({
      ok: true,
      payers: [{ memberId: 'a', amount: 1000 }],
    });
  });

  it('validates multiple payers against the total', () => {
    expect(
      resolvePayers(1000, {
        mode: 'multiple',
        entries: [
          { memberId: 'a', value: 600 },
          { memberId: 'b', value: 400 },
          { memberId: 'c', value: 0 },
        ],
      }),
    ).toEqual({
      ok: true,
      payers: [
        { memberId: 'a', amount: 600 },
        { memberId: 'b', amount: 400 },
      ],
    });

    expect(
      resolvePayers(1000, { mode: 'multiple', entries: [{ memberId: 'a', value: 600 }] }),
    ).toEqual({ ok: false, error: { code: 'payers_mismatch', expected: 1000, actual: 600 } });
  });

  it('requires a payer', () => {
    expect(resolvePayers(1000, { mode: 'single', memberId: '' })).toEqual({
      ok: false,
      error: { code: 'no_payer' },
    });
    expect(resolvePayers(1000, { mode: 'multiple', entries: [] })).toEqual({
      ok: false,
      error: { code: 'no_payer' },
    });
  });

  it('round-trips through payerInputFrom', () => {
    expect(payerInputFrom([{ memberId: 'a', amount: 5 }])).toEqual({ mode: 'single', memberId: 'a' });
    expect(
      payerInputFrom([
        { memberId: 'a', amount: 5 },
        { memberId: 'b', amount: 5 },
      ]),
    ).toEqual({
      mode: 'multiple',
      entries: [
        { memberId: 'a', value: 5 },
        { memberId: 'b', value: 5 },
      ],
    });
  });
});

describe('stableHash', () => {
  it('is deterministic and spreads values', () => {
    expect(stableHash('expense-1')).toBe(stableHash('expense-1'));
    expect(stableHash('expense-1')).not.toBe(stableHash('expense-2'));
    expect(rotationFor('abc')).toBeGreaterThanOrEqual(0);
  });

  it('matches the FNV-1a reference value', () => {
    expect(stableHash('')).toBe(0x811c9dc5);
    expect(stableHash('a')).toBe(0xe40c292c);
  });
});
