import { MemberInUseError } from '@/data/repositories';
import type { AppSettings } from '@/data/repositories';
import { colorForIndex, nextMemberColor } from '@/domain/members';
import type { Expense, Group, ID, Member, Settlement } from '@/domain/types';
import type { ValidExpense } from '@/domain/validation';

import { createAppAsyncThunk } from './createAppAsyncThunk';

export const hydrate = createAppAsyncThunk('app/hydrate', async (_: void, { extra }) => {
  const { repos } = extra;
  const [groups, members, expenses, settlements, settings] = await Promise.all([
    repos.groups.list(),
    repos.members.listAll(),
    repos.expenses.listAll(),
    repos.settlements.listAll(),
    repos.settings.load(),
  ]);
  return { groups, members, expenses, settlements, settings };
});

export interface CreateGroupInput {
  name: string;
  emoji: string;
  currency: string;
  simplifyDebts: boolean;
  /** Names of the other people in the group. The device owner is always added first. */
  memberNames: string[];
}

export const createGroup = createAppAsyncThunk(
  'groups/create',
  async (input: CreateGroupInput, { extra, getState }) => {
    const now = extra.clock.now();
    const group: Group = {
      id: extra.ids.next(),
      name: input.name.trim(),
      emoji: input.emoji,
      currency: input.currency,
      simplifyDebts: input.simplifyDebts,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    const names = [getState().settings.displayName, ...input.memberNames.map((n) => n.trim())];
    const members: Member[] = names.map((name, index) => ({
      id: extra.ids.next(),
      groupId: group.id,
      name,
      color: colorForIndex(index),
      isSelf: index === 0,
      createdAt: now,
    }));

    await extra.repos.groups.create(group, members);
    return { group, members };
  },
);

export interface UpdateGroupInput {
  id: ID;
  changes: Partial<Pick<Group, 'name' | 'emoji' | 'simplifyDebts' | 'archived'>>;
}

export const updateGroup = createAppAsyncThunk(
  'groups/update',
  async ({ id, changes }: UpdateGroupInput, { extra, getState, rejectWithValue }) => {
    const current = getState().groups.entities[id];
    if (!current) return rejectWithValue('This group no longer exists.');
    const group: Group = {
      ...current,
      ...changes,
      name: changes.name?.trim() ?? current.name,
      updatedAt: extra.clock.now(),
    };
    await extra.repos.groups.update(group);
    return group;
  },
);

export const deleteGroup = createAppAsyncThunk('groups/delete', async (id: ID, { extra }) => {
  await extra.repos.groups.delete(id);
  return id;
});

export const addMember = createAppAsyncThunk(
  'members/add',
  async ({ groupId, name }: { groupId: ID; name: string }, { extra, getState }) => {
    const existing = Object.values(getState().members.entities).filter(
      (member): member is Member => member !== undefined && member.groupId === groupId,
    );
    const member: Member = {
      id: extra.ids.next(),
      groupId,
      name: name.trim(),
      color: nextMemberColor(existing),
      isSelf: false,
      createdAt: extra.clock.now(),
    };
    await extra.repos.members.add(member);
    return member;
  },
);

export const renameMember = createAppAsyncThunk(
  'members/rename',
  async ({ id, name }: { id: ID; name: string }, { extra }) => {
    const trimmed = name.trim();
    await extra.repos.members.rename(id, trimmed);
    return { id, name: trimmed };
  },
);

export const removeMember = createAppAsyncThunk(
  'members/remove',
  async (id: ID, { extra, rejectWithValue }) => {
    try {
      await extra.repos.members.remove(id);
      return id;
    } catch (error) {
      if (error instanceof MemberInUseError) return rejectWithValue(error.message);
      throw error;
    }
  },
);

export const saveExpense = createAppAsyncThunk(
  'expenses/save',
  async ({ groupId, value }: { groupId: ID; value: ValidExpense }, { extra, getState }) => {
    const now = extra.clock.now();
    const existing = getState().expenses.entities[value.id];
    const expense: Expense = {
      ...value,
      groupId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await extra.repos.expenses.save(expense);
    return expense;
  },
);

export const deleteExpense = createAppAsyncThunk(
  'expenses/delete',
  async (id: ID, { extra, getState, rejectWithValue }) => {
    const expense = getState().expenses.entities[id];
    if (!expense) return rejectWithValue('This expense was already deleted.');
    await extra.repos.expenses.delete(id);
    return { id, groupId: expense.groupId };
  },
);

export interface RecordSettlementInput {
  groupId: ID;
  from: ID;
  to: ID;
  amount: number;
  note: string;
  occurredAt: number;
}

export const recordSettlement = createAppAsyncThunk(
  'settlements/record',
  async (input: RecordSettlementInput, { extra }) => {
    const settlement: Settlement = {
      id: extra.ids.next(),
      groupId: input.groupId,
      from: input.from,
      to: input.to,
      amount: input.amount,
      note: input.note.trim() || null,
      occurredAt: input.occurredAt,
      createdAt: extra.clock.now(),
    };
    await extra.repos.settlements.add(settlement);
    return settlement;
  },
);

export const deleteSettlement = createAppAsyncThunk(
  'settlements/delete',
  async (id: ID, { extra }) => {
    await extra.repos.settlements.delete(id);
    return id;
  },
);

export const updateSettings = createAppAsyncThunk(
  'settings/update',
  async (patch: Partial<AppSettings>, { extra }) => {
    await extra.repos.settings.save(patch);
    return patch;
  },
);

export const eraseAllData = createAppAsyncThunk('app/eraseAll', async (_: void, { extra }) => {
  await extra.repos.eraseAll();
});
