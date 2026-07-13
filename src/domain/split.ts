import { allocate, sum, type Minor } from './money';
import type { Allocation, ID } from './types';

export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares';

export interface SplitEntry {
  memberId: ID;
  value: number;
}

/**
 * How an expense is divided between the people who benefited from it.
 *
 * - `equal`: everyone listed pays the same (± one minor unit).
 * - `exact`: `value` is the member's amount in minor units; entries must add up to the total.
 * - `percentage`: `value` is in basis points (`10_000` = 100%); entries must add up to 100%.
 * - `shares`: `value` is in hundredths of a share (`150` = 1.5 shares); any positive total works.
 */
export type SplitInput =
  | { method: 'equal'; participants: ID[] }
  | { method: 'exact'; entries: SplitEntry[] }
  | { method: 'percentage'; entries: SplitEntry[] }
  | { method: 'shares'; entries: SplitEntry[] };

export const FULL_PERCENTAGE_BASIS_POINTS = 10_000;
export const SHARE_SCALE = 100;

export type SplitError =
  | { code: 'invalid_total' }
  | { code: 'no_participants' }
  | { code: 'duplicate_participant'; memberId: ID }
  | { code: 'invalid_value'; memberId: ID }
  | { code: 'exact_mismatch'; expected: Minor; actual: Minor }
  | { code: 'percentage_mismatch'; totalBasisPoints: number }
  | { code: 'zero_weight' };

export type SplitResult = { ok: true; shares: Allocation[] } | { ok: false; error: SplitError };

export interface SplitOptions {
  /** Rotates who receives leftover minor units; see {@link allocate}. */
  rotation?: number;
}

function participantsOf(input: SplitInput): ID[] {
  return input.method === 'equal' ? input.participants : input.entries.map((entry) => entry.memberId);
}

function findDuplicate(ids: readonly ID[]): ID | null {
  const seen = new Set<ID>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
}

function weighted(total: Minor, entries: readonly SplitEntry[], rotation: number): SplitResult {
  const weights = entries.map((entry) => entry.value);
  if (sum(weights) === 0) {
    return { ok: false, error: { code: 'zero_weight' } };
  }
  const amounts = allocate(total, weights, rotation);
  return {
    ok: true,
    shares: entries
      .map((entry, index) => ({ memberId: entry.memberId, amount: amounts[index] ?? 0 }))
      .filter((share) => share.amount !== 0),
  };
}

/**
 * Turns a split input into exact per-member amounts that always add up to `total`.
 * Members whose resulting amount is zero are omitted from the result.
 */
export function computeSplit(total: Minor, input: SplitInput, options: SplitOptions = {}): SplitResult {
  const rotation = options.rotation ?? 0;

  if (!Number.isSafeInteger(total) || total <= 0) {
    return { ok: false, error: { code: 'invalid_total' } };
  }

  const participants = participantsOf(input);
  if (participants.length === 0) {
    return { ok: false, error: { code: 'no_participants' } };
  }

  const duplicate = findDuplicate(participants);
  if (duplicate !== null) {
    return { ok: false, error: { code: 'duplicate_participant', memberId: duplicate } };
  }

  if (input.method !== 'equal') {
    const invalid = input.entries.find(
      (entry) => !Number.isSafeInteger(entry.value) || entry.value < 0,
    );
    if (invalid) {
      return { ok: false, error: { code: 'invalid_value', memberId: invalid.memberId } };
    }
  }

  switch (input.method) {
    case 'equal':
      return weighted(
        total,
        input.participants.map((memberId) => ({ memberId, value: 1 })),
        rotation,
      );

    case 'exact': {
      const actual = sum(input.entries.map((entry) => entry.value));
      if (actual !== total) {
        return { ok: false, error: { code: 'exact_mismatch', expected: total, actual } };
      }
      return {
        ok: true,
        shares: input.entries
          .filter((entry) => entry.value > 0)
          .map((entry) => ({ memberId: entry.memberId, amount: entry.value })),
      };
    }

    case 'percentage': {
      const totalBasisPoints = sum(input.entries.map((entry) => entry.value));
      if (totalBasisPoints !== FULL_PERCENTAGE_BASIS_POINTS) {
        return { ok: false, error: { code: 'percentage_mismatch', totalBasisPoints } };
      }
      return weighted(total, input.entries, rotation);
    }

    case 'shares':
      return weighted(total, input.entries, rotation);
  }
}

