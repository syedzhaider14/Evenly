import type { Expense, Group, Member } from '@/domain/types';

export const T0 = Date.UTC(2026, 3, 1, 12);

export function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'g1',
    name: 'Lisbon trip',
    emoji: '✈️',
    currency: 'EUR',
    simplifyDebts: true,
    archived: false,
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}

export function makeMember(id: string, overrides: Partial<Member> = {}): Member {
  return {
    id,
    groupId: 'g1',
    name: id.charAt(0).toUpperCase() + id.slice(1),
    color: '#0F766E',
    isSelf: false,
    createdAt: T0,
    ...overrides,
  };
}

export function makeExpense(id: string, overrides: Partial<Expense> = {}): Expense {
  return {
    id,
    groupId: 'g1',
    description: 'Dinner',
    amount: 3000,
    category: 'food',
    payers: [{ memberId: 'ana', amount: 3000 }],
    shares: [
      { memberId: 'ana', amount: 1000 },
      { memberId: 'ben', amount: 1000 },
      { memberId: 'cy', amount: 1000 },
    ],
    split: { method: 'equal', participants: ['ana', 'ben', 'cy'] },
    notes: null,
    occurredAt: T0,
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}
