import { useMemo, useState } from 'react';

import { uuidGenerator } from '@/data/uuid';
import { suggestCategory, type CategoryId } from '@/domain/categories';
import { parseAmount, toDecimalString } from '@/domain/money';
import { payerInputFrom, type PayerInput, type SplitInput } from '@/domain/split';
import type { Expense, Member } from '@/domain/types';
import { validateExpenseDraft, type ExpenseFieldError } from '@/domain/validation';
import { describeExpenseError } from '@/utils/messages';

type Field = ExpenseFieldError['field'];

interface Options {
  currency: string;
  members: readonly Member[];
  existing?: Expense;
}

/**
 * State and validation for the add/edit expense form. All money rules live in the domain
 * layer; this hook only wires them to inputs and decides when errors become visible.
 */
export function useExpenseForm({ currency, members, existing }: Options) {
  const self = members.find((member) => member.isSelf) ?? members[0];

  const [id] = useState(() => existing?.id ?? uuidGenerator.next());
  const [description, setDescriptionRaw] = useState(existing?.description ?? '');
  const [amountText, setAmountText] = useState(
    existing ? toDecimalString(existing.amount, currency) : '',
  );
  const [category, setCategoryRaw] = useState<CategoryId>(existing?.category ?? 'other');
  const [categoryTouched, setCategoryTouched] = useState(Boolean(existing));
  const [occurredAt, setOccurredAt] = useState(existing?.occurredAt ?? Date.now());
  const [payers, setPayers] = useState<PayerInput>(
    existing ? payerInputFrom(existing.payers) : { mode: 'single', memberId: self?.id ?? '' },
  );
  const [split, setSplit] = useState<SplitInput>(
    existing?.split ?? { method: 'equal', participants: members.map((member) => member.id) },
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);

  const total = useMemo(() => {
    const parsed = parseAmount(amountText, currency);
    return parsed !== null && parsed > 0 ? parsed : null;
  }, [amountText, currency]);

  const validation = useMemo(
    () =>
      validateExpenseDraft(
        { id, description, amountText, category, occurredAt, payers, split, notes },
        currency,
        Date.now(),
      ),
    [id, description, amountText, category, occurredAt, payers, split, notes, currency],
  );

  const errors = useMemo(() => {
    const map: Partial<Record<Field, string>> = {};
    if (validation.ok) return map;
    for (const error of validation.errors) {
      // Split and payer problems are shown live because they are mid-edit feedback;
      // everything else waits for the first submit so the form doesn't shout while typing.
      const live = error.field === 'split' || error.field === 'payers';
      if ((submitted || live) && !map[error.field]) {
        map[error.field] = describeExpenseError(error, currency);
      }
    }
    return map;
  }, [validation, submitted, currency]);

  return {
    id,
    values: { description, amountText, category, occurredAt, payers, split, notes },
    total,
    errors,
    validation,
    isEditing: Boolean(existing),
    setDescription: (value: string) => {
      setDescriptionRaw(value);
      if (!categoryTouched) {
        setCategoryRaw(suggestCategory(value) ?? 'other');
      }
    },
    setAmountText,
    setCategory: (value: CategoryId) => {
      setCategoryTouched(true);
      setCategoryRaw(value);
    },
    setOccurredAt,
    setPayers,
    setSplit,
    setNotes,
    markSubmitted: () => setSubmitted(true),
  };
}
