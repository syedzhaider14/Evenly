import { ScrollView, View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { COMMON_CURRENCIES } from '@/domain/currencies';
import { useTheme } from '@/theme/ThemeProvider';

export interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

export function CurrencyPicker({ value, onChange, label = 'Currency' }: CurrencyPickerProps) {
  const { spacing } = useTheme();
  const selected = COMMON_CURRENCIES.find((currency) => currency.code === value);
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="muted">
        {label}
        {selected ? ` · ${selected.name}` : ''}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {COMMON_CURRENCIES.map((currency) => (
          <Chip
            key={currency.code}
            label={currency.code}
            accessibilityLabel={currency.name}
            selected={currency.code === value}
            onPress={() => onChange(currency.code)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
