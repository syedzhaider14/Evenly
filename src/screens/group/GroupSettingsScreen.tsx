import { useState } from 'react';
import { Alert, View } from 'react-native';

import { EmojiPicker } from '@/components/members/EmojiPicker';
import {
  Avatar,
  Button,
  Card,
  Divider,
  EmptyState,
  ListRow,
  Screen,
  SectionHeader,
  SwitchRow,
  Text,
  TextField,
} from '@/components/ui';
import { displayName } from '@/domain/members';
import type { Member } from '@/domain/types';
import { validateGroupName, validateMemberName } from '@/domain/validation';
import { useGroup } from '@/hooks/useGroup';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch } from '@/store/hooks';
import { addMember, deleteGroup, removeMember, renameMember, updateGroup } from '@/store/thunks';
import { useTheme } from '@/theme/ThemeProvider';
import { shareGroupCsv } from '@/utils/exportGroup';
import { useHaptics } from '@/utils/haptics';
import { describeNameError } from '@/utils/messages';

export function GroupSettingsScreen({ route, navigation }: RootStackScreenProps<'GroupSettings'>) {
  const { groupId } = route.params;
  const { colors, spacing } = useTheme();
  const dispatch = useAppDispatch();
  const haptics = useHaptics();
  const { group, members, expenses, settlements } = useGroup(groupId);

  const [name, setName] = useState(group?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [newMember, setNewMember] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  if (!group) {
    return <EmptyState emoji="🫥" title="Group not found" message="It may have been deleted." />;
  }

  const saveName = () => {
    const error = validateGroupName(name);
    if (error) {
      setNameError(describeNameError(error, 'group'));
      return;
    }
    setNameError(null);
    if (name.trim() !== group.name) dispatch(updateGroup({ id: groupId, changes: { name } }));
  };

  const add = async () => {
    const error = validateMemberName(newMember, members.map((member) => member.name));
    if (error) {
      setMemberError(describeNameError(error, 'member'));
      return;
    }
    await dispatch(addMember({ groupId, name: newMember }));
    setNewMember('');
    setMemberError(null);
    haptics.success();
  };

  const remove = (member: Member) =>
    Alert.alert(`Remove ${member.name}?`, 'They will no longer appear in this group.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const result = await dispatch(removeMember(member.id));
          if (removeMember.rejected.match(result)) {
            Alert.alert(
              "Can't remove yet",
              result.payload ??
                'This person is part of expenses or payments. Delete or edit those first.',
            );
          } else {
            setEditingId(null);
          }
        },
      },
    ]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const shared = await shareGroupCsv(group, members, expenses, settlements);
      if (!shared) Alert.alert('Sharing unavailable', 'This device does not support the share sheet.');
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = () => {
    haptics.warning();
    Alert.alert(
      `Delete ${group.name}?`,
      `This permanently deletes ${expenses.length} expenses and ${settlements.length} payments. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete group',
          style: 'destructive',
          onPress: async () => {
            await dispatch(deleteGroup(groupId));
            navigation.popToTop();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        onBlur={saveName}
        onSubmitEditing={saveName}
        returnKeyType="done"
        error={nameError}
      />
      <EmojiPicker
        value={group.emoji}
        onChange={(emoji) => dispatch(updateGroup({ id: groupId, changes: { emoji } }))}
      />

      <Card padded={false}>
        <SwitchRow
          title="Simplify debts"
          description="Suggest the fewest possible payments to settle everyone up."
          value={group.simplifyDebts}
          onValueChange={(simplifyDebts) => dispatch(updateGroup({ id: groupId, changes: { simplifyDebts } }))}
        />
        <Divider inset={spacing.lg} />
        <SwitchRow
          title="Archived"
          description="Hide this group from the main list and activity feed."
          value={group.archived}
          onValueChange={(archived) => dispatch(updateGroup({ id: groupId, changes: { archived } }))}
        />
      </Card>

      <View>
        <SectionHeader title={`People · ${members.length}`} />
        <Card padded={false}>
          {members.map((member, index) => (
            <View key={member.id}>
              {index > 0 ? <Divider inset={64} /> : null}
              {editingId === member.id ? (
                <MemberEditor
                  member={member}
                  otherNames={members.filter((m) => m.id !== member.id).map((m) => m.name)}
                  onSave={async (next) => {
                    await dispatch(renameMember({ id: member.id, name: next }));
                    setEditingId(null);
                  }}
                  onRemove={member.isSelf ? undefined : () => remove(member)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <ListRow
                  title={member.isSelf ? `${member.name} (you)` : member.name}
                  leading={<Avatar name={member.name} color={member.color} size={36} />}
                  onPress={() => setEditingId(member.id)}
                  accessibilityLabel={`Edit ${displayName(member)}`}
                />
              )}
            </View>
          ))}
        </Card>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <TextField
              placeholder="Add a person"
              value={newMember}
              onChangeText={(text) => {
                setNewMember(text);
                setMemberError(null);
              }}
              onSubmitEditing={add}
              autoCapitalize="words"
              error={memberError}
            />
          </View>
          <Button title="Add" variant="secondary" onPress={add} disabled={!newMember.trim()} />
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Data" />
        <Button
          title="Export as CSV"
          variant="secondary"
          icon="share-outline"
          onPress={exportCsv}
          loading={exporting}
          disabled={expenses.length === 0 && settlements.length === 0}
        />
        <Button title="Delete group" variant="danger" icon="trash-outline" onPress={confirmDelete} />
        <Text variant="caption" tone="muted" align="center" style={{ color: colors.textMuted }}>
          Currency: {group.currency} · created {new Date(group.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </Screen>
  );
}

function MemberEditor({
  member,
  otherNames,
  onSave,
  onRemove,
  onCancel,
}: {
  member: Member;
  otherNames: string[];
  onSave: (name: string) => void;
  onRemove?: () => void;
  onCancel: () => void;
}) {
  const { spacing } = useTheme();
  const [value, setValue] = useState(member.name);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const problem = validateMemberName(value, otherNames);
    if (problem) {
      setError(describeNameError(problem, 'member'));
      return;
    }
    onSave(value);
  };

  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <TextField
        label={member.isSelf ? 'Your name in this group' : 'Name'}
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setError(null);
        }}
        autoFocus
        onSubmitEditing={save}
        error={error}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button title="Save" compact onPress={save} />
        <Button title="Cancel" compact variant="secondary" onPress={onCancel} />
        <View style={{ flex: 1 }} />
        {onRemove ? <Button title="Remove" compact variant="danger" onPress={onRemove} /> : null}
      </View>
    </View>
  );
}
