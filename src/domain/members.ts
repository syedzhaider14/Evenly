import type { Member } from './types';

/** Accessible avatar colours, all with at least 4.5:1 contrast against white text. */
export const MEMBER_COLORS = [
  '#0F766E',
  '#B45309',
  '#7C3AED',
  '#BE123C',
  '#1D4ED8',
  '#15803D',
  '#A21CAF',
  '#C2410C',
  '#0369A1',
  '#4D7C0F',
] as const;

export function colorForIndex(index: number): string {
  return MEMBER_COLORS[Math.abs(index) % MEMBER_COLORS.length]!;
}

/** Picks the first palette colour not already used in the group, cycling when all are taken. */
export function nextMemberColor(existing: readonly Pick<Member, 'color'>[]): string {
  const used = new Set(existing.map((member) => member.color));
  return MEMBER_COLORS.find((color) => !used.has(color)) ?? colorForIndex(existing.length);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]!;
  if (parts.length === 1) return Array.from(first).slice(0, 2).join('').toUpperCase();
  const last = parts[parts.length - 1]!;
  return `${Array.from(first)[0] ?? ''}${Array.from(last)[0] ?? ''}`.toUpperCase();
}

/** Display name that reads naturally in sentences: "You" for the device owner. */
export function displayName(member: Pick<Member, 'name' | 'isSelf'> | undefined): string {
  if (!member) return 'Someone';
  return member.isSelf ? 'You' : member.name;
}
