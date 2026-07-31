import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { GroupCard } from '@/components/groups/GroupCard';
import { TotalsBanner } from '@/components/groups/TotalsBanner';
import { Button, EmptyState, HeaderButton, SectionHeader } from '@/components/ui';
import type { TabScreenProps } from '@/navigation/types';
import { useAppSelector } from '@/store/hooks';
import { selectGroupOverviews, selectTotalsByCurrency } from '@/store/selectors';
import { useTheme } from '@/theme/ThemeProvider';

export function GroupsScreen({ navigation }: TabScreenProps<'Groups'>) {
  const { colors, spacing } = useTheme();
  const overviews = useAppSelector(selectGroupOverviews);
  const totals = useAppSelector(selectTotalsByCurrency);
  const [showArchived, setShowArchived] = useState(false);

  const active = useMemo(() => overviews.filter((overview) => !overview.archived), [overviews]);
  const archived = useMemo(() => overviews.filter((overview) => overview.archived), [overviews]);
  const data = showArchived ? [...active, ...archived] : active;

  const createGroup = useCallback(() => navigation.navigate('CreateGroup'), [navigation]);
  const openGroup = useCallback(
    (groupId: string) => navigation.navigate('GroupDetail', { groupId }),
    [navigation],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ marginRight: spacing.lg }}>
          <HeaderButton icon="add" accessibilityLabel="Create group" onPress={createGroup} />
        </View>
      ),
    });
  }, [navigation, createGroup, spacing.lg]);

  if (overviews.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <EmptyState
          emoji="👋"
          title="Split costs without the awkwardness"
          message="Create a group for a trip, a flat or a night out, add the people involved and start logging expenses."
          actionLabel="Create your first group"
          onAction={createGroup}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.groupId}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <TotalsBanner totals={totals} />
          <SectionHeader title="Your groups" />
        </View>
      }
      renderItem={({ item }) => <GroupCard overview={item} onPress={openGroup} />}
      ListFooterComponent={
        archived.length > 0 ? (
          <Button
            variant="ghost"
            title={showArchived ? 'Hide archived groups' : `Show ${archived.length} archived`}
            onPress={() => setShowArchived((value) => !value)}
          />
        ) : null
      }
    />
  );
}
