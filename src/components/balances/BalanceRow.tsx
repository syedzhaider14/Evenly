import { View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { displayName } from '@/domain/members';
import { formatMoney } from '@/domain/money';
import type { Member } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';

export interface BalanceRowProps {
  member: Member;
  balance: number;
  /** Largest absolute balance in the group, used to scale the bar. */
  scale: number;
  currency: string;
}

/** A member's net balance with a diverging bar: green to the right, red to the left. */
export function BalanceRow({ member, balance, scale, currency }: BalanceRowProps) {
  const { colors, radius, spacing } = useTheme();
  const ratio = scale === 0 ? 0 : Math.abs(balance) / scale;
  const label =
    balance === 0
      ? 'settled up'
      : balance > 0
        ? `gets back ${formatMoney(balance, currency)}`
        : `owes ${formatMoney(-balance, currency)}`;

  return (
    <View
      accessible
      accessibilityLabel={`${displayName(member)} ${label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface,
      }}
    >
      <Avatar name={member.name} color={member.color} size={36} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text numberOfLines={1} style={{ flexShrink: 1 }}>
            {displayName(member)}
          </Text>
          <Text
            variant="label"
            numeric
            tone={balance === 0 ? 'muted' : balance > 0 ? 'positive' : 'negative'}
          >
            {label}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', height: 6 }}>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {balance < 0 ? (
              <View
                style={{
                  width: `${ratio * 100}%`,
                  height: '100%',
                  backgroundColor: colors.negative,
                  borderTopLeftRadius: radius.pill,
                  borderBottomLeftRadius: radius.pill,
                }}
              />
            ) : null}
          </View>
          <View style={{ width: 2, backgroundColor: colors.border }} />
          <View style={{ flex: 1 }}>
            {balance > 0 ? (
              <View
                style={{
                  width: `${ratio * 100}%`,
                  height: '100%',
                  backgroundColor: colors.positive,
                  borderTopRightRadius: radius.pill,
                  borderBottomRightRadius: radius.pill,
                }}
              />
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
