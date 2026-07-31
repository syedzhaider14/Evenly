import { useLayoutEffect } from 'react';
import { Alert, View } from 'react-native';

import { Avatar, Button, Card, Divider, EmptyState, HeaderButton, Screen, SectionHeader, Text } from '@/components/ui';
import { categoryOf } from '@/domain/categories';
import { displayName } from '@/domain/members';
import { formatMoney } from '@/domain/money';
import type { Allocation, Member } from '@/domain/types';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { expenseSelectors, groupSelectors, memberSelectors } from '@/store/selectors';
import { deleteExpense } from '@/store/thunks';
import { useTheme } from '@/theme/ThemeProvider';
import { formatBasisPoints, formatDate, formatShares } from '@/utils/format';
import { useHaptics } from '@/utils/haptics';

const METHOD_LABELS = {
  equal: 'Split equally',
  exact: 'Split by exact amounts',
  percentage: 'Split by percentage',
  shares: 'Split by shares',
} as const;

export function ExpenseDetailScreen({ route, navigation }: RootStackScreenProps<'ExpenseDetail'>) {
  const { expenseId } = route.params;
  const { colors, spacing } = useTheme();
  const dispatch = useAppDispatch();
  const haptics = useHaptics();

  const expense = useAppSelector((state) => expenseSelectors.selectById(state, expenseId));
  const group = useAppSelector((state) =>
    expense ? groupSelectors.selectById(state, expense.groupId) : undefined,
  );
  const members = useAppSelector(memberSelectors.selectEntities);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        expense ? (
          <HeaderButton
            label="Edit"
            accessibilityLabel="Edit expense"
            onPress={() =>
              navigation.navigate('ExpenseEditor', { groupId: expense.groupId, expenseId: expense.id })
            }
          />
        ) : null,
    });
  }, [navigation, expense]);

  if (!expense || !group) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <EmptyState emoji="🗑️" title="Expense deleted" message="This expense no longer exists." />
      </View>
    );
  }

  const category = categoryOf(expense.category);
  const format = (amount: number) => formatMoney(amount, group.currency);

  const splitDetail = (memberId: string): string | null => {
    const split = expense.split;
    if (split.method === 'percentage') {
      const entry = split.entries.find((e) => e.memberId === memberId);
      return entry ? formatBasisPoints(entry.value) : null;
    }
    if (split.method === 'shares') {
      const entry = split.entries.find((e) => e.memberId === memberId);
      return entry ? `${formatShares(entry.value)} shares` : null;
    }
    return null;
  };

  const confirmDelete = () => {
    haptics.warning();
    Alert.alert('Delete expense?', `"${expense.description}" will be removed and balances recalculated.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await dispatch(deleteExpense(expense.id));
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg }}>
        <Text style={{ fontSize: 44, lineHeight: 52 }}>{category.emoji}</Text>
        <Text variant="title" align="center">
          {expense.description}
        </Text>
        <Text variant="display" numeric>
          {format(expense.amount)}
        </Text>
        <Text tone="muted">
          {category.label} · {formatDate(expense.occurredAt)} · {group.emoji} {group.name}
        </Text>
      </View>

      <AllocationCard title="Paid by" rows={expense.payers} members={members} format={format} />

      <View>
        <SectionHeader title={METHOD_LABELS[expense.split.method]} />
        <AllocationCard
          rows={expense.shares}
          members={members}
          format={format}
          detail={splitDetail}
          verb="owes"
        />
      </View>

      {expense.notes ? (
        <Card>
          <Text variant="label" tone="muted">
            Notes
          </Text>
          <Text>{expense.notes}</Text>
        </Card>
      ) : null}

      <Text variant="caption" tone="muted" align="center">
        Added {formatDate(expense.createdAt)}
        {expense.updatedAt !== expense.createdAt ? ` · edited ${formatDate(expense.updatedAt)}` : ''}
      </Text>

      <Button title="Delete expense" variant="danger" icon="trash-outline" onPress={confirmDelete} />
    </Screen>
  );
}

function AllocationCard({
  title,
  rows,
  members,
  format,
  detail,
  verb,
}: {
  title?: string;
  rows: readonly Allocation[];
  members: Readonly<Record<string, Member | undefined>>;
  format: (amount: number) => string;
  detail?: (memberId: string) => string | null;
  verb?: string;
}) {
  const { spacing } = useTheme();
  return (
    <View>
      {title ? <SectionHeader title={title} /> : null}
      <Card padded={false}>
        {rows.map((row, index) => {
          const member = members[row.memberId];
          const extra = detail?.(row.memberId);
          return (
            <View key={row.memberId}>
              {index > 0 ? <Divider inset={60} /> : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  paddingHorizontal: spacing.lg,
                }}
              >
                <Avatar name={member?.name ?? '?'} color={member?.color ?? '#888888'} size={32} />
                <View style={{ flex: 1 }}>
                  <Text>
                    {displayName(member)}
                    {verb ? ` ${member?.isSelf ? 'owe' : verb}` : ''}
                  </Text>
                  {extra ? (
                    <Text variant="caption" tone="muted">
                      {extra}
                    </Text>
                  ) : null}
                </View>
                <Text variant="label" numeric>
                  {format(row.amount)}
                </Text>
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}
