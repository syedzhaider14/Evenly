import { createSlice } from '@reduxjs/toolkit';

import { hydrate } from '../thunks';

export type BootStatus = 'idle' | 'loading' | 'ready' | 'failed';

export interface AppState {
  bootStatus: BootStatus;
  bootError: string | null;
}

const initialState: AppState = {
  bootStatus: 'idle',
  bootError: null,
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(hydrate.pending, (state) => {
        state.bootStatus = 'loading';
        state.bootError = null;
      })
      .addCase(hydrate.fulfilled, (state) => {
        state.bootStatus = 'ready';
      })
      .addCase(hydrate.rejected, (state, action) => {
        state.bootStatus = 'failed';
        state.bootError = action.error.message ?? 'Could not open your data.';
      });
  },
});
