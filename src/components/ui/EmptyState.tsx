import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  emoji: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, message, actionLabel, onAction }: EmptyStateProps) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.xxxl,
        gap: spacing.sm,
      }}
    >
      <Text style={{ fontSize: 48, lineHeight: 56 }} accessibilityElementsHidden>
        {emoji}
      </Text>
      <Text variant="heading" align="center">
        {title}
      </Text>
      <Text tone="muted" align="center">
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
  );
}
