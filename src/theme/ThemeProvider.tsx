import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { useAppSelector } from '@/store/hooks';

import { darkTheme, lightTheme, type Theme } from './tokens';

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: PropsWithChildren) {
  const preference = useAppSelector((state) => state.settings.theme);
  const system = useColorScheme();
  const resolved = preference === 'system' ? system : preference;
  const theme = resolved === 'dark' ? darkTheme : lightTheme;

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Creates a hook that builds a themed `StyleSheet` once per theme.
 *
 * ```ts
 * const useStyles = makeStyles((t) => ({ title: { color: t.colors.text } }));
 * ```
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
