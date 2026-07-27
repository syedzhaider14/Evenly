import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { TypographyVariant } from '@/theme/tokens';

export type TextTone = 'default' | 'muted' | 'primary' | 'positive' | 'negative' | 'inverse';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
  /** Uses tabular figures so columns of amounts line up. */
  numeric?: boolean;
}

export function Text({
  variant = 'body',
  tone = 'default',
  align,
  numeric,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const color = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    positive: theme.colors.positive,
    negative: theme.colors.negative,
    inverse: theme.colors.textInverse,
  }[tone];

  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      style={[
        theme.typography[variant],
        { color, textAlign: align },
        numeric && { fontVariant: ['tabular-nums'] },
        style,
      ]}
      {...rest}
    />
  );
}
