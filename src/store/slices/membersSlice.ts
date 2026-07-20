import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import type { Member } from '@/domain/types';

import {
  addMember,
  createGroup,
  deleteGroup,
  eraseAllData,
  hydrate,
  removeMember,
  renameMember,
} from '../thunks';

export const membersAdapter = createEntityAdapter<Member>({
  sortComparer: (a, b) => Number(b.isSelf) - Number(a.isSelf) || a.createdAt - b.createdAt,
});

export const membersSlice = createSlice({
  name: 'members',
  initialState: membersAdapter.getInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(hydrate.fulfilled, (state, action) => {
        membersAdapter.setAll(state, action.payload.members);
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        membersAdapter.addMany(state, action.payload.members);
      })
      .addCase(addMember.fulfilled, (state, action) => {
        membersAdapter.addOne(state, action.payload);
      })
      .addCase(renameMember.fulfilled, (state, action) => {
        membersAdapter.updateOne(state, {
          id: action.payload.id,
          changes: { name: action.payload.name },
        });
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        membersAdapter.removeOne(state, action.payload);
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        const ids = state.ids.filter((id) => state.entities[id]?.groupId === action.payload);
        membersAdapter.removeMany(state, ids);
      })
      .addCase(eraseAllData.fulfilled, (state) => {
        membersAdapter.removeAll(state);
      });
  },
});
