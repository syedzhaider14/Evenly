import { Pressable } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leading?: string;
  accessibilityLabel?: string;
}

export function Chip({ label, selected = false, onPress, leading, accessibilityLabel }: ChipProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primaryMuted : colors.surface,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {leading ? <Text variant="caption">{leading}</Text> : null}
      <Text variant="caption" tone={selected ? 'primary' : 'default'} style={{ fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}
