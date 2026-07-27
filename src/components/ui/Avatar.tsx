import { View } from 'react-native';

import { initials } from '@/domain/members';

import { Text } from './Text';

export interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  /** Replaces initials, e.g. a group emoji. */
  emoji?: string;
}

export function Avatar({ name, color, size = 36, emoji }: AvatarProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        variant={size >= 48 ? 'heading' : 'micro'}
        style={{ color: '#FFFFFF', fontSize: emoji ? size * 0.5 : undefined }}
      >
        {emoji ?? initials(name)}
      </Text>
    </View>
  );
}
