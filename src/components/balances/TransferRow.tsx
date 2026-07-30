import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Avatar, Button, Text } from '@/components/ui';
import { displayName } from '@/domain/members';
import { formatMoney } from '@/domain/money';
import type { Member, Transfer } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';

export interface TransferRowProps {
  transfer: Transfer;
  from: Member | undefined;
  to: Member | undefined;
  currency: string;
  onRecord: (transfer: Transfer) => void;
}

export function TransferRow({ transfer, from, to, currency, onRecord }: TransferRowProps) {
  const { colors, spacing } = useTheme();
  const amount = formatMoney(transfer.amount, currency);
  const fromName = displayName(from);
  const toName = displayName(to);
  const verb = from?.isSelf ? 'pay' : 'pays';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Avatar name={from?.name ?? '?'} color={from?.color ?? colors.textMuted} size={28} />
        <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
        <Avatar name={to?.name ?? '?'} color={to?.color ?? colors.textMuted} size={28} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2}>
          {fromName} {verb} {toName}
        </Text>
        <Text variant="label" numeric tone="primary">
          {amount}
        </Text>
      </View>
      <Button
        title="Record"
        variant="secondary"
        compact
        accessibilityHint={`Records that ${fromName} paid ${toName} ${amount}`}
        onPress={() => onRecord(transfer)}
      />
    </View>
  );
}
