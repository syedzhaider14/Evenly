/**
 * @jest-environment node
 */
import { createRepositories } from '@/data/repositories';
import { fixedClock, sequentialIds } from '@/data/runtime';
import { validateExpenseDraft } from '@/domain/validation';
import { createTestDatabase } from '@/test/createTestDatabase';
import { T0 } from '@/test/fixtures';

import { createAppStore, type AppStore } from '../index';
import {
  expenseSelectors,
  selectGroupBalances,
  selectGroupMembers,
  selectGroupOverviews,
  selectSettlementPlan,
  selectTotalsByCurrency,
} from '../selectors';
import {
  addMember,
  createGroup,
  deleteGroup,
  hydrate,
  recordSettlement,
  removeMember,
  saveExpense,
  updateGroup,
  updateSettings,
} from '../thunks';

async function setup() {
  const db = await createTestDatabase();
  const repos = createRepositories(db);
  const store = createAppStore({ repos, clock: fixedClock(T0, 1000), ids: sequentialIds() });
  await store.dispatch(hydrate()).unwrap();
  return { store, repos };
}

async function createTrip(store: AppStore) {
  await store.dispatch(updateSettings({ displayName: 'Ana' })).unwrap();
  const { group, members } = await store
    .dispatch(
      createGroup({
        name: ' Lisbon ',
        emoji: '✈️',
        currency: 'EUR',
        simplifyDebts: true,
        memberNames: ['Ben', 'Cy'],
      }),
    )
    .unwrap();
  const [ana, ben, cy] = members;
  if (!ana || !ben || !cy) throw new Error('expected three members');
  return { group, ana, ben, cy };
}

async function addExpense(
  store: AppStore,
  groupId: string,
  id: string,
  amountText: string,
  payer: string,
  participants: string[],
) {
  const result = validateExpenseDraft(
    {
      id,
      description: id,
      amountText,
      category: 'food',
      occurredAt: T0,
      payers: { mode: 'single', memberId: payer },
      split: { method: 'equal', participants },
      notes: '',
    },
    'EUR',
    T0,
  );
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return store.dispatch(saveExpense({ groupId, value: result.value })).unwrap();
}

describe('store', () => {
  it('hydrates into a ready state', async () => {
    const { store } = await setup();
    expect(store.getState().app.bootStatus).toBe('ready');
  });

  it('creates a group with the device owner first', async () => {
    const { store } = await setup();
    const { group, ana } = await createTrip(store);

    expect(group.name).toBe('Lisbon');
    expect(ana).toMatchObject({ name: 'Ana', isSelf: true });
    expect(selectGroupMembers(store.getState(), group.id)).toHaveLength(3);
  });

  it('computes balances and a settlement plan from expenses', async () => {
    const { store } = await setup();
    const { group, ana, ben, cy } = await createTrip(store);

    await addExpense(store, group.id, 'hotel', '300', ana.id, [ana.id, ben.id, cy.id]);
    await addExpense(store, group.id, 'dinner', '90', ben.id, [ana.id, ben.id, cy.id]);

    const balances = selectGroupBalances(store.getState(), group.id);
    expect(Object.fromEntries(balances)).toEqual({
      [ana.id]: 30000 - 13000,
      [ben.id]: 9000 - 13000,
      [cy.id]: -13000,
    });

    const plan = selectSettlementPlan(store.getState(), group.id);
    expect(plan.isSettled).toBe(false);
    expect(plan.transfers).toEqual([
      { from: cy.id, to: ana.id, amount: 13000 },
      { from: ben.id, to: ana.id, amount: 4000 },
    ]);
  });

  it('switches to pairwise debts when simplification is off', async () => {
    const { store } = await setup();
    const { group, ana, ben, cy } = await createTrip(store);
    await addExpense(store, group.id, 'a', '10', ana.id, [ben.id]);
    await addExpense(store, group.id, 'b', '10', ben.id, [cy.id]);

    expect(selectSettlementPlan(store.getState(), group.id).transfers).toHaveLength(1);

    await store.dispatch(updateGroup({ id: group.id, changes: { simplifyDebts: false } })).unwrap();
    const plan = selectSettlementPlan(store.getState(), group.id);
    expect(plan.simplified).toBe(false);
    expect(plan.transfers).toHaveLength(2);
  });

  it('settles up after recording the suggested payments', async () => {
    const { store } = await setup();
    const { group, ana, ben, cy } = await createTrip(store);
    await addExpense(store, group.id, 'hotel', '300', ana.id, [ana.id, ben.id, cy.id]);

    for (const transfer of selectSettlementPlan(store.getState(), group.id).transfers) {
      await store
        .dispatch(recordSettlement({ groupId: group.id, ...transfer, note: '', occurredAt: T0 }))
        .unwrap();
    }

    expect(selectSettlementPlan(store.getState(), group.id).isSettled).toBe(true);
    expect(selectTotalsByCurrency(store.getState())).toEqual([]);
  });

  it('reports the owner position on the groups overview', async () => {
    const { store } = await setup();
    const { group, ana, ben, cy } = await createTrip(store);
    await addExpense(store, group.id, 'hotel', '300', ana.id, [ana.id, ben.id, cy.id]);

    const [overview] = selectGroupOverviews(store.getState());
    expect(overview).toMatchObject({ groupId: group.id, selfBalance: 20000, expenseCount: 1 });
    expect(selectTotalsByCurrency(store.getState())).toEqual([
      { currency: 'EUR', owedToYou: 20000, youOwe: 0 },
    ]);
  });

  it('rejects removing a member who has expenses, with a readable reason', async () => {
    const { store } = await setup();
    const { group, ana, ben } = await createTrip(store);
    await addExpense(store, group.id, 'coffee', '5', ana.id, [ben.id]);

    const result = await store.dispatch(removeMember(ben.id));
    expect(removeMember.rejected.match(result)).toBe(true);
    expect(result.payload).toMatch(/cannot be removed/);

    const dee = await store.dispatch(addMember({ groupId: group.id, name: 'Dee' })).unwrap();
    await store.dispatch(removeMember(dee.id)).unwrap();
    expect(selectGroupMembers(store.getState(), group.id)).toHaveLength(3);
  });

  it('removes a deleted group and its children from every slice', async () => {
    const { store } = await setup();
    const { group, ana, ben } = await createTrip(store);
    await addExpense(store, group.id, 'coffee', '5', ana.id, [ben.id]);

    await store.dispatch(deleteGroup(group.id)).unwrap();
    const state = store.getState();
    expect(state.groups.ids).toEqual([]);
    expect(state.members.ids).toEqual([]);
    expect(expenseSelectors.selectTotal(state)).toBe(0);
  });

  it('reloads the same state from disk', async () => {
    const db = await createTestDatabase();
    const repos = createRepositories(db);
    const first = createAppStore({ repos, clock: fixedClock(T0, 1000), ids: sequentialIds() });
    await first.dispatch(hydrate()).unwrap();
    const { group, ana, ben } = await createTrip(first);
    await addExpense(first, group.id, 'coffee', '5', ana.id, [ana.id, ben.id]);

    const second = createAppStore({ repos, clock: fixedClock(T0), ids: sequentialIds('other') });
    await second.dispatch(hydrate()).unwrap();

    const strip = (store: AppStore) => {
      const { app: _app, ...rest } = store.getState();
      return rest;
    };
    expect(strip(second)).toEqual(strip(first));
  });
});
