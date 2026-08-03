import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { Button, EmptyState } from '@/components/ui';
import { openDatabase } from '@/data/db/openDatabase';
import { createRepositories } from '@/data/repositories';
import { systemClock } from '@/data/runtime';
import { uuidGenerator } from '@/data/uuid';
import { linking } from '@/navigation/linking';
import { RootNavigator } from '@/navigation/RootNavigator';
import { createAppStore, type AppStore } from '@/store';
import { hydrate } from '@/store/thunks';
import { toNavigationTheme } from '@/theme/navigationTheme';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

type Boot = { status: 'loading' } | { status: 'ready'; store: AppStore } | { status: 'failed'; error: string };

export default function App() {
  const [boot, setBoot] = useState<Boot>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBoot({ status: 'loading' });

    (async () => {
      const db = await openDatabase();
      const store = createAppStore({
        repos: createRepositories(db),
        clock: systemClock,
        ids: uuidGenerator,
      });
      await store.dispatch(hydrate()).unwrap();
      if (!cancelled) setBoot({ status: 'ready', store });
    })().catch((error: unknown) => {
      if (!cancelled) {
        setBoot({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (boot.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (boot.status === 'failed') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <EmptyState emoji="⚠️" title="Couldn't open your data" message={boot.error} />
        <Button title="Try again" onPress={() => setAttempt((value) => value + 1)} />
      </View>
    );
  }

  return (
    <Provider store={boot.store}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ThemedNavigation />
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>
  );
}

function ThemedNavigation() {
  const theme = useTheme();
  const navigationTheme = useMemo(() => toNavigationTheme(theme), [theme]);
  return (
    <NavigationContainer theme={navigationTheme} linking={linking}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}
