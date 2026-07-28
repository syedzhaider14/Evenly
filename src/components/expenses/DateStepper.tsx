import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDate, formatRelativeDay, shiftDays } from '@/utils/format';

export interface DateStepperProps {
  value: number;
  onChange: (timestamp: number) => void;
  label?: string;
}

/**
 * A dependency-free date control: step a day at a time, tap the label to jump back to today.
 * Most expenses are logged the same day or shortly after, so this covers the common case
 * without a native picker module.
 */
export function DateStepper({ value, onChange, label = 'Date' }: DateStepperProps) {
  const { colors, radius, spacing } = useTheme();

  const step = (days: number) => onChange(shiftDays(value, days));

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          onPress={() => step(-1)}
          style={{ padding: spacing.md }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${formatDate(value)}. Double tap to reset to today.`}
          onPress={() => onChange(Date.now())}
          style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.sm }}
        >
          <Text variant="label">{formatRelativeDay(value)}</Text>
          <Text variant="caption" tone="muted">
            {formatDate(value)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          onPress={() => step(1)}
          style={{ padding: spacing.md }}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}
