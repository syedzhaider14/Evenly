import { SectionList, View } from 'react-native';

import { Divider, EmptyState, ListRow, SectionHeader, Text } from '@/components/ui';
import type { ActivityItem } from '@/domain/activity';
import { categoryOf } from '@/domain/categories';
import { displayName } from '@/domain/members';
import { formatMoney } from '@/domain/money';
import type { Group, Member } from '@/domain/types';
import type { TabScreenProps } from '@/navigation/types';
import { useAppSelector } from '@/store/hooks';
import { groupSelectors, memberSelectors, selectActivityFeed } from '@/store/selectors';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDayKey } from '@/utils/format';

function describe(
  item: ActivityItem,
  members: Readonly<Record<string, Member | undefined>>,
  group: Group | undefined,
) {
  const currency = group?.currency ?? 'USD';
  const where = group ? `${group.emoji} ${group.name}` : '';

  if (item.kind === 'expense') {
    const { expense } = item;
    const payer =
      expense.payers.length === 1 && expense.payers[0]
        ? displayName(members[expense.payers[0].memberId])
        : `${expense.payers.length} people`;
    return {
      icon: categoryOf(expense.category).emoji,
      title: expense.description,
      subtitle: `${payer} paid · ${where}`,
      amount: formatMoney(expense.amount, currency),
    };
  }

  const { settlement } = item;
  return {
    icon: '💸',
    title: `${displayName(members[settlement.from])} paid ${displayName(members[settlement.to])}`,
    subtitle: where,
    amount: formatMoney(settlement.amount, currency),
  };
}

export function ActivityScreen({ navigation }: TabScreenProps<'Activity'>) {
  const { colors, spacing } = useTheme();
  const sections = useAppSelector(selectActivityFeed);
  const groups = useAppSelector(groupSelectors.selectEntities);
  const members = useAppSelector(memberSelectors.selectEntities);

  return (
    <SectionList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxxl, flexGrow: 1 }}
      sections={sections.map((section) => ({ title: section.day, data: section.items }))}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => <SectionHeader title={formatDayKey(section.title)} />}
      ItemSeparatorComponent={() => <Divider inset={68} />}
      renderItem={({ item }) => {
        const row = describe(item, members, groups[item.groupId]);
        return (
          <ListRow
            title={row.title}
            subtitle={row.subtitle}
            leading={
              <View style={{ width: 36, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, lineHeight: 28 }}>{row.icon}</Text>
              </View>
            }
            trailing={
              <Text variant="label" numeric>
                {row.amount}
              </Text>
            }
            showChevron={false}
            onPress={() =>
              item.kind === 'expense'
                ? navigation.navigate('ExpenseDetail', { expenseId: item.id })
                : navigation.navigate('GroupDetail', { groupId: item.groupId })
            }
          />
        );
      }}
      ListEmptyComponent={
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            emoji="🗒️"
            title="Nothing here yet"
            message="Expenses and payments from all your groups will appear here."
          />
        </View>
      }
    />
  );
}
