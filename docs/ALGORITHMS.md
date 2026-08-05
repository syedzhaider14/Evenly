# Algorithms

## 1. Allocating an amount by weights

Every split method reduces to "divide `total` minor units in proportion to integer weights":

| Method | Weights |
| --- | --- |
| Equal | `1` for each participant |
| Percentage | basis points (`10 000` = 100%) |
| Shares | hundredths of a share (`150` = 1.5 shares) |
| Exact | no allocation needed; the entries must already sum to the total |

`allocate(total, weights, rotation)` uses the **largest remainder method**:

1. For each weight `wᵢ` compute `qᵢ = ⌊total · wᵢ / Σw⌋` and the remainder `rᵢ = total · wᵢ mod Σw`.
2. `Σqᵢ` is at most `n − 1` short of `total`. Hand out the missing units one at a time to the
   parts with the largest remainders.
3. Ties are broken by position after rotating the list by `rotation`.

Properties (all covered by tests):

- The parts always sum to exactly `total`.
- No part differs from its exact proportional value by one unit or more.
- Zero weights always receive zero.

### Fair rounding across expenses

Splitting €10.00 three ways gives `334 / 333 / 333`. If the first person always took the extra
cent, they would slowly pay more than everyone else. Each expense therefore uses
`rotation = FNV-1a(expenseId)`, which spreads the extra cent pseudo-randomly but
deterministically: re-saving the same expense always produces the same shares.

## 2. Balances

For each member:

```
balance = Σ(amounts they paid) − Σ(their shares) + Σ(payments they made) − Σ(payments they received)
```

Positive means the group owes them; negative means they owe the group. Balances always sum to
zero, because every expense's payers and shares both sum to the expense total.

## 3. Settling up with the fewest payments

Given balances `b₁ … bₙ` (non-zero, summing to zero), find the fewest transfers that bring
everyone to zero.

### Greedy (fallback)

Repeatedly let the largest debtor pay the largest creditor `min(|debt|, credit)`. Each step zeros
at least one person, so it needs at most `n − 1` transfers. It is not always optimal:

```
a: +5   b: +4   c: +3   d: −5   e: −7
```

Greedy produces 4 transfers. The optimum is 3, because `{a, d}` and `{b, c, e}` each sum to zero
and can be settled independently.

### Exact

If the balances can be partitioned into `k` disjoint groups that each sum to zero, each group of
size `m` settles in `m − 1` transfers, for `n − k` in total. Minimising transfers is therefore
the same as **maximising the number of zero-sum groups** `k`.

Dynamic programme over subsets (bitmasks):

```
sum[mask]  = Σ bᵢ for i in mask
best[mask] = max over i ∈ mask of best[mask \ {i}]  +  (sum[mask] == 0 ? 1 : 0)
```

Think of adding members one at a time: `best` counts how many times the running total can
return to zero. Walking back from the full mask recovers an ordering whose zero crossings are
the group boundaries. Each group is then settled greedily.

Complexity is `O(2ⁿ · n)` time and `O(2ⁿ)` memory. With `n ≤ 16` that is about a million
steps, comfortably under a frame budget on a phone. Larger groups fall back to greedy.

The test suite checks the exact algorithm against an exhaustive search on 200 random ledgers.

### Not simplifying

Some groups prefer that people only pay those they actually shared costs with. With
simplification switched off, each consumer's share of an expense is attributed to the payers in
proportion to what they paid, payments reduce the matching pair's debt, and each pair is netted
into at most one transfer.
