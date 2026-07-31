import Ionicons from '@expo/vector-icons/Ionicons';
import { useLayoutEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { CurrencyPicker } from '@/components/members/CurrencyPicker';
import { EmojiPicker, GROUP_EMOJIS } from '@/components/members/EmojiPicker';
import { Avatar, Button, HeaderButton, Screen, SwitchRow, Text, TextField } from '@/components/ui';
import { colorForIndex } from '@/domain/members';
import { MAX_MEMBERS_PER_GROUP, validateGroupName, validateMemberName } from '@/domain/validation';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createGroup } from '@/store/thunks';
import { useTheme } from '@/theme/ThemeProvider';
import { useHaptics } from '@/utils/haptics';
import { describeNameError } from '@/utils/messages';

export function CreateGroupScreen({ navigation }: RootStackScreenProps<'CreateGroup'>) {
  const { colors, radius, spacing } = useTheme();
  const dispatch = useAppDispatch();
  const haptics = useHaptics();
  const settings = useAppSelector((state) => state.settings);

  const [emoji, setEmoji] = useState<string>(GROUP_EMOJIS[1]);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(settings.defaultCurrency);
  const [simplify, setSimplify] = useState(settings.simplifyByDefault);
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [pendingName, setPendingName] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const memberInput = useRef<TextInput>(null);

  const nameError = validateGroupName(name);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <HeaderButton label="Cancel" accessibilityLabel="Cancel" onPress={() => navigation.goBack()} />
      ),
    });
  }, [navigation]);

  const addPendingMember = () => {
    const error = validateMemberName(pendingName, [settings.displayName, ...memberNames]);
    if (error) {
      setMemberError(describeNameError(error, 'member'));
      return;
    }
    if (memberNames.length + 1 >= MAX_MEMBERS_PER_GROUP) {
      setMemberError(`Groups are limited to ${MAX_MEMBERS_PER_GROUP} people.`);
      return;
    }
    setMemberNames((names) => [...names, pendingName.trim()]);
    setPendingName('');
    setMemberError(null);
    haptics.selection();
    memberInput.current?.focus();
  };

  const submit = async () => {
    setSubmitted(true);
    if (nameError) {
      haptics.warning();
      return;
    }
    // Treat a name typed but not yet added as intended.
    const extra = pendingName.trim() && !validateMemberName(pendingName, [settings.displayName, ...memberNames])
      ? [pendingName.trim()]
      : [];
    setSaving(true);
    try {
      const result = await dispatch(
        createGroup({ name, emoji, currency, simplifyDebts: simplify, memberNames: [...memberNames, ...extra] }),
      ).unwrap();
      haptics.success();
      navigation.replace('GroupDetail', { groupId: result.group.id });
    } catch {
      setSaving(false);
      haptics.warning();
    }
  };

  return (
    <Screen footer={<Button title="Create group" onPress={submit} loading={saving} testID="create-group" />}>
      <EmojiPicker value={emoji} onChange={setEmoji} />

      <TextField
        label="Group name"
        placeholder="Lisbon trip, Flat 4B, Poker night…"
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="next"
        onSubmitEditing={() => memberInput.current?.focus()}
        error={submitted && nameError ? describeNameError(nameError, 'group') : null}
      />

      <CurrencyPicker value={currency} onChange={setCurrency} />

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="muted">
          People
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
          }}
        >
          {[settings.displayName, ...memberNames].map((memberName, index) => (
            <View
              key={`${memberName}-${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <Avatar name={memberName} color={colorForIndex(index)} size={32} />
              <Text style={{ flex: 1 }}>{index === 0 ? `${memberName} (you)` : memberName}</Text>
              {index > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${memberName}`}
                  hitSlop={8}
                  onPress={() => setMemberNames((names) => names.filter((_, i) => i !== index - 1))}
                >
                  <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <TextField
              ref={memberInput}
              placeholder="Add a person"
              value={pendingName}
              onChangeText={(text) => {
                setPendingName(text);
                setMemberError(null);
              }}
              onSubmitEditing={addPendingMember}
              returnKeyType="done"
              submitBehavior="submit"
              autoCapitalize="words"
              error={memberError}
            />
          </View>
          <Button title="Add" variant="secondary" onPress={addPendingMember} disabled={!pendingName.trim()} />
        </View>
      </View>

      <View style={{ borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        <SwitchRow
          title="Simplify debts"
          description="Suggest the fewest possible payments, even between people who didn't share a cost directly."
          value={simplify}
          onValueChange={setSimplify}
        />
      </View>
    </Screen>
  );
}
