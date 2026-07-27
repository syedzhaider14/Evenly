import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface ProgressBarProps {
  /** 0…1 */
  value: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ value, color, height = 8 }: ProgressBarProps) {
  const { colors, radius } = useTheme();
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: color ?? colors.primary,
        }}
      />
    </View>
  );
}
