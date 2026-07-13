import type { Expense, Group, ID, Settlement } from './types';

export type ActivityItem =
  | { kind: 'expense'; id: ID; groupId: ID; at: number; expense: Expense }
  | { kind: 'settlement'; id: ID; groupId: ID; at: number; settlement: Settlement };

export interface ActivitySection {
  /** Local calendar day as `YYYY-MM-DD`. */
  day: string;
  items: ActivityItem[];
}

export function localDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Merges expenses and settlements into newest-first sections, one per local day. */
export function buildActivityFeed(
  expenses: readonly Expense[],
  settlements: readonly Settlement[],
  groups: readonly Group[],
  limit = 200,
): ActivitySection[] {
  const visibleGroups = new Set(groups.filter((group) => !group.archived).map((group) => group.id));

  const items: ActivityItem[] = [
    ...expenses
      .filter((expense) => visibleGroups.has(expense.groupId))
      .map((expense): ActivityItem => ({
        kind: 'expense',
        id: expense.id,
        groupId: expense.groupId,
        at: expense.createdAt,
        expense,
      })),
    ...settlements
      .filter((settlement) => visibleGroups.has(settlement.groupId))
      .map((settlement): ActivityItem => ({
        kind: 'settlement',
        id: settlement.id,
        groupId: settlement.groupId,
        at: settlement.createdAt,
        settlement,
      })),
  ]
    .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id))
    .slice(0, limit);

  const sections: ActivitySection[] = [];
  for (const item of items) {
    const day = localDayKey(item.at);
    const last = sections[sections.length - 1];
    if (last && last.day === day) last.items.push(item);
    else sections.push({ day, items: [item] });
  }
  return sections;
}

/** Groups items into calendar-month buckets, newest first, for long expense lists. */
export function groupByMonth<T>(items: readonly T[], at: (item: T) => number) {
  const sections: { key: string; title: string; data: T[] }[] = [];
  const formatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

  for (const item of items) {
    const date = new Date(at(item));
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const last = sections[sections.length - 1];
    if (last && last.key === key) last.data.push(item);
    else sections.push({ key, title: formatter.format(date), data: [item] });
  }
  return sections;
}
