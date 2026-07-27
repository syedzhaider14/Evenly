import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { groupLedgerToCsv } from '@/domain/csv';
import type { Expense, Group, Member, Settlement } from '@/domain/types';

function safeFileName(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return base.length > 0 ? base : 'group';
}

/**
 * Writes the group's ledger to a CSV file in the cache directory and opens the share sheet.
 * Returns false when sharing is unavailable on the device (e.g. some emulators).
 */
export async function shareGroupCsv(
  group: Group,
  members: readonly Member[],
  expenses: readonly Expense[],
  settlements: readonly Settlement[],
): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;

  const csv = groupLedgerToCsv(group, members, expenses, settlements);
  const file = new File(Paths.cache, `${safeFileName(group.name)}-evenly.csv`);
  if (file.exists) file.delete();
  file.create();
  // A byte-order mark makes Excel open UTF-8 (names with accents, emoji) correctly.
  file.write(`﻿${csv}`);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: `Export ${group.name}`,
  });
  return true;
}
