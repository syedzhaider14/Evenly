import {
  validateExpenseDraft,
  validateGroupName,
  validateMemberName,
  validateSettlement,
  type ExpenseDraft,
} from '../validation';

const NOW = Date.UTC(2026, 5, 1);

const draft = (overrides: Partial<ExpenseDraft> = {}): ExpenseDraft => ({
  id: 'expense-1',
  description: 'Groceries',
  amountText: '30',
  category: 'groceries',
  occurredAt: NOW,
  payers: { mode: 'single', memberId: 'ana' },
  split: { method: 'equal', participants: ['ana', 'ben', 'cy'] },
  notes: '',
  ...overrides,
});

describe('validateExpenseDraft', () => {
  it('produces a normalised expense', () => {
    const result = validateExpenseDraft(draft({ description: '  Groceries  ' }), 'USD', NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.description).toBe('Groceries');
    expect(result.value.amount).toBe(3000);
    expect(result.value.payers).toEqual([{ memberId: 'ana', amount: 3000 }]);
    expect(result.value.shares.map((s) => s.amount).reduce((a, b) => a + b, 0)).toBe(3000);
    expect(result.value.notes).toBeNull();
  });

  it('collects every field error at once', () => {
    const result = validateExpenseDraft(
      draft({ description: ' ', amountText: '', notes: 'x'.repeat(501) }),
      'USD',
      NOW,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => `${e.field}:${e.code}`)).toEqual([
      'description:required',
      'amount:required',
      'notes:too_long',
    ]);
  });

  it('rejects zero, invalid and huge amounts', () => {
    for (const [amountText, code] of [
      ['0', 'invalid'],
      ['abc', 'invalid'],
      ['100000000000', 'too_large'],
    ] as const) {
      const result = validateExpenseDraft(draft({ amountText }), 'USD', NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors).toContainEqual({ field: 'amount', code });
    }
  });

  it('surfaces split problems with detail', () => {
    const result = validateExpenseDraft(
      draft({
        split: {
          method: 'exact',
          entries: [
            { memberId: 'ana', value: 1000 },
            { memberId: 'ben', value: 1000 },
          ],
        },
      }),
      'USD',
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        field: 'split',
        code: 'invalid',
        detail: { code: 'exact_mismatch', expected: 3000, actual: 2000 },
      });
    }
  });

  it('rejects dates more than a year ahead', () => {
    const result = validateExpenseDraft(draft({ occurredAt: NOW + 400 * 86_400_000 }), 'USD', NOW);
    expect(result.ok).toBe(false);
  });

  it('uses the expense id to rotate the odd cent', () => {
    const shares = ['a', 'b', 'c', 'd', 'e'].map((id) => {
      const result = validateExpenseDraft(draft({ id, amountText: '0.10' }), 'USD', NOW);
      if (!result.ok) throw new Error('expected a valid draft');
      return result.value.shares.find((s) => s.amount === 4)?.memberId;
    });
    // Not every expense should hand the extra cent to the same person.
    expect(new Set(shares).size).toBeGreaterThan(1);
  });
});

describe('name validation', () => {
  it('validates group names', () => {
    expect(validateGroupName('')).toBe('required');
    expect(validateGroupName('x'.repeat(41))).toBe('too_long');
    expect(validateGroupName('Lisbon')).toBeNull();
  });

  it('detects duplicate member names case-insensitively', () => {
    expect(validateMemberName('ana', ['Ana', 'Ben'])).toBe('duplicate');
    expect(validateMemberName(' Cy ', ['Ana', 'Ben'])).toBeNull();
    expect(validateMemberName('   ', [])).toBe('required');
  });
});

describe('validateSettlement', () => {
  it('requires two different members and a positive amount', () => {
    expect(validateSettlement({ from: null, to: 'b', amount: 100 })).toBe('missing_member');
    expect(validateSettlement({ from: 'a', to: 'a', amount: 100 })).toBe('same_member');
    expect(validateSettlement({ from: 'a', to: 'b', amount: 0 })).toBe('invalid_amount');
    expect(validateSettlement({ from: 'a', to: 'b', amount: null })).toBe('invalid_amount');
    expect(validateSettlement({ from: 'a', to: 'b', amount: 100 })).toBeNull();
  });
});
