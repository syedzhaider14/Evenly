import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import type { Expense } from '@/domain/types';

import { deleteExpense, deleteGroup, eraseAllData, hydrate, saveExpense } from '../thunks';

export const expensesAdapter = createEntityAdapter<Expense>({
  sortComparer: (a, b) => b.occurredAt - a.occurredAt || b.createdAt - a.createdAt,
});

export const expensesSlice = createSlice({
  name: 'expenses',
  initialState: expensesAdapter.getInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(hydrate.fulfilled, (state, action) => {
        expensesAdapter.setAll(state, action.payload.expenses);
      })
      .addCase(saveExpense.fulfilled, (state, action) => {
        expensesAdapter.setOne(state, action.payload);
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        expensesAdapter.removeOne(state, action.payload.id);
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        const ids = state.ids.filter((id) => state.entities[id]?.groupId === action.payload);
        expensesAdapter.removeMany(state, ids);
      })
      .addCase(eraseAllData.fulfilled, (state) => {
        expensesAdapter.removeAll(state);
      });
  },
});
