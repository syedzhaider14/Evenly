import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Avatar, SegmentedControl, Text } from '@/components/ui';
import { useMoney } from '@/hooks/useMoney';
import { displayName } from '@/domain/members';
import { parseAmount, sum, toDecimalString, type Minor } from '@/domain/money';
import {
  computeSplit,
  convertSplitInput,
  SHARE_SCALE,
  type SplitInput,
  type SplitMethod,
} from '@/domain/split';
import type { ID, Member } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatBasisPoints, formatShares } from '@/utils/format';

const METHODS = [
  { value: 'equal', label: 'Equally' },
  { value: 'exact', label: 'Amounts' },
  { value: 'percentage', label: '%' },
  { value: 'shares', label: 'Shares' },
] as const satisfies readonly { value: SplitMethod; label: string }[];

export interface SplitEditorProps {
  members: readonly Member[];
  /** Expense total in minor units, or null while the amount field is empty/invalid. */
  total: Minor | null;
  currency: string;
  value: SplitInput;
  onChange: (value: SplitInput) => void;
  error?: string | null;
}

function entryValue(input: SplitInput, memberId: ID): number {
  if (input.method === 'equal') return input.participants.includes(memberId) ? 1 : 0;
  return input.entries.find((entry) => entry.memberId === memberId)?.value ?? 0;
}

function withEntryValue(input: SplitInput, memberId: ID, value: number, order: readonly ID[]): SplitInput {
  if (input.method === 'equal') return input;
  const others = input.entries.filter((entry) => entry.memberId !== memberId);
  const entries = [...others, { memberId, value }].sort(
    (a, b) => order.indexOf(a.memberId) - order.indexOf(b.memberId),
  );
  return { ...input, entries };
}

function toggleParticipant(input: SplitInput, memberId: ID, order: readonly ID[]): SplitInput {
  if (input.method !== 'equal') return input;
  const participants = input.participants.includes(memberId)
    ? input.participants.filter((id) => id !== memberId)
    : [...input.participants, memberId].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { method: 'equal', participants };
}

