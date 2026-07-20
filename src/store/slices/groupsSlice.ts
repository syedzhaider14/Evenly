import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import type { Group } from '@/domain/types';

import {
  createGroup,
  deleteGroup,
  eraseAllData,
  hydrate,
  recordSettlement,
  saveExpense,
  updateGroup,
} from '../thunks';

export const groupsAdapter = createEntityAdapter<Group>({
  sortComparer: (a, b) => Number(a.archived) - Number(b.archived) || b.updatedAt - a.updatedAt,
});

export const groupsSlice = createSlice({
  name: 'groups',
  initialState: groupsAdapter.getInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(hydrate.fulfilled, (state, action) => {
        groupsAdapter.setAll(state, action.payload.groups);
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        groupsAdapter.addOne(state, action.payload.group);
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        groupsAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        groupsAdapter.removeOne(state, action.payload);
      })
      .addCase(saveExpense.fulfilled, (state, action) => {
        groupsAdapter.updateOne(state, {
          id: action.payload.groupId,
          changes: { updatedAt: action.payload.updatedAt },
        });
      })
      .addCase(recordSettlement.fulfilled, (state, action) => {
        groupsAdapter.updateOne(state, {
          id: action.payload.groupId,
          changes: { updatedAt: action.payload.createdAt },
        });
      })
      .addCase(eraseAllData.fulfilled, (state) => {
        groupsAdapter.removeAll(state);
      });
  },
});
