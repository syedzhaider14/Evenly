import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import type { Settlement } from '@/domain/types';

import { deleteGroup, deleteSettlement, eraseAllData, hydrate, recordSettlement } from '../thunks';

export const settlementsAdapter = createEntityAdapter<Settlement>({
  sortComparer: (a, b) => b.occurredAt - a.occurredAt || b.createdAt - a.createdAt,
});

export const settlementsSlice = createSlice({
  name: 'settlements',
  initialState: settlementsAdapter.getInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(hydrate.fulfilled, (state, action) => {
        settlementsAdapter.setAll(state, action.payload.settlements);
      })
      .addCase(recordSettlement.fulfilled, (state, action) => {
        settlementsAdapter.addOne(state, action.payload);
      })
      .addCase(deleteSettlement.fulfilled, (state, action) => {
        settlementsAdapter.removeOne(state, action.payload);
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        const ids = state.ids.filter((id) => state.entities[id]?.groupId === action.payload);
        settlementsAdapter.removeMany(state, ids);
      })
      .addCase(eraseAllData.fulfilled, (state) => {
        settlementsAdapter.removeAll(state);
      });
  },
});