export function SplitEditor({ members, total, currency, value, onChange, error }: SplitEditorProps) {
  const { colors, radius, spacing } = useTheme();
  const money = useMoney(currency);
  const order = useMemo(() => members.map((member) => member.id), [members]);

  const preview = useMemo(
    () => (total !== null && total > 0 ? computeSplit(total, value) : null),
    [total, value],
  );
  const computed = new Map(preview?.ok ? preview.shares.map((s) => [s.memberId, s.amount]) : []);

  const summary = (() => {
    switch (value.method) {
      case 'equal': {
        const count = value.participants.length;
        if (count === 0) return 'Nobody selected';
        if (total === null) return `Split between ${count}`;
        return `${money.format(Math.floor(total / count))} each · ${count} ${count === 1 ? 'person' : 'people'}`;
      }
      case 'exact': {
        const assigned = sum(value.entries.map((entry) => entry.value));
        if (total === null) return `${money.format(assigned)} assigned`;
        const remaining = total - assigned;
        if (remaining === 0) return 'All assigned';
        return remaining > 0
          ? `${money.format(remaining)} left of ${money.format(total)}`
          : `${money.format(-remaining)} over ${money.format(total)}`;
      }
      case 'percentage':
        return `Total ${formatBasisPoints(sum(value.entries.map((entry) => entry.value)))}`;
      case 'shares':
        return `${formatShares(sum(value.entries.map((entry) => entry.value)))} shares in total`;
    }
  })();

  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="label" tone="muted">
        Split
      </Text>
      <SegmentedControl
        accessibilityLabel="Split method"
        segments={METHODS}
        value={value.method}
        onChange={(method) => onChange(convertSplitInput(value, method, total ?? 0, order))}
      />

      <View
        style={{
          borderWidth: 1,
          borderColor: error ? colors.negative : colors.border,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        }}
      >
        {members.map((member, index) => {
          const current = entryValue(value, member.id);
          const share = computed.get(member.id);
          return (
            <View
              key={member.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.border,
                minHeight: 56,
              }}
            >
              <Avatar name={member.name} color={member.color} size={32} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1}>{displayName(member)}</Text>
                {value.method !== 'exact' && share !== undefined ? (
                  <Text variant="caption" tone="muted" numeric>
                    {money.format(share)}
                  </Text>
                ) : null}
              </View>

              {value.method === 'equal' ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: current === 1 }}
                  accessibilityLabel={`Include ${displayName(member)}`}
                  hitSlop={8}
                  onPress={() => onChange(toggleParticipant(value, member.id, order))}
                >
                  <Ionicons
                    name={current === 1 ? 'checkbox' : 'square-outline'}
                    size={26}
                    color={current === 1 ? colors.primary : colors.textMuted}
                  />
                </Pressable>
              ) : null}

              {value.method === 'exact' ? (
                <NumericCell
                  key={`exact-${member.id}`}
                  initial={current === 0 ? '' : toDecimalString(current, currency)}
                  placeholder="0"
                  parse={(text) => parseAmount(text, currency)}
                  onChangeValue={(next) => onChange(withEntryValue(value, member.id, next, order))}
                  accessibilityLabel={`Amount for ${displayName(member)}`}
                />
              ) : null}

              {value.method === 'percentage' ? (
                <NumericCell
                  key={`percent-${member.id}`}
                  initial={current === 0 ? '' : (current / 100).toString()}
                  placeholder="0"
                  suffix="%"
                  // Percentages accept two decimals, which maps 1:1 onto basis points.
                  parse={(text) => parseAmount(text, 'USD')}
                  onChangeValue={(next) => onChange(withEntryValue(value, member.id, next, order))}
                  accessibilityLabel={`Percentage for ${displayName(member)}`}
                />
              ) : null}

              {value.method === 'shares' ? (
                <ShareStepper
                  value={current}
                  label={displayName(member)}
                  onChange={(next) => onChange(withEntryValue(value, member.id, next, order))}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      <Text variant="caption" tone={error ? 'negative' : 'muted'} accessibilityLiveRegion="polite">
        {error ?? summary}
      </Text>
    </View>
  );
}

interface NumericCellProps {
  initial: string;
  placeholder: string;
  suffix?: string;
  parse: (text: string) => number | null;
  onChangeValue: (value: number) => void;
  accessibilityLabel: string;
}

/** Keeps the raw text locally so partially typed values such as "12." are not lost. */
function NumericCell({ initial, placeholder, suffix, parse, onChangeValue, accessibilityLabel }: NumericCellProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [text, setText] = useState(initial);
  const invalid = text.trim().length > 0 && parse(text) === null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <TextInput
        value={text}
        onChangeText={(next) => {
          setText(next);
          onChangeValue(parse(next) ?? 0);
        }}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={accessibilityLabel}
        selectTextOnFocus
        style={[
          typography.body,
          {
            minWidth: 88,
            textAlign: 'right',
            color: invalid ? colors.negative : colors.text,
            borderWidth: 1,
            borderColor: invalid ? colors.negative : colors.border,
            borderRadius: radius.sm,
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.sm,
            fontVariant: ['tabular-nums'],
          },
        ]}
      />
      {suffix ? <Text tone="muted">{suffix}</Text> : null}
    </View>
  );
}

function ShareStepper({ value, label, onChange }: { value: number; label: string; onChange: (value: number) => void }) {
  const { colors, spacing } = useTheme();
  const step = SHARE_SCALE / 2;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Fewer shares for ${label}`}
        disabled={value === 0}
        hitSlop={8}
        onPress={() => onChange(Math.max(0, value - step))}
      >
        <Ionicons name="remove-circle-outline" size={26} color={value === 0 ? colors.border : colors.primary} />
      </Pressable>
      <Text variant="label" numeric style={{ minWidth: 32, textAlign: 'center' }}>
        {formatShares(value)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`More shares for ${label}`}
        hitSlop={8}
        onPress={() => onChange(value + step)}
      >
        <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
      </Pressable>
    </View>
  );
}
