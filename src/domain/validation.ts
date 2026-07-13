import type { CategoryId } from './categories';
import { MAX_AMOUNT_MINOR, parseAmount, type Minor } from './money';
import {
  computeSplit,
  resolvePayers,
  rotationFor,
  type PayerError,
  type PayerInput,
  type SplitError,
  type SplitInput,
} from './split';
import type { Allocation, ID } from './types';

export const DESCRIPTION_MAX_LENGTH = 80;
export const NOTES_MAX_LENGTH = 500;
export const GROUP_NAME_MAX_LENGTH = 40;
export const MEMBER_NAME_MAX_LENGTH = 30;
export const MAX_MEMBERS_PER_GROUP = 50;

/** One year in the future is generous enough for pre-booked costs and catches typos. */
const MAX_FUTURE_MS = 366 * 24 * 60 * 60 * 1000;

export interface ExpenseDraft {
  id: ID;
  description: string;
  amountText: string;
  category: CategoryId;
  occurredAt: number;
  payers: PayerInput;
  split: SplitInput;
  notes: string;
}

export interface ValidExpense {
  id: ID;
  description: string;
  amount: Minor;
  category: CategoryId;
  occurredAt: number;
  payers: Allocation[];
  shares: Allocation[];
  split: SplitInput;
  notes: string | null;
}

export type ExpenseFieldError =
  | { field: 'description'; code: 'required' | 'too_long' }
  | { field: 'amount'; code: 'required' | 'invalid' | 'too_large' }
  | { field: 'occurredAt'; code: 'too_far_in_future' }
  | { field: 'notes'; code: 'too_long' }
  | { field: 'payers'; code: 'invalid'; detail: PayerError }
  | { field: 'split'; code: 'invalid'; detail: SplitError };

export type ExpenseValidation =
  | { ok: true; value: ValidExpense }
  | { ok: false; errors: ExpenseFieldError[] };

export function validateExpenseDraft(
  draft: ExpenseDraft,
  currency: string,
  now: number,
): ExpenseValidation {
  const errors: ExpenseFieldError[] = [];
  const description = draft.description.trim();
  const notes = draft.notes.trim();

  if (description.length === 0) errors.push({ field: 'description', code: 'required' });
  else if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.push({ field: 'description', code: 'too_long' });
  }

  let amount: Minor | null = null;
  if (draft.amountText.trim().length === 0) {
    errors.push({ field: 'amount', code: 'required' });
  } else {
    amount = parseAmount(draft.amountText, currency);
    if (amount === null || amount === 0) {
      errors.push({ field: 'amount', code: 'invalid' });
      amount = null;
    } else if (amount > MAX_AMOUNT_MINOR) {
      errors.push({ field: 'amount', code: 'too_large' });
      amount = null;
    }
  }

  if (draft.occurredAt - now > MAX_FUTURE_MS) {
    errors.push({ field: 'occurredAt', code: 'too_far_in_future' });
  }

  if (notes.length > NOTES_MAX_LENGTH) errors.push({ field: 'notes', code: 'too_long' });

  let payers: Allocation[] = [];
  let shares: Allocation[] = [];

  if (amount !== null) {
    const payerResult = resolvePayers(amount, draft.payers);
    if (payerResult.ok) payers = payerResult.payers;
    else errors.push({ field: 'payers', code: 'invalid', detail: payerResult.error });

    const splitResult = computeSplit(amount, draft.split, { rotation: rotationFor(draft.id) });
    if (splitResult.ok) shares = splitResult.shares;
    else errors.push({ field: 'split', code: 'invalid', detail: splitResult.error });
  }

  if (errors.length > 0 || amount === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      id: draft.id,
      description,
      amount,
      category: draft.category,
      occurredAt: draft.occurredAt,
      payers,
      shares,
      split: draft.split,
      notes: notes.length > 0 ? notes : null,
    },
  };
}

export type NameError = 'required' | 'too_long' | 'duplicate';

export function validateGroupName(name: string): NameError | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'required';
  if (trimmed.length > GROUP_NAME_MAX_LENGTH) return 'too_long';
  return null;
}

export function validateMemberName(name: string, existing: readonly string[]): NameError | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'required';
  if (trimmed.length > MEMBER_NAME_MAX_LENGTH) return 'too_long';
  const lower = trimmed.toLocaleLowerCase();
  if (existing.some((other) => other.trim().toLocaleLowerCase() === lower)) return 'duplicate';
  return null;
}

export type SettlementError = 'same_member' | 'invalid_amount' | 'missing_member';

export function validateSettlement(input: {
  from: ID | null;
  to: ID | null;
  amount: Minor | null;
}): SettlementError | null {
  if (!input.from || !input.to) return 'missing_member';
  if (input.from === input.to) return 'same_member';
  if (input.amount === null || input.amount <= 0 || input.amount > MAX_AMOUNT_MINOR) {
    return 'invalid_amount';
  }
  return null;
}
