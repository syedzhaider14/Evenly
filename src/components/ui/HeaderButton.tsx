import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

export interface HeaderButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  disabled?: boolean;
}

export function HeaderButton({ onPress, accessibilityLabel, icon, label, disabled }: HeaderButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({ opacity: disabled ? 0.4 : pressed ? 0.6 : 1, paddingHorizontal: 4 })}
    >
      {icon ? <Ionicons name={icon} size={24} color={colors.primary} /> : null}
      {label ? (
        <Text variant="label" tone="primary">
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
