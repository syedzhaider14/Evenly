import { formatMoney } from '@/domain/money';
import type { PayerError, SplitError } from '@/domain/split';
import type { ExpenseFieldError, NameError, SettlementError } from '@/domain/validation';
import {
  DESCRIPTION_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
  MEMBER_NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
} from '@/domain/validation';

import { formatBasisPoints } from './format';

/** All user-facing copy for domain errors lives here so it can be localised in one place. */

export function describeSplitError(error: SplitError, currency: string): string {
  switch (error.code) {
    case 'invalid_total':
      return 'Enter the total amount first.';
    case 'no_participants':
      return 'Choose at least one person to split with.';
    case 'duplicate_participant':
      return 'Someone appears twice in the split.';
    case 'invalid_value':
      return 'Split values must be zero or more.';
    case 'zero_weight':
      return 'Give at least one person a share.';
    case 'percentage_mismatch':
      return `Percentages add up to ${formatBasisPoints(error.totalBasisPoints)}, not 100%.`;
    case 'exact_mismatch': {
      const difference = error.expected - error.actual;
      const amount = formatMoney(Math.abs(difference), currency);
      return difference > 0 ? `${amount} left to assign.` : `${amount} over the total.`;
    }
  }
}

export function describePayerError(error: PayerError, currency: string): string {
  switch (error.code) {
    case 'no_payer':
      return 'Choose who paid.';
    case 'duplicate_payer':
      return 'Someone is listed as a payer twice.';
    case 'invalid_value':
      return 'Paid amounts must be zero or more.';
    case 'payers_mismatch': {
      const difference = error.expected - error.actual;
      const amount = formatMoney(Math.abs(difference), currency);
      return difference > 0 ? `${amount} of the total isn't paid by anyone yet.` : `Payments exceed the total by ${amount}.`;
    }
  }
}

export function describeExpenseError(error: ExpenseFieldError, currency: string): string {
  switch (error.field) {
    case 'description':
      return error.code === 'required'
        ? 'Add a short description.'
        : `Keep it under ${DESCRIPTION_MAX_LENGTH} characters.`;
    case 'amount':
      if (error.code === 'required') return 'Enter an amount.';
      if (error.code === 'too_large') return 'That amount is too large.';
      return `Enter a valid amount in ${currency}.`;
    case 'occurredAt':
      return 'That date is too far in the future.';
    case 'notes':
      return `Notes are limited to ${NOTES_MAX_LENGTH} characters.`;
    case 'payers':
      return describePayerError(error.detail, currency);
    case 'split':
      return describeSplitError(error.detail, currency);
  }
}

export function describeNameError(error: NameError, kind: 'group' | 'member'): string {
  const max = kind === 'group' ? GROUP_NAME_MAX_LENGTH : MEMBER_NAME_MAX_LENGTH;
  switch (error) {
    case 'required':
      return kind === 'group' ? 'Give the group a name.' : 'Enter a name.';
    case 'too_long':
      return `Keep it under ${max} characters.`;
    case 'duplicate':
      return 'Someone in this group already has that name.';
  }
}

export function describeSettlementError(error: SettlementError): string {
  switch (error) {
    case 'missing_member':
      return 'Choose who paid and who received the money.';
    case 'same_member':
      return 'Pick two different people.';
    case 'invalid_amount':
      return 'Enter a valid amount.';
  }
}
