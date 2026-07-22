import { createSelector } from '@reduxjs/toolkit';

import { buildActivityFeed } from '@/domain/activity';
import { computeBalances, computePairwiseDebts, summarize } from '@/domain/balances';
import { CATEGORIES, type CategoryId } from '@/domain/categories';
import { simplifyDebts } from '@/domain/simplify';
import type { ID } from '@/domain/types';

import type { RootState } from './rootReducer';
import { expensesAdapter } from './slices/expensesSlice';
import { groupsAdapter } from './slices/groupsSlice';
import { membersAdapter } from './slices/membersSlice';
import { settlementsAdapter } from './slices/settlementsSlice';

export const groupSelectors = groupsAdapter.getSelectors<RootState>((state) => state.groups);
export const memberSelectors = membersAdapter.getSelectors<RootState>((state) => state.members);
export const expenseSelectors = expensesAdapter.getSelectors<RootState>((state) => state.expenses);
export const settlementSelectors = settlementsAdapter.getSelectors<RootState>(
  (state) => state.settlements,
);

const groupIdArg = (_state: RootState, groupId: ID) => groupId;

export const selectSettings = (state: RootState) => state.settings;
export const selectBootStatus = (state: RootState) => state.app.bootStatus;

export const selectActiveGroups = createSelector([groupSelectors.selectAll], (groups) =>
  groups.filter((group) => !group.archived),
);

export const selectArchivedGroups = createSelector([groupSelectors.selectAll], (groups) =>
  groups.filter((group) => group.archived),
);

export const selectGroupMembers = createSelector(
  [memberSelectors.selectAll, groupIdArg],
  (members, groupId) => members.filter((member) => member.groupId === groupId),
);

export const selectSelfMember = createSelector([selectGroupMembers], (members) =>
  members.find((member) => member.isSelf),
);

export const selectGroupExpenses = createSelector(
  [expenseSelectors.selectAll, groupIdArg],
  (expenses, groupId) => expenses.filter((expense) => expense.groupId === groupId),
);

export const selectGroupSettlements = createSelector(
  [settlementSelectors.selectAll, groupIdArg],
  (settlements, groupId) => settlements.filter((settlement) => settlement.groupId === groupId),
);

export const selectGroupBalances = createSelector(
  [selectGroupMembers, selectGroupExpenses, selectGroupSettlements],
  (members, expenses, settlements) =>
    computeBalances(
      members.map((member) => member.id),
      expenses,
      settlements,
    ),
);

export interface SettlementPlan {
  transfers: { from: ID; to: ID; amount: number }[];
  simplified: boolean;
  /** How many payments the group would need without simplification. */
  pairwiseCount: number;
  isSettled: boolean;
}

export const selectSettlementPlan = createSelector(
  [
    (state: RootState, groupId: ID) => groupSelectors.selectById(state, groupId),
    selectGroupBalances,
    selectGroupExpenses,
    selectGroupSettlements,
  ],
  (group, balances, expenses, settlements): SettlementPlan => {
    const pairwise = computePairwiseDebts(expenses, settlements);
    const simplified = group?.simplifyDebts ?? true;
    const transfers = simplified ? simplifyDebts(balances) : pairwise;
    return {
      transfers,
      simplified,
      pairwiseCount: pairwise.length,
      isSettled: transfers.length === 0,
    };
  },
);

export const selectGroupSummary = createSelector([selectGroupExpenses], (expenses) =>
  summarize(expenses),
);

export interface CategoryTotal {
  category: CategoryId;
  label: string;
  emoji: string;
  amount: number;
  ratio: number;
}

export const selectCategoryBreakdown = createSelector([selectGroupExpenses], (expenses) => {
  const totals = new Map<CategoryId, number>();
  let grandTotal = 0;
  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
    grandTotal += expense.amount;
  }
  return [...totals.entries()]
    .map(
      ([category, amount]): CategoryTotal => ({
        category,
        label: CATEGORIES[category].label,
        emoji: CATEGORIES[category].emoji,
        amount,
        ratio: grandTotal === 0 ? 0 : amount / grandTotal,
      }),
    )
    .sort((a, b) => b.amount - a.amount);
});

export interface GroupOverview {
  groupId: ID;
  name: string;
  emoji: string;
  currency: string;
  archived: boolean;
  memberCount: number;
  expenseCount: number;
  /** The device owner's net balance in this group (positive = owed to them). */
  selfBalance: number;
  updatedAt: number;
}

/** One pass over the whole store that powers the groups list without per-row selectors. */
export const selectGroupOverviews = createSelector(
  [
    groupSelectors.selectAll,
    memberSelectors.selectAll,
    expenseSelectors.selectAll,
    settlementSelectors.selectAll,
  ],
  (groups, members, expenses, settlements): GroupOverview[] =>
    groups.map((group) => {
      const groupMembers = members.filter((member) => member.groupId === group.id);
      const groupExpenses = expenses.filter((expense) => expense.groupId === group.id);
      const balances = computeBalances(
        groupMembers.map((member) => member.id),
        groupExpenses,
        settlements.filter((settlement) => settlement.groupId === group.id),
      );
      const self = groupMembers.find((member) => member.isSelf);
      return {
        groupId: group.id,
        name: group.name,
        emoji: group.emoji,
        currency: group.currency,
        archived: group.archived,
        memberCount: groupMembers.length,
        expenseCount: groupExpenses.length,
        selfBalance: self ? (balances.get(self.id) ?? 0) : 0,
        updatedAt: group.updatedAt,
      };
    }),
);

export interface CurrencyTotals {
  currency: string;
  owedToYou: number;
  youOwe: number;
}

/** The device owner's position across all active groups, bucketed by currency. */
export const selectTotalsByCurrency = createSelector([selectGroupOverviews], (overviews) => {
  const byCurrency = new Map<string, CurrencyTotals>();
  for (const overview of overviews) {
    if (overview.archived || overview.selfBalance === 0) continue;
    const totals = byCurrency.get(overview.currency) ?? {
      currency: overview.currency,
      owedToYou: 0,
      youOwe: 0,
    };
    if (overview.selfBalance > 0) totals.owedToYou += overview.selfBalance;
    else totals.youOwe += -overview.selfBalance;
    byCurrency.set(overview.currency, totals);
  }
  return [...byCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency));
});

export const selectActivityFeed = createSelector(
  [expenseSelectors.selectAll, settlementSelectors.selectAll, groupSelectors.selectAll],
  (expenses, settlements, groups) => buildActivityFeed(expenses, settlements, groups),
);
