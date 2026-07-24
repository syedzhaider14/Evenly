import { useMemo } from 'react';

import { formatMoney, parseAmount, toDecimalString, type Minor } from '@/domain/money';

/** Currency-bound formatting helpers for a screen that works in a single group currency. */
export function useMoney(currency: string) {
  return useMemo(
    () => ({
      format: (amount: Minor) => formatMoney(amount, currency),
      formatSigned: (amount: Minor) => formatMoney(amount, currency, { signed: true }),
      parse: (text: string) => parseAmount(text, currency),
      toInput: (amount: Minor) => (amount === 0 ? '' : toDecimalString(amount, currency)),
    }),
    [currency],
  );
}
