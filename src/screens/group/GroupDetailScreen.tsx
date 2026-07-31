import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, SectionList, View } from 'react-native';

import { BalanceRow } from '@/components/balances/BalanceRow';
import { TransferRow } from '@/components/balances/TransferRow';
import { ExpenseRow } from '@/components/expenses/ExpenseRow';
import {
  Card,
  Divider,
  EmptyState,
  FloatingButton,
  HeaderButton,
  ListRow,
  ProgressBar,
  SectionHeader,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { groupByMonth } from '@/domain/activity';
import { displayName } from '@/domain/members';
import { formatMoney } from '@/domain/money';
import type { Transfer } from '@/domain/types';
import { useGroup } from '@/hooks/useGroup';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  memberSelectors,
  selectCategoryBreakdown,
  selectGroupBalances,
  selectGroupSummary,
  selectSettlementPlan,
} from '@/store/selectors';
import { deleteSettlement } from '@/store/thunks';
import { useTheme } from '@/theme/ThemeProvider';
import { formatRelativeDay } from '@/utils/format';

type Tab = 'expenses' | 'balances' | 'insights';

const TABS = [
  { value: 'expenses', label: 'Expenses' },
  { value: 'balances', label: 'Balances' },
  { value: 'insights', label: 'Insights' },
] as const satisfies readonly { value: Tab; label: string }[];

