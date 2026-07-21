import { createAsyncThunk } from '@reduxjs/toolkit';

import type { ThunkExtra } from './extra';
import type { AppDispatch } from './index';
import type { RootState } from './rootReducer';

export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  extra: ThunkExtra;
  rejectValue: string;
}>();
