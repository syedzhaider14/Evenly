import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { MemberPicker } from '@/components/members/MemberPicker';
import { Avatar, SwitchRow, Text } from '@/components/ui';
import { displayName } from '@/domain/members';
import { parseAmount, sum, toDecimalString, type Minor } from '@/domain/money';
import type { PayerInput } from '@/domain/split';
import type { ID, Member } from '@/domain/types';
import { useMoney } from '@/hooks/useMoney';
import { useTheme } from '@/theme/ThemeProvider';

export interface PayerEditorProps {
  members: readonly Member[];
  total: Minor | null;
  currency: string;
  value: PayerInput;
  onChange: (value: PayerInput) => void;
  error?: string | null;
}

export function PayerEditor({ members, total, currency, value, onChange, error }: PayerEditorProps) {
  const { colors, radius, spacing } = useTheme();
  const money = useMoney(currency);
  const fallbackPayer = members.find((member) => member.isSelf)?.id ?? members[0]?.id ?? '';

  const setMultiple = (multiple: boolean) => {
    if (multiple) {
      const first = value.mode === 'single' ? value.memberId : fallbackPayer;
      onChange({ mode: 'multiple', entries: [{ memberId: first, value: total ?? 0 }] });
    } else {
      const top =
        value.mode === 'multiple'
          ? [...value.entries].sort((a, b) => b.value - a.value)[0]?.memberId
          : value.memberId;
      onChange({ mode: 'single', memberId: top ?? fallbackPayer });
    }
  };

  const updateAmount = (memberId: ID, amount: number) => {
    if (value.mode !== 'multiple') return;
    const others = value.entries.filter((entry) => entry.memberId !== memberId);
    onChange({ mode: 'multiple', entries: [...others, { memberId, value: amount }] });
  };

  const paid = value.mode === 'multiple' ? sum(value.entries.map((entry) => entry.value)) : total ?? 0;

  return (
    <View style={{ gap: spacing.md }}>
      {value.mode === 'single' ? (
        <MemberPicker
          label="Paid by"
          members={members}
          selected={value.memberId || null}
          onSelect={(memberId) => onChange({ mode: 'single', memberId })}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="muted">
            Paid by
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: error ? colors.negative : colors.border,
              borderRadius: radius.lg,
              backgroundColor: colors.surface,
            }}
          >
            {members.map((member, index) => (
              <PayerAmountRow
                key={member.id}
                member={member}
                first={index === 0}
                currency={currency}
                initial={value.entries.find((entry) => entry.memberId === member.id)?.value ?? 0}
                onChange={(amount) => updateAmount(member.id, amount)}
              />
            ))}
          </View>
          <Text variant="caption" tone={error ? 'negative' : 'muted'}>
            {error ??
              (total === null
                ? `${money.format(paid)} paid`
                : `${money.format(paid)} of ${money.format(total)} paid`)}
          </Text>
        </View>
      )}

      <View style={{ borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        <SwitchRow
          title="Several people paid"
          description="Enter how much each person put in."
          value={value.mode === 'multiple'}
          onValueChange={setMultiple}
        />
      </View>
      {value.mode === 'single' && error ? (
        <Text variant="caption" tone="negative">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function PayerAmountRow({
  member,
  first,
  currency,
  initial,
  onChange,
}: {
  member: Member;
  first: boolean;
  currency: string;
  initial: number;
  onChange: (amount: number) => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [text, setText] = useState(initial === 0 ? '' : toDecimalString(initial, currency));

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}
    >
      <Avatar name={member.name} color={member.color} size={32} />
      <Text style={{ flex: 1 }} numberOfLines={1}>
        {displayName(member)}
      </Text>
      <TextInput
        value={text}
        onChangeText={(next) => {
          setText(next);
          onChange(parseAmount(next, currency) ?? 0);
        }}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        accessibilityLabel={`Amount paid by ${displayName(member)}`}
        style={[
          typography.body,
          {
            minWidth: 96,
            textAlign: 'right',
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.sm,
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.sm,
            fontVariant: ['tabular-nums'],
          },
        ]}
      />
    </View>
  );
}
