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
