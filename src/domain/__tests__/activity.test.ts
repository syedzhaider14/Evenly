import { buildActivityFeed, groupByMonth, localDayKey } from '../activity';
import { suggestCategory } from '../categories';
import { initials, nextMemberColor, MEMBER_COLORS } from '../members';
import type { Expense, Group, Settlement } from '../types';

const group = (id: string, archived = false): Group => ({
  id,
  name: id,
  emoji: '🏠',
  currency: 'USD',
  simplifyDebts: true,
  archived,
  createdAt: 0,
  updatedAt: 0,
});

const expense = (id: string, groupId: string, createdAt: number): Expense => ({
  id,
  groupId,
  description: id,
  amount: 100,
  category: 'other',
  payers: [{ memberId: 'a', amount: 100 }],
  shares: [{ memberId: 'a', amount: 100 }],
  split: { method: 'equal', participants: ['a'] },
  notes: null,
  occurredAt: createdAt,
  createdAt,
  updatedAt: createdAt,
});

const settlement = (id: string, groupId: string, createdAt: number): Settlement => ({
  id,
  groupId,
  from: 'a',
  to: 'b',
  amount: 100,
  note: null,
  occurredAt: createdAt,
  createdAt,
});

describe('buildActivityFeed', () => {
  const day1 = new Date(2026, 3, 10, 9).getTime();
  const day1Later = new Date(2026, 3, 10, 18).getTime();
  const day2 = new Date(2026, 3, 11, 12).getTime();

  it('merges expenses and payments newest first, grouped by day', () => {
    const feed = buildActivityFeed(
      [expense('e1', 'g', day1), expense('e2', 'g', day2)],
      [settlement('s1', 'g', day1Later)],
      [group('g')],
    );
    expect(feed.map((section) => section.day)).toEqual([localDayKey(day2), localDayKey(day1)]);
    expect(feed[1]?.items.map((item) => item.id)).toEqual(['s1', 'e1']);
  });

  it('hides archived groups', () => {
    const feed = buildActivityFeed([expense('e1', 'old', day1)], [], [group('old', true)]);
    expect(feed).toEqual([]);
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => expense(`e${i}`, 'g', day1 + i));
    const feed = buildActivityFeed(many, [], [group('g')], 3);
    expect(feed.flatMap((section) => section.items)).toHaveLength(3);
  });
});

describe('groupByMonth', () => {
  it('buckets consecutive items by calendar month', () => {
    const items = [new Date(2026, 4, 20), new Date(2026, 4, 2), new Date(2026, 3, 30)].map((d) =>
      d.getTime(),
    );
    const sections = groupByMonth(items, (value) => value);
    expect(sections.map((section) => section.data.length)).toEqual([2, 1]);
  });
});

describe('suggestCategory', () => {
  it.each([
    ['Sushi with Ana', 'food'],
    ['Uber to the airport', 'transport'],
    ['Airbnb Lisbon', 'lodging'],
    ['Weekly groceries', 'groceries'],
    ['Concert tickets', 'entertainment'],
  ])('%s → %s', (description, expected) => {
    expect(suggestCategory(description)).toBe(expected);
  });

  it('returns null when nothing matches', () => {
    expect(suggestCategory('Misc')).toBeNull();
  });
});

describe('member helpers', () => {
  it('builds initials', () => {
    expect(initials('Ana Lima')).toBe('AL');
    expect(initials('ben')).toBe('BE');
    expect(initials('  ')).toBe('?');
    expect(initials('Mary Jane Watson')).toBe('MW');
  });

  it('picks an unused colour first', () => {
    expect(nextMemberColor([{ color: MEMBER_COLORS[0] }])).toBe(MEMBER_COLORS[1]);
    expect(nextMemberColor(MEMBER_COLORS.map((color) => ({ color })))).toBe(MEMBER_COLORS[0]);
  });
});
