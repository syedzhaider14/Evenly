import {
  computeBalances,
  computePairwiseDebts,
  expenseImpact,
  isBalanced,
  summarize,
  type LedgerExpense,
} from '../balances';

const expense = (
  amount: number,
  payers: Record<string, number>,
  shares: Record<string, number>,
): LedgerExpense & { amount: number } => ({
  amount,
  payers: Object.entries(payers).map(([memberId, value]) => ({ memberId, amount: value })),
  shares: Object.entries(shares).map(([memberId, value]) => ({ memberId, amount: value })),
});

describe('computeBalances', () => {
  it('credits payers and debits consumers', () => {
    const balances = computeBalances(
      ['ana', 'ben', 'cy'],
      [expense(3000, { ana: 3000 }, { ana: 1000, ben: 1000, cy: 1000 })],
      [],
    );
    expect(Object.fromEntries(balances)).toEqual({ ana: 2000, ben: -1000, cy: -1000 });
    expect(isBalanced(balances)).toBe(true);
  });

  it('applies settlements in the right direction', () => {
    const balances = computeBalances(
      ['ana', 'ben'],
      [expense(2000, { ana: 2000 }, { ana: 1000, ben: 1000 })],
      [{ from: 'ben', to: 'ana', amount: 1000 }],
    );
    expect(Object.fromEntries(balances)).toEqual({ ana: 0, ben: 0 });
  });

  it('includes members with no activity at zero', () => {
    const balances = computeBalances(['ana', 'ben', 'idle'], [], []);
    expect(balances.get('idle')).toBe(0);
  });

  it('handles multiple payers', () => {
    const balances = computeBalances(
      ['ana', 'ben', 'cy'],
      [expense(9000, { ana: 6000, ben: 3000 }, { ana: 3000, ben: 3000, cy: 3000 })],
      [],
    );
    expect(Object.fromEntries(balances)).toEqual({ ana: 3000, ben: 0, cy: -3000 });
  });
});

describe('computePairwiseDebts', () => {
  it('nets debts between each pair', () => {
    const transfers = computePairwiseDebts(
      [
        expense(2000, { ana: 2000 }, { ana: 1000, ben: 1000 }),
        expense(600, { ben: 600 }, { ana: 300, ben: 300 }),
      ],
      [],
    );
    expect(transfers).toEqual([{ from: 'ben', to: 'ana', amount: 700 }]);
  });

  it('keeps debts between the people who actually shared costs', () => {
    // ben owes ana, cy owes ben. Without simplification cy never pays ana directly.
    const transfers = computePairwiseDebts(
      [
        expense(1000, { ana: 1000 }, { ben: 1000 }),
        expense(1000, { ben: 1000 }, { cy: 1000 }),
      ],
      [],
    );
    expect(transfers).toEqual([
      { from: 'ben', to: 'ana', amount: 1000 },
      { from: 'cy', to: 'ben', amount: 1000 },
    ]);
  });

  it('splits a consumer share across several payers proportionally', () => {
    const transfers = computePairwiseDebts(
      [expense(900, { ana: 600, ben: 300 }, { cy: 900 })],
      [],
    );
    expect(transfers).toEqual([
      { from: 'cy', to: 'ana', amount: 600 },
      { from: 'cy', to: 'ben', amount: 300 },
    ]);
  });

  it('reduces debts by recorded payments and flips overpayments', () => {
    const ledger = [expense(1000, { ana: 1000 }, { ben: 1000 })];
    expect(computePairwiseDebts(ledger, [{ from: 'ben', to: 'ana', amount: 400 }])).toEqual([
      { from: 'ben', to: 'ana', amount: 600 },
    ]);
    expect(computePairwiseDebts(ledger, [{ from: 'ben', to: 'ana', amount: 1000 }])).toEqual([]);
    expect(computePairwiseDebts(ledger, [{ from: 'ben', to: 'ana', amount: 1200 }])).toEqual([
      { from: 'ana', to: 'ben', amount: 200 },
    ]);
  });
});

describe('summarize', () => {
  it('totals what each member paid and consumed', () => {
    const summary = summarize([
      expense(3000, { ana: 3000 }, { ana: 1000, ben: 2000 }),
      expense(500, { ben: 500 }, { ana: 500 }),
    ]);
    expect(summary.totalSpent).toBe(3500);
    expect(Object.fromEntries(summary.paidBy)).toEqual({ ana: 3000, ben: 500 });
    expect(Object.fromEntries(summary.consumedBy)).toEqual({ ana: 1500, ben: 2000 });
  });
});

describe('expenseImpact', () => {
  it('is positive for lenders and negative for borrowers', () => {
    const e = expense(3000, { ana: 3000 }, { ana: 1000, ben: 2000 });
    expect(expenseImpact(e, 'ana')).toBe(2000);
    expect(expenseImpact(e, 'ben')).toBe(-2000);
    expect(expenseImpact(e, 'cy')).toBe(0);
  });
});
