import { configureStore } from '@reduxjs/toolkit';

import type { ThunkExtra } from './extra';
import { rootReducer, type RootState } from './rootReducer';

export function createAppStore(extra: ThunkExtra, preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
      }),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];
export type { RootState } from './rootReducer';
export type { ThunkExtra } from './extra';
