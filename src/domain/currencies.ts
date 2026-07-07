export interface CurrencyOption {
  code: string;
  name: string;
}

/** Currencies offered in pickers. Any valid ISO 4217 code works in the domain layer. */
export const COMMON_CURRENCIES: readonly CurrencyOption[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'TRY', name: 'Turkish Lira' },
];

export function isCurrencyCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}