export function GroupDetailScreen({ route, navigation }: RootStackScreenProps<'GroupDetail'>) {
  const { groupId } = route.params;
  const { colors, radius, spacing } = useTheme();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<Tab>('expenses');

  const { group, members, expenses, settlements } = useGroup(groupId);
  const memberEntities = useAppSelector(memberSelectors.selectEntities);
  const balances = useAppSelector((state) => selectGroupBalances(state, groupId));
  const plan = useAppSelector((state) => selectSettlementPlan(state, groupId));
  const summary = useAppSelector((state) => selectGroupSummary(state, groupId));
  const categories = useAppSelector((state) => selectCategoryBreakdown(state, groupId));

  const self = members.find((member) => member.isSelf);
  const selfBalance = self ? (balances.get(self.id) ?? 0) : 0;
  const sections = useMemo(() => groupByMonth(expenses, (expense) => expense.occurredAt), [expenses]);
  const maxBalance = Math.max(0, ...[...balances.values()].map(Math.abs));

  useLayoutEffect(() => {
    navigation.setOptions({
      title: group ? `${group.emoji} ${group.name}` : '',
      headerRight: () =>
        group ? (
          <HeaderButton
            icon="ellipsis-horizontal-circle-outline"
            accessibilityLabel="Group settings"
            onPress={() => navigation.navigate('GroupSettings', { groupId })}
          />
        ) : null,
    });
  }, [navigation, group, groupId]);

  const openExpense = useCallback(
    (expenseId: string) => navigation.navigate('ExpenseDetail', { expenseId }),
    [navigation],
  );

  const recordTransfer = (transfer: Transfer) =>
    navigation.navigate('SettleUp', {
      groupId,
      from: transfer.from,
      to: transfer.to,
      amount: transfer.amount,
    });

  const confirmDeleteSettlement = (settlementId: string, label: string) =>
    Alert.alert('Delete payment?', `${label} will be removed and balances recalculated.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteSettlement(settlementId)) },
    ]);

  if (!group) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <EmptyState emoji="🫥" title="Group not found" message="It may have been deleted." />
      </View>
    );
  }

  const header = (
    <View style={{ padding: spacing.lg, gap: spacing.lg }}>
      <Card style={{ flexDirection: 'row', gap: spacing.lg }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" tone="muted">
            Total spent
          </Text>
          <Text variant="title" numeric>
            {formatMoney(summary.totalSpent, group.currency)}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" tone="muted">
            {selfBalance >= 0 ? 'You are owed' : 'You owe'}
          </Text>
          <Text
            variant="title"
            numeric
            tone={selfBalance === 0 ? 'default' : selfBalance > 0 ? 'positive' : 'negative'}
          >
            {formatMoney(Math.abs(selfBalance), group.currency)}
          </Text>
        </View>
      </Card>
      <SegmentedControl accessibilityLabel="Group sections" segments={TABS} value={tab} onChange={setTab} />
    </View>
  );

  const addExpenseButton = (
    <FloatingButton
      label="Add expense"
      testID="add-expense"
      onPress={() => navigation.navigate('ExpenseEditor', { groupId })}
    />
  );

  if (tab === 'expenses') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
          renderItem={({ item }) => (
            <ExpenseRow
              expense={item}
              currency={group.currency}
              members={memberEntities}
              selfId={self?.id}
              onPress={openExpense}
            />
          )}
          ItemSeparatorComponent={() => <Divider inset={72} />}
          ListEmptyComponent={
            <EmptyState
              emoji="🧾"
              title="No expenses yet"
              message="Add the first cost and Evenly will keep track of who owes whom."
            />
          }
        />
        {addExpenseButton}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {header}

        {tab === 'balances' ? (
          <View>
            <SectionHeader title="Balances" />
            <Card padded={false} style={{ marginHorizontal: spacing.lg }}>
              {members.map((member, index) => (
                <View key={member.id}>
                  {index > 0 ? <Divider inset={64} /> : null}
                  <BalanceRow
                    member={member}
                    balance={balances.get(member.id) ?? 0}
                    scale={maxBalance}
                    currency={group.currency}
                  />
                </View>
              ))}
            </Card>

            <SectionHeader title="Suggested payments" />
            {plan.isSettled ? (
              <Card style={{ marginHorizontal: spacing.lg }}>
                <Text variant="heading">Everyone is settled up 🎉</Text>
                <Text tone="muted">New expenses will show up here as suggested payments.</Text>
              </Card>
            ) : (
              <>
                <Card padded={false} style={{ marginHorizontal: spacing.lg }}>
                  {plan.transfers.map((transfer, index) => (
                    <View key={`${transfer.from}-${transfer.to}`}>
                      {index > 0 ? <Divider inset={spacing.lg} /> : null}
                      <TransferRow
                        transfer={transfer}
                        from={memberEntities[transfer.from]}
                        to={memberEntities[transfer.to]}
                        currency={group.currency}
                        onRecord={recordTransfer}
                      />
                    </View>
                  ))}
                </Card>
                {plan.simplified && plan.pairwiseCount > plan.transfers.length ? (
                  <Text variant="caption" tone="muted" style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm }}>
                    Simplified to {plan.transfers.length} {plan.transfers.length === 1 ? 'payment' : 'payments'} instead
                    of {plan.pairwiseCount}.
                  </Text>
                ) : null}
              </>
            )}

            {settlements.length > 0 ? (
              <>
                <SectionHeader title="Payments" />
                <Card padded={false} style={{ marginHorizontal: spacing.lg }}>
                  {settlements.map((settlement, index) => {
                    const label = `${displayName(memberEntities[settlement.from])} paid ${displayName(
                      memberEntities[settlement.to],
                    )}`;
                    return (
                      <View key={settlement.id}>
                        {index > 0 ? <Divider inset={spacing.lg} /> : null}
                        <ListRow
                          title={label}
                          subtitle={[formatRelativeDay(settlement.occurredAt), settlement.note]
                            .filter(Boolean)
                            .join(' · ')}
                          trailing={
                            <Text variant="label" numeric>
                              {formatMoney(settlement.amount, group.currency)}
                            </Text>
                          }
                          showChevron={false}
                          onPress={() => confirmDeleteSettlement(settlement.id, label)}
                          accessibilityLabel={`${label} ${formatMoney(settlement.amount, group.currency)}. Double tap to delete.`}
                        />
                      </View>
                    );
                  })}
                </Card>
              </>
            ) : null}
          </View>
        ) : (
          <View>
            <SectionHeader title="By category" />
            <Card style={{ marginHorizontal: spacing.lg, gap: spacing.md }}>
              {categories.length === 0 ? (
                <Text tone="muted">Add expenses to see where the money goes.</Text>
              ) : (
                categories.map((row) => (
                  <View key={row.category} style={{ gap: spacing.xs }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text>
                        {row.emoji} {row.label}
                      </Text>
                      <Text variant="label" numeric>
                        {formatMoney(row.amount, group.currency)} · {Math.round(row.ratio * 100)}%
                      </Text>
                    </View>
                    <ProgressBar value={row.ratio} />
                  </View>
                ))
              )}
            </Card>

            <SectionHeader title="Paid vs. consumed" />
            <Card style={{ marginHorizontal: spacing.lg, gap: spacing.lg }}>
              {members.map((member) => {
                const paid = summary.paidBy.get(member.id) ?? 0;
                const consumed = summary.consumedBy.get(member.id) ?? 0;
                const scale = Math.max(1, summary.totalSpent);
                return (
                  <View key={member.id} style={{ gap: spacing.xs }}>
                    <Text variant="label">{displayName(member)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text variant="caption" tone="muted" style={{ width: 64 }}>
                        Paid
                      </Text>
                      <View style={{ flex: 1 }}>
                        <ProgressBar value={paid / scale} color={member.color} />
                      </View>
                      <Text variant="caption" numeric style={{ width: 88, textAlign: 'right' }}>
                        {formatMoney(paid, group.currency)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text variant="caption" tone="muted" style={{ width: 64 }}>
                        Share
                      </Text>
                      <View style={{ flex: 1, opacity: 0.55, borderRadius: radius.pill }}>
                        <ProgressBar value={consumed / scale} color={member.color} />
                      </View>
                      <Text variant="caption" numeric style={{ width: 88, textAlign: 'right' }}>
                        {formatMoney(consumed, group.currency)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        )}
      </ScrollView>
      {addExpenseButton}
    </View>
  );
}
