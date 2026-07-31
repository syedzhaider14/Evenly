import { useLayoutEffect, useState } from 'react';
import { View } from 'react-native';

import { CategoryPicker } from '@/components/expenses/CategoryPicker';
import { DateStepper } from '@/components/expenses/DateStepper';
import { PayerEditor } from '@/components/expenses/PayerEditor';
import { SplitEditor } from '@/components/expenses/SplitEditor';
import { Button, EmptyState, HeaderButton, Screen, TextField } from '@/components/ui';
import type { Expense, Member } from '@/domain/types';
import { DESCRIPTION_MAX_LENGTH, NOTES_MAX_LENGTH } from '@/domain/validation';
import { useExpenseForm } from '@/hooks/useExpenseForm';
import { useGroup } from '@/hooks/useGroup';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { expenseSelectors } from '@/store/selectors';
import { saveExpense } from '@/store/thunks';
import { useTheme } from '@/theme/ThemeProvider';
import { useHaptics } from '@/utils/haptics';

export function ExpenseEditorScreen({ route, navigation }: RootStackScreenProps<'ExpenseEditor'>) {
  const { groupId, expenseId } = route.params;
  const { group, members } = useGroup(groupId);
  const existing = useAppSelector((state) =>
    expenseId ? expenseSelectors.selectById(state, expenseId) : undefined,
  );

  if (!group || members.length === 0 || (expenseId && !existing)) {
    return (
      <EmptyState emoji="🫥" title="Nothing to edit" message="This group or expense no longer exists." />
    );
  }

  return (
    <ExpenseForm
      key={existing?.id ?? 'new'}
      groupId={groupId}
      currency={group.currency}
      members={members}
      existing={existing}
      navigation={navigation}
    />
  );
}

interface ExpenseFormProps {
  groupId: string;
  currency: string;
  members: readonly Member[];
  existing: Expense | undefined;
  navigation: RootStackScreenProps<'ExpenseEditor'>['navigation'];
}

function ExpenseForm({ groupId, currency, members, existing, navigation }: ExpenseFormProps) {
  const { spacing } = useTheme();
  const dispatch = useAppDispatch();
  const haptics = useHaptics();
  const form = useExpenseForm({ currency, members, existing });
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: form.isEditing ? 'Edit expense' : 'Add expense',
      headerLeft: () => (
        <HeaderButton label="Cancel" accessibilityLabel="Cancel" onPress={() => navigation.goBack()} />
      ),
    });
  }, [navigation, form.isEditing]);

  const submit = async () => {
    form.markSubmitted();
    if (!form.validation.ok) {
      haptics.warning();
      return;
    }
    setSaving(true);
    try {
      await dispatch(saveExpense({ groupId, value: form.validation.value })).unwrap();
      haptics.success();
      navigation.goBack();
    } catch {
      setSaving(false);
      haptics.warning();
    }
  };

  return (
    <Screen
      footer={
        <Button
          title={form.isEditing ? 'Save changes' : 'Add expense'}
          onPress={submit}
          loading={saving}
          testID="save-expense"
        />
      }
    >
      <TextField
        label="Description"
        placeholder="Dinner, taxi, groceries…"
        value={form.values.description}
        onChangeText={form.setDescription}
        maxLength={DESCRIPTION_MAX_LENGTH}
        autoFocus={!form.isEditing}
        returnKeyType="next"
        error={form.errors.description}
      />
      <TextField
        label="Amount"
        prefix={currency}
        large
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={form.values.amountText}
        onChangeText={form.setAmountText}
        error={form.errors.amount}
      />
      <CategoryPicker value={form.values.category} onChange={form.setCategory} />
      <DateStepper value={form.values.occurredAt} onChange={form.setOccurredAt} />
      <PayerEditor
        members={members}
        total={form.total}
        currency={currency}
        value={form.values.payers}
        onChange={form.setPayers}
        error={form.errors.payers}
      />
      <SplitEditor
        members={members}
        total={form.total}
        currency={currency}
        value={form.values.split}
        onChange={form.setSplit}
        error={form.total === null ? null : form.errors.split}
      />
      <View style={{ marginBottom: spacing.lg }}>
        <TextField
          label="Notes"
          placeholder="Optional"
          value={form.values.notes}
          onChangeText={form.setNotes}
          maxLength={NOTES_MAX_LENGTH}
          multiline
          error={form.errors.notes}
        />
      </View>
    </Screen>
  );
}
