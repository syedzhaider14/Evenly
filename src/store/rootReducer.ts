import { combineReducers } from '@reduxjs/toolkit';

import { appSlice } from './slices/appSlice';
import { expensesSlice } from './slices/expensesSlice';
import { groupsSlice } from './slices/groupsSlice';
import { membersSlice } from './slices/membersSlice';
import { settingsSlice } from './slices/settingsSlice';
import { settlementsSlice } from './slices/settlementsSlice';

export const rootReducer = combineReducers({
  app: appSlice.reducer,
  groups: groupsSlice.reducer,
  members: membersSlice.reducer,
  expenses: expensesSlice.reducer,
  settlements: settlementsSlice.reducer,
  settings: settingsSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
