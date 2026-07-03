import type { CategoryId } from './categories';
import type { Minor } from './money';
import type { SplitInput } from './split';

export type ID = string;

/** A portion of an amount attributed to one member, in minor units. */
export interface Allocation {
  memberId: ID;
  amount: Minor;
}

export interface Group {
  id: ID;
  name: string;
  emoji: string;
  /** ISO 4217 code. Every amount inside a group is stored in this currency. */
  currency: string;
  /** When true the balances screen suggests the minimum number of transfers. */
  simplifyDebts: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Member {
  id: ID;
  groupId: ID;
  name: string;
  color: string;
  /** The member that represents the device owner inside this group. */
  isSelf: boolean;
  createdAt: number;
}

export interface Expense {
  id: ID;
  groupId: ID;
  description: string;
  amount: Minor;
  category: CategoryId;
  /** Who paid, summing to `amount`. */
  payers: Allocation[];
  /** Who consumed, summing to `amount`. Derived from `split` at save time. */
  shares: Allocation[];
  /** The raw split input, kept so the expense can be edited exactly as entered. */
  split: SplitInput;
  notes: string | null;
  occurredAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface Settlement {
  id: ID;
  groupId: ID;
  /** The member who handed over the money. */
  from: ID;
  /** The member who received it. */
  to: ID;
  amount: Minor;
  note: string | null;
  occurredAt: number;
  createdAt: number;
}

/** A suggested or recorded movement of money between two members. */
export interface Transfer {
  from: ID;
  to: ID;
  amount: Minor;
}
