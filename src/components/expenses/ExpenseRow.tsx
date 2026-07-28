import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { expenseImpact } from '@/domain/balances';
import { categoryOf } from '@/domain/categories';
import { displayName } from '@/domain/members';
import { formatMoney } from '@/domain/money';
import type { Expense, ID, Member } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatRelativeDay } from '@/utils/format';

export interface ExpenseRowProps {
  expense: Expense;
  currency: string;
  members: Readonly<Record<ID, Member | undefined>>;
  selfId: ID | undefined;
  onPress: (expenseId: ID) => void;
}

function payerLabel(expense: Expense, members: ExpenseRowProps['members']): string {
  if (expense.payers.length === 1 && expense.payers[0]) {
    return `${displayName(members[expense.payers[0].memberId])} paid`;
  }
  return `${expense.payers.length} people paid`;
}

export const ExpenseRow = memo(function ExpenseRow({
  expense,
  currency,
  members,
  selfId,
  onPress,
}: ExpenseRowProps) {
  const { colors, radius, spacing } = useTheme();
  const category = categoryOf(expense.category);
  const impact = selfId ? expenseImpact(expense, selfId) : 0;
  const involved = selfId
    ? expense.payers.some((p) => p.memberId === selfId) || expense.shares.some((s) => s.memberId === selfId)
    : false;

  const impactLabel = !involved
    ? 'Not involved'
    : impact > 0
      ? `You lent ${formatMoney(impact, currency)}`
      : impact < 0
        ? `You borrowed ${formatMoney(-impact, currency)}`
        : 'Even';

  return (
    <Pressable
      onPress={() => onPress(expense.id)}
      accessibilityRole="button"
      accessibilityLabel={`${expense.description}, ${formatMoney(expense.amount, currency)}, ${payerLabel(expense, members)}, ${impactLabel}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 20, lineHeight: 24 }}>{category.emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1}>{expense.description}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {payerLabel(expense, members)} · {formatRelativeDay(expense.occurredAt)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text variant="label" numeric>
          {formatMoney(expense.amount, currency)}
        </Text>
        <Text
          variant="caption"
          numeric
          tone={!involved || impact === 0 ? 'muted' : impact > 0 ? 'positive' : 'negative'}
        >
          {impactLabel}
        </Text>
      </View>
    </Pressable>
  );
});
