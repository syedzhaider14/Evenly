import { localDayKey } from '@/domain/activity';
import { formatMoney } from '@/domain/money';
import { FULL_PERCENTAGE_BASIS_POINTS, SHARE_SCALE } from '@/domain/split';

const DAY_MS = 24 * 60 * 60 * 1000;

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const fullDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** "Today", "Yesterday" or a short date such as "Tue, 14 Oct". */
export function formatRelativeDay(timestamp: number, now: number = Date.now()): string {
  const key = localDayKey(timestamp);
  if (key === localDayKey(now)) return 'Today';
  if (key === localDayKey(now - DAY_MS)) return 'Yesterday';
  return dayFormatter.format(new Date(timestamp));
}

export function formatDate(timestamp: number): string {
  return fullDateFormatter.format(new Date(timestamp));
}

/** Converts a `YYYY-MM-DD` day key back to a readable heading. */
export function formatDayKey(key: string, now: number = Date.now()): string {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  return formatRelativeDay(new Date(year, month - 1, day).getTime(), now);
}

export function formatBasisPoints(basisPoints: number): string {
  const percent = (basisPoints / FULL_PERCENTAGE_BASIS_POINTS) * 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
}

export function formatShares(scaled: number): string {
  const value = scaled / SHARE_SCALE;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, '');
}

/** "owes you $12.00" / "you owe $12.00" / "settled up" from the device owner's perspective. */
export function describeSelfBalance(balance: number, currency: string): string {
  if (balance === 0) return 'Settled up';
  const amount = formatMoney(Math.abs(balance), currency);
  return balance > 0 ? `You are owed ${amount}` : `You owe ${amount}`;
}

export function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

export function shiftDays(timestamp: number, days: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}
