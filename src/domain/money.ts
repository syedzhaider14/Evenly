/**
 * Money is always held as an integer count of minor units (cents, pence, fils, yen…).
 * Floating point only appears at the UI boundary, when parsing input or formatting output.
 */
export type Minor = number;

/** Largest amount a single expense may hold, in minor units. Keeps all maths far from 2^53. */
export const MAX_AMOUNT_MINOR: Minor = 9_999_999_999;

/** ISO 4217 currencies whose minor unit is not 1/100. Everything else defaults to 2. */
const CURRENCY_EXPONENTS: Readonly<Record<string, number>> = {
  BHD: 3,
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  IQD: 3,
  ISK: 0,
  JOD: 3,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  PYG: 0,
  RWF: 0,
  TND: 3,
  UGX: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
};

export function currencyExponent(currency: string): number {
  return CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2;
}

/**
 * Parses user input such as `12`, `12.5`, `1,234.56`, `1.234,56` or `12,50` into minor units.
 *
 * The last `.` or `,` is the decimal separator when it is followed by at most `exponent`
 * digits. When it is followed by exactly three digits (and the currency has fewer decimals)
 * it is digit grouping. Anything else is rejected, so `12.5` is invalid for JPY and
 * `1.2345` is invalid for USD. Returns `null` for input the currency cannot represent.
 */
export function parseAmount(input: string, currency: string): Minor | null {
  const exponent = currencyExponent(currency);
  const cleaned = input.replace(/[\s  ']/g, '');
  if (cleaned.length === 0 || !/^[\d.,]+$/.test(cleaned) || !/\d/.test(cleaned)) {
    return null;
  }

  const lastSeparator = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  let integerPart = cleaned;
  let fractionPart = '';

  if (lastSeparator !== -1) {
    const tail = cleaned.slice(lastSeparator + 1);
    if (tail.length <= exponent) {
      integerPart = cleaned.slice(0, lastSeparator);
      fractionPart = tail;
    } else if (tail.length !== 3) {
      return null;
    }
  }

  const integerDigits = integerPart.replace(/[.,]/g, '');
  const digits = `${integerDigits || '0'}${fractionPart.padEnd(exponent, '0')}`;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

/** Converts minor units to a plain decimal string suitable for an input field, e.g. `1250 → "12.50"`. */
export function toDecimalString(amount: Minor, currency: string): string {
  const exponent = currencyExponent(currency);
  const negative = amount < 0;
  const digits = Math.abs(amount).toString().padStart(exponent + 1, '0');
  const whole = exponent === 0 ? digits : digits.slice(0, -exponent);
  const fraction = exponent === 0 ? '' : `.${digits.slice(-exponent)}`;
  return `${negative ? '-' : ''}${whole}${fraction}`;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string, locale: string | undefined, signed: boolean) {
  const key = `${locale ?? ''}|${currency}|${signed}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    const exponent = currencyExponent(currency);
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
      signDisplay: signed ? 'exceptZero' : 'auto',
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export interface FormatMoneyOptions {
  locale?: string;
  /** Always show a sign for non-zero values (`+$4.00`, `-$4.00`). */
  signed?: boolean;
}

export function formatMoney(amount: Minor, currency: string, options: FormatMoneyOptions = {}): string {
  const exponent = currencyExponent(currency);
  return formatterFor(currency, options.locale, options.signed ?? false).format(
    amount / 10 ** exponent,
  );
}

/**
 * Splits `total` into integer parts proportional to `weights` using the largest-remainder
 * method, so the parts always add up to exactly `total`.
 *
 * Weights must be non-negative integers. When two parts have the same remainder, the leftover
 * unit goes to the one that comes first after rotating the list by `rotation`. Callers pass a
 * per-expense rotation so the same person does not absorb every odd cent.
 */
export function allocate(total: Minor, weights: readonly number[], rotation = 0): Minor[] {
  if (!Number.isSafeInteger(total)) {
    throw new RangeError(`total must be a safe integer, received ${total}`);
  }
  if (weights.length === 0) {
    throw new RangeError('weights must not be empty');
  }
  for (const weight of weights) {
    if (!Number.isSafeInteger(weight) || weight < 0) {
      throw new RangeError(`weights must be non-negative integers, received ${weight}`);
    }
  }

  const weightSum = weights.reduce((sum, weight) => sum + BigInt(weight), 0n);
  if (weightSum === 0n) {
    throw new RangeError('weights must not all be zero');
  }

  const sign = total < 0 ? -1 : 1;
  const absolute = BigInt(Math.abs(total));
  const count = weights.length;
  const offset = ((rotation % count) + count) % count;

  const parts = weights.map((weight, index) => {
    const product = absolute * BigInt(weight);
    return {
      index,
      weight,
      quotient: product / weightSum,
      remainder: product % weightSum,
      priority: (index - offset + count) % count,
    };
  });

  const distributed = parts.reduce((sum, part) => sum + part.quotient, 0n);
  let leftover = Number(absolute - distributed);

  const byRemainder = [...parts]
    .filter((part) => part.weight > 0)
    .sort((a, b) => {
      if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
      return a.priority - b.priority;
    });

  for (const part of byRemainder) {
    if (leftover === 0) break;
    part.quotient += 1n;
    leftover -= 1;
  }

  return parts.map((part) => {
    const value = Number(part.quotient) * sign;
    return value === 0 ? 0 : value;
  });
}

export function sum(values: readonly Minor[]): Minor {
  return values.reduce((total, value) => total + value, 0);
}
