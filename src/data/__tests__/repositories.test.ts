/**
 * @jest-environment node
 */
import { LATEST_SCHEMA_VERSION, migrate } from '../db/migrations';
import { parseSplitInput } from '../repositories/mappers';
import { createRepositories, MemberInUseError, type Repositories } from '../repositories';
import type { SqlDatabase } from '../db/SqlDatabase';
import { createTestDatabase } from '@/test/createTestDatabase';
import { makeExpense, makeGroup, makeMember, T0 } from '@/test/fixtures';

describe('migrations', () => {
  it('migrates an empty database to the latest version and is idempotent', async () => {
    const db = await createTestDatabase({ migrated: false });
    expect(await migrate(db)).toEqual({ from: 0, to: LATEST_SCHEMA_VERSION });
    expect(await migrate(db)).toEqual({ from: LATEST_SCHEMA_VERSION, to: LATEST_SCHEMA_VERSION });

    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(LATEST_SCHEMA_VERSION);
  });

  it('rolls back a failing migration', async () => {
    const db = await createTestDatabase({ migrated: false });
    await expect(
      migrate(db, [
        { version: 1, description: 'ok', up: 'CREATE TABLE a (id TEXT);' },
        { version: 2, description: 'broken', up: 'CREATE TABLE b (id TEXT); NOT VALID SQL;' },
      ]),
    ).rejects.toThrow();

    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(1);
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('a', 'b')",
    );
    expect(tables.map((t) => t.name)).toEqual(['a']);
  });
});

describe('repositories', () => {
  let db: SqlDatabase;
  let repos: Repositories;

  beforeEach(async () => {
    db = await createTestDatabase();
    repos = createRepositories(db);
    await repos.groups.create(makeGroup(), [
      makeMember('ana', { isSelf: true }),
      makeMember('ben'),
      makeMember('cy'),
    ]);
  });

  it('creates groups with their members', async () => {
    expect(await repos.groups.list()).toEqual([makeGroup()]);
    const members = await repos.members.listByGroup('g1');
    expect(members.map((m) => m.id)).toEqual(['ana', 'ben', 'cy']);
    expect(members[0]?.isSelf).toBe(true);
  });

  it('round-trips an expense including payers, shares and split input', async () => {
    const expense = makeExpense('e1', {
      payers: [
        { memberId: 'ana', amount: 2000 },
        { memberId: 'ben', amount: 1000 },
      ],
      split: {
        method: 'percentage',
        entries: [
          { memberId: 'ana', value: 5000 },
          { memberId: 'ben', value: 2500 },
          { memberId: 'cy', value: 2500 },
        ],
      },
      notes: 'Tasca do Chico',
    });
    await repos.expenses.save(expense);

    expect(await repos.expenses.get('e1')).toEqual(expense);
    expect(await repos.expenses.listByGroup('g1')).toEqual([expense]);
  });

  it('replaces payer and share rows when an expense is edited', async () => {
    await repos.expenses.save(makeExpense('e1'));
    const edited = makeExpense('e1', {
      amount: 1000,
      payers: [{ memberId: 'ben', amount: 1000 }],
      shares: [{ memberId: 'cy', amount: 1000 }],
      split: { method: 'equal', participants: ['cy'] },
      updatedAt: T0 + 1,
    });
    await repos.expenses.save(edited);

    expect(await repos.expenses.get('e1')).toEqual(edited);
    const shareRows = await db.getAllAsync('SELECT * FROM expense_shares');
    expect(shareRows).toHaveLength(1);
  });

  it('keeps the original creation time on update', async () => {
    await repos.expenses.save(makeExpense('e1', { createdAt: T0 }));
    await repos.expenses.save(makeExpense('e1', { createdAt: T0 + 999, updatedAt: T0 + 999 }));
    expect((await repos.expenses.get('e1'))?.createdAt).toBe(T0);
  });

  it('refuses to remove members that are part of the ledger', async () => {
    await repos.expenses.save(makeExpense('e1'));
    await expect(repos.members.remove('ben')).rejects.toBeInstanceOf(MemberInUseError);

    await repos.members.add(makeMember('dee'));
    await expect(repos.members.remove('dee')).resolves.toBeUndefined();
  });

  it('enforces settlement constraints at the database level', async () => {
    await expect(
      repos.settlements.add({
        id: 's1',
        groupId: 'g1',
        from: 'ana',
        to: 'ana',
        amount: 100,
        note: null,
        occurredAt: T0,
        createdAt: T0,
      }),
    ).rejects.toThrow();
  });

  it('deletes a group and everything in it', async () => {
    await repos.expenses.save(makeExpense('e1'));
    await repos.settlements.add({
      id: 's1',
      groupId: 'g1',
      from: 'ben',
      to: 'ana',
      amount: 1000,
      note: 'cash',
      occurredAt: T0,
      createdAt: T0,
    });

    await repos.groups.delete('g1');

    for (const table of ['groups', 'members', 'expenses', 'expense_payers', 'expense_shares', 'settlements']) {
      const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
      expect({ table, count: row?.count }).toEqual({ table, count: 0 });
    }
  });

  it('persists settings and ignores corrupt values', async () => {
    await repos.settings.save({ displayName: 'Ana', theme: 'dark' });
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('defaultCurrency', '{oops')");

    const settings = await repos.settings.load();
    expect(settings.displayName).toBe('Ana');
    expect(settings.theme).toBe('dark');
    expect(settings.defaultCurrency).toBe('USD');
  });

  it('erases all ledger data but keeps settings', async () => {
    await repos.expenses.save(makeExpense('e1'));
    await repos.settings.save({ displayName: 'Ana' });
    await repos.eraseAll();

    expect(await repos.groups.list()).toEqual([]);
    expect((await repos.settings.load()).displayName).toBe('Ana');
  });
});

describe('parseSplitInput', () => {
  const shares = [{ memberId: 'a', amount: 500 }];

  it('accepts every stored method', () => {
    expect(parseSplitInput('{"method":"equal","participants":["a"]}', shares)).toEqual({
      method: 'equal',
      participants: ['a'],
    });
    expect(
      parseSplitInput('{"method":"shares","entries":[{"memberId":"a","value":100}]}', shares),
    ).toEqual({ method: 'shares', entries: [{ memberId: 'a', value: 100 }] });
  });

  it('falls back to the stored shares when the JSON is unusable', () => {
    const fallback = { method: 'exact', entries: [{ memberId: 'a', value: 500 }] };
    expect(parseSplitInput('not json', shares)).toEqual(fallback);
    expect(parseSplitInput('{"method":"magic"}', shares)).toEqual(fallback);
    expect(parseSplitInput('{"method":"equal","participants":[1]}', shares)).toEqual(fallback);
  });
});