/**
 * A small, stable string hash (FNV-1a, 32-bit). Used to derive a per-expense rotation so the
 * leftover cent of an uneven split lands on a different member from expense to expense.
 */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function rotationFor(expenseId: string): number {
  return stableHash(expenseId);
}

/** Members referenced by a split input, in input order. */
export function splitParticipants(input: SplitInput): ID[] {
  return participantsOf(input);
}

/** Builds a sensible split input when the user switches method in the editor. */
export function convertSplitInput(
  input: SplitInput,
  method: SplitMethod,
  total: Minor,
  allMembers: readonly ID[],
): SplitInput {
  const current = participantsOf(input);
  const members = current.length > 0 ? current : [...allMembers];

  switch (method) {
    case 'equal':
      return { method, participants: members };
    case 'exact': {
      const amounts = total > 0 ? allocate(total, members.map(() => 1)) : members.map(() => 0);
      return {
        method,
        entries: members.map((memberId, index) => ({ memberId, value: amounts[index] ?? 0 })),
      };
    }
    case 'percentage': {
      const points = allocate(FULL_PERCENTAGE_BASIS_POINTS, members.map(() => 1));
      return {
        method,
        entries: members.map((memberId, index) => ({ memberId, value: points[index] ?? 0 })),
      };
    }
    case 'shares':
      return { method, entries: members.map((memberId) => ({ memberId, value: SHARE_SCALE })) };
  }
}

/** Payers are entered either as a single member or as explicit per-member amounts. */
export type PayerInput =
  | { mode: 'single'; memberId: ID }
  | { mode: 'multiple'; entries: SplitEntry[] };

export type PayerError =
  | { code: 'no_payer' }
  | { code: 'duplicate_payer'; memberId: ID }
  | { code: 'invalid_value'; memberId: ID }
  | { code: 'payers_mismatch'; expected: Minor; actual: Minor };

export type PayerResult = { ok: true; payers: Allocation[] } | { ok: false; error: PayerError };

export function resolvePayers(total: Minor, input: PayerInput): PayerResult {
  if (input.mode === 'single') {
    if (!input.memberId) return { ok: false, error: { code: 'no_payer' } };
    return { ok: true, payers: [{ memberId: input.memberId, amount: total }] };
  }

  const entries = input.entries.filter((entry) => entry.value !== 0);
  if (entries.length === 0) {
    return { ok: false, error: { code: 'no_payer' } };
  }
  const duplicate = findDuplicate(entries.map((entry) => entry.memberId));
  if (duplicate !== null) {
    return { ok: false, error: { code: 'duplicate_payer', memberId: duplicate } };
  }
  const invalid = entries.find((entry) => !Number.isSafeInteger(entry.value) || entry.value < 0);
  if (invalid) {
    return { ok: false, error: { code: 'invalid_value', memberId: invalid.memberId } };
  }
  const actual = sum(entries.map((entry) => entry.value));
  if (actual !== total) {
    return { ok: false, error: { code: 'payers_mismatch', expected: total, actual } };
  }
  return {
    ok: true,
    payers: entries.map((entry) => ({ memberId: entry.memberId, amount: entry.value })),
  };
}

export function payerInputFrom(payers: readonly Allocation[]): PayerInput {
  if (payers.length === 1 && payers[0]) {
    return { mode: 'single', memberId: payers[0].memberId };
  }
  return {
    mode: 'multiple',
    entries: payers.map((payer) => ({ memberId: payer.memberId, value: payer.amount })),
  };
}
