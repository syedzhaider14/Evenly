import { allocate, currencyExponent, formatMoney, parseAmount, sum, toDecimalString } from '../money';

describe('currencyExponent', () => {
  it.each([
    ['USD', 2],
    ['eur', 2],
    ['JPY', 0],
    ['KWD', 3],
    ['PKR', 2],
  ])('%s has %i decimals', (currency, expected) => {
    expect(currencyExponent(currency)).toBe(expected);
  });
});

describe('parseAmount', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12,5', 1250],
    ['12.50', 1250],
    ['0.01', 1],
    ['.75', 75],
    ['12.', 1200],
    ['1,234.56', 123456],
    ['1.234,56', 123456],
    ['1 234,56', 123456],
    ['1,234', 123400],
    ['1.234.567', 123456700],
  ])('parses %p as %i minor units of USD', (input, expected) => {
    expect(parseAmount(input, 'USD')).toBe(expected);
  });

  it('respects zero-decimal currencies', () => {
    expect(parseAmount('1500', 'JPY')).toBe(1500);
    expect(parseAmount('1,500', 'JPY')).toBe(1500);
    expect(parseAmount('12.5', 'JPY')).toBeNull();
  });

  it('respects three-decimal currencies', () => {
    expect(parseAmount('1.234', 'KWD')).toBe(1234);
    expect(parseAmount('1.5', 'KWD')).toBe(1500);
  });

  it.each(['', '   ', 'abc', '-5', '1.2345', '12a', '..'])('rejects %p', (input) => {
    expect(parseAmount(input, 'USD')).toBeNull();
  });

  it('reads three digits after the last separator as grouping', () => {
    // "12.345" is twelve thousand three hundred and forty-five in de-DE notation.
    expect(parseAmount('12.345', 'USD')).toBe(1_234_500);
  });
});

describe('toDecimalString', () => {
  it('formats minor units for input fields', () => {
    expect(toDecimalString(1250, 'USD')).toBe('12.50');
    expect(toDecimalString(5, 'USD')).toBe('0.05');
    expect(toDecimalString(0, 'USD')).toBe('0.00');
    expect(toDecimalString(-199, 'USD')).toBe('-1.99');
    expect(toDecimalString(1500, 'JPY')).toBe('1500');
    expect(toDecimalString(1234, 'KWD')).toBe('1.234');
  });

  it('round-trips with parseAmount', () => {
    for (const value of [1, 99, 100, 12345, 999999]) {
      expect(parseAmount(toDecimalString(value, 'USD'), 'USD')).toBe(value);
    }
  });
});

describe('formatMoney', () => {
  it('formats with the currency symbol', () => {
    expect(formatMoney(1250, 'USD', { locale: 'en-US' })).toBe('$12.50');
    expect(formatMoney(1500, 'JPY', { locale: 'en-US' })).toBe('¥1,500');
  });

  it('can always show the sign', () => {
    expect(formatMoney(400, 'USD', { locale: 'en-US', signed: true })).toBe('+$4.00');
    expect(formatMoney(-400, 'USD', { locale: 'en-US', signed: true })).toBe('-$4.00');
    expect(formatMoney(0, 'USD', { locale: 'en-US', signed: true })).toBe('$0.00');
  });
});

describe('allocate', () => {
  it('splits evenly when possible', () => {
    expect(allocate(900, [1, 1, 1])).toEqual([300, 300, 300]);
  });

  it('always sums to the total', () => {
    const totals = [1, 7, 100, 101, 999, 1_000_003];
    const weights = [[1, 1, 1], [3, 2, 5], [1, 0, 1], [7], [10_000, 1, 1]];
    for (const total of totals) {
      for (const w of weights) {
        expect(sum(allocate(total, w))).toBe(total);
      }
    }
  });

  it('gives leftover units to the largest remainders', () => {
    // 100 * 1/3 = 33.33… for everyone, so the first member (by rotation) gets the extra cent.
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    // 10 split 1:2 → 3.33 / 6.67, the second has the larger remainder.
    expect(allocate(10, [1, 2])).toEqual([3, 7]);
  });

  it('rotates who receives the leftover on ties', () => {
    expect(allocate(100, [1, 1, 1], 1)).toEqual([33, 34, 33]);
    expect(allocate(100, [1, 1, 1], 2)).toEqual([33, 33, 34]);
    expect(allocate(100, [1, 1, 1], 5)).toEqual([33, 33, 34]);
    expect(allocate(100, [1, 1, 1], -1)).toEqual([33, 33, 34]);
  });

  it('never gives anything to zero weights', () => {
    expect(allocate(101, [1, 0, 1])).toEqual([51, 0, 50]);
    expect(allocate(101, [0, 1, 1], 0)).toEqual([0, 51, 50]);
  });

  it('handles negative totals symmetrically', () => {
    expect(allocate(-100, [1, 1, 1])).toEqual([-34, -33, -33]);
  });

  it('rejects invalid input', () => {
    expect(() => allocate(1.5, [1])).toThrow(RangeError);
    expect(() => allocate(100, [])).toThrow(RangeError);
    expect(() => allocate(100, [0, 0])).toThrow(RangeError);
    expect(() => allocate(100, [1, -1])).toThrow(RangeError);
    expect(() => allocate(100, [0.5, 1])).toThrow(RangeError);
  });

  it('stays exact for large amounts and weights', () => {
    const total = 9_999_999_999;
    const parts = allocate(total, [3333, 3333, 3334]);
    expect(sum(parts)).toBe(total);
  });
});
