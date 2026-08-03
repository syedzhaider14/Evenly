import { useLayoutEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { DateStepper } from '@/components/expenses/DateStepper';
import { MemberPicker } from '@/components/members/MemberPicker';
import { Button, Chip, EmptyState, HeaderButton, Screen, Text, TextField } from '@/components/ui';
import { displayName } from '@/domain/members';
import { formatMoney, parseAmount, toDecimalString } from '@/domain/money';
import { validateSettlement } from '@/domain/validation';
import { useGroup } from '@/hooks/useGroup';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { memberSelectors, selectSettlementPlan } from '@/store/selectors';
import { recordSettlement } from '@/store/thunks';
import { useTheme } from '@/theme/ThemeProvider';
import { useHaptics } from '@/utils/haptics';
import { describeSettlementError } from '@/utils/messages';

export function SettleUpScreen({ route, navigation }: RootStackScreenProps<'SettleUp'>) {
  const { groupId, from: initialFrom, to: initialTo, amount: initialAmount } = route.params;
  const { spacing } = useTheme();
  const dispatch = useAppDispatch();
  const haptics = useHaptics();
  const { group, members } = useGroup(groupId);
  const memberEntities = useAppSelector(memberSelectors.selectEntities);
  const plan = useAppSelector((state) => selectSettlementPlan(state, groupId));

  const currency = group?.currency ?? 'USD';
  const [from, setFrom] = useState<string | null>(initialFrom ?? null);
  const [to, setTo] = useState<string | null>(initialTo ?? null);
  const [amountText, setAmountText] = useState(
    initialAmount ? toDecimalString(initialAmount, currency) : '',
  );
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <HeaderButton label="Cancel" accessibilityLabel="Cancel" onPress={() => navigation.goBack()} />
      ),
    });
  }, [navigation]);

  if (!group) {
    return <EmptyState emoji="🫥" title="Group not found" message="It may have been deleted." />;
  }

  const amount = parseAmount(amountText, currency);
  const error = validateSettlement({ from, to, amount });

  const submit = async () => {
    setSubmitted(true);
    if (error || !from || !to || amount === null) {
      haptics.warning();
      return;
    }
    setSaving(true);
    try {
      await dispatch(recordSettlement({ groupId, from, to, amount, note, occurredAt })).unwrap();
      haptics.success();
      navigation.goBack();
    } catch {
      setSaving(false);
      haptics.warning();
    }
  };

  return (
    <Screen footer={<Button title="Record payment" onPress={submit} loading={saving} testID="record-payment" />}>
      {plan.transfers.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="muted">
            Suggested
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {plan.transfers.map((transfer) => (
              <Chip
                key={`${transfer.from}-${transfer.to}`}
                label={`${displayName(memberEntities[transfer.from])} → ${displayName(
                  memberEntities[transfer.to],
                )} · ${formatMoney(transfer.amount, currency)}`}
                selected={transfer.from === from && transfer.to === to}
                onPress={() => {
                  setFrom(transfer.from);
                  setTo(transfer.to);
                  setAmountText(toDecimalString(transfer.amount, currency));
                  haptics.selection();
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <MemberPicker label="Who paid" members={members} selected={from} onSelect={setFrom} />
      <MemberPicker
        label="Who received it"
        members={members}
        selected={to}
        onSelect={setTo}
        disabledIds={from ? [from] : []}
      />
      <TextField
        label="Amount"
        prefix={currency}
        large
        keyboardType="decimal-pad"
        placeholder="0.00"
        value={amountText}
        onChangeText={setAmountText}
      />
      <DateStepper value={occurredAt} onChange={setOccurredAt} />
      <TextField label="Note" placeholder="Bank transfer, cash…" value={note} onChangeText={setNote} />

      {submitted && error ? (
        <Text tone="negative" accessibilityLiveRegion="polite">
          {describeSettlementError(error)}
        </Text>
      ) : null}
    </Screen>
  );
}
