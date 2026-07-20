import { createSlice } from '@reduxjs/toolkit';

import { DEFAULT_SETTINGS, type AppSettings } from '@/data/repositories';

import { hydrate, updateSettings } from '../thunks';

export const settingsSlice = createSlice({
  name: 'settings',
  initialState: DEFAULT_SETTINGS as AppSettings,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(hydrate.fulfilled, (_state, action) => action.payload.settings)
      // Optimistic: the UI reflects the change immediately; a failed write is rare and
      // reverted on the next launch when settings are re-read from disk.
      .addCase(updateSettings.pending, (state, action) => {
        Object.assign(state, action.meta.arg);
      });
  },
});
