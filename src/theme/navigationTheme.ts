import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';

import type { Theme } from './tokens';

export function toNavigationTheme(theme: Theme): NavigationTheme {
  const base = theme.dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: theme.dark,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.negative,
    },
  };
}
