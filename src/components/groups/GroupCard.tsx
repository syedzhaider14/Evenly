import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import type { GroupOverview } from '@/store/selectors';
import { useTheme } from '@/theme/ThemeProvider';

export interface GroupCardProps {
  overview: GroupOverview;
  onPress: (groupId: string) => void;
}

export const GroupCard = memo(function GroupCard({ overview, onPress }: GroupCardProps) {
  const { colors, radius, spacing } = useTheme();
  const { selfBalance, currency } = overview;

  const status =
    overview.expenseCount === 0
      ? { text: 'No expenses yet', tone: 'muted' as const }
      : selfBalance === 0
        ? { text: 'Settled up', tone: 'muted' as const }
        : selfBalance > 0
          ? { text: `You are owed ${formatMoney(selfBalance, currency)}`, tone: 'positive' as const }
          : { text: `You owe ${formatMoney(-selfBalance, currency)}`, tone: 'negative' as const };

  return (
    <Pressable
      onPress={() => onPress(overview.groupId)}
      accessibilityRole="button"
      accessibilityLabel={`${overview.name}, ${overview.memberCount} people, ${status.text}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
      })}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: radius.md,
          backgroundColor: colors.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 26, lineHeight: 32 }}>{overview.emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="heading" numberOfLines={1}>
          {overview.name}
        </Text>
        <Text variant="caption" tone="muted">
          {overview.memberCount} {overview.memberCount === 1 ? 'person' : 'people'} · {currency}
        </Text>
        <Text variant="label" tone={status.tone} numeric>
          {status.text}
        </Text>
      </View>
    </Pressable>
  );
});
