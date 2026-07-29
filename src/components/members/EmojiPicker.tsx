import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export const GROUP_EMOJIS = ['🏠', '✈️', '🏖️', '🏔️', '🍕', '🎉', '🚗', '💼', '⚽', '🎓', '❤️', '🛒'] as const;

export interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Group icon"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
    >
      {GROUP_EMOJIS.map((emoji) => {
        const selected = emoji === value;
        return (
          <Pressable
            key={emoji}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Icon ${emoji}`}
            onPress={() => onChange(emoji)}
            style={{
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              borderWidth: 2,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primaryMuted : colors.surface,
            }}
          >
            <Text style={{ fontSize: 24, lineHeight: 30 }}>{emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
