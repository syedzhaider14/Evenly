import { Pressable, ScrollView, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { displayName } from '@/domain/members';
import type { ID, Member } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';

export interface MemberPickerProps {
  members: readonly Member[];
  selected: ID | null;
  onSelect: (memberId: ID) => void;
  /** Members that cannot be chosen, e.g. the payer when picking the recipient. */
  disabledIds?: readonly ID[];
  label: string;
}

export function MemberPicker({ members, selected, onSelect, disabledIds = [], label }: MemberPickerProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {members.map((member) => {
          const isSelected = member.id === selected;
          const disabled = disabledIds.includes(member.id);
          return (
            <Pressable
              key={member.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled }}
              accessibilityLabel={displayName(member)}
              disabled={disabled}
              onPress={() => onSelect(member.id)}
              style={{
                alignItems: 'center',
                gap: spacing.xs,
                padding: spacing.sm,
                minWidth: 72,
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: isSelected ? colors.primary : 'transparent',
                backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                opacity: disabled ? 0.35 : 1,
              }}
            >
              <Avatar name={member.name} color={member.color} size={40} />
              <Text variant="caption" numberOfLines={1} style={{ maxWidth: 72 }}>
                {displayName(member)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
