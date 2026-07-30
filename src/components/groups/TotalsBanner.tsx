import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import type { CurrencyTotals } from '@/store/selectors';
import { useTheme } from '@/theme/ThemeProvider';

/** Headline numbers across every group. Currencies are never mixed or converted. */
export function TotalsBanner({ totals }: { totals: readonly CurrencyTotals[] }) {
  const { spacing } = useTheme();

  if (totals.length === 0) {
    return (
      <Card>
        <Text variant="heading">You're all settled up</Text>
        <Text tone="muted">Nobody owes anybody across your groups.</Text>
      </Card>
    );
  }

  return (
    <Card style={{ gap: spacing.md }}>
      {totals.map((row) => (
        <View key={row.currency} style={{ flexDirection: 'row', gap: spacing.lg }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="muted">
              You are owed
            </Text>
            <Text variant="title" tone="positive" numeric>
              {formatMoney(row.owedToYou, row.currency)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="muted">
              You owe
            </Text>
            <Text variant="title" tone="negative" numeric>
              {formatMoney(row.youOwe, row.currency)}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}
