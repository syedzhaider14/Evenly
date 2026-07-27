import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

export interface FloatingButtonProps {
  label: string;
  onPress: () => void;
  /** Extra space to keep clear of a bottom tab bar. */
  bottomOffset?: number;
  testID?: string;
}

export function FloatingButton({ label, onPress, bottomOffset = 0, testID }: FloatingButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => ({
        position: 'absolute',
        right: spacing.lg,
        bottom: Math.max(insets.bottom, spacing.lg) + bottomOffset,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg + 2,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      })}
    >
      <Ionicons name="add" size={22} color={colors.textInverse} />
      <Text variant="label" tone="inverse">
        {label}
      </Text>
    </Pressable>
  );
}
