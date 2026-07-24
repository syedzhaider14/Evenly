import { useAppSelector } from '@/store/hooks';
import {
  groupSelectors,
  selectGroupExpenses,
  selectGroupMembers,
  selectGroupSettlements,
} from '@/store/selectors';

/** Everything a group screen typically needs, read with memoised selectors. */
export function useGroup(groupId: string) {
  const group = useAppSelector((state) => groupSelectors.selectById(state, groupId));
  const members = useAppSelector((state) => selectGroupMembers(state, groupId));
  const expenses = useAppSelector((state) => selectGroupExpenses(state, groupId));
  const settlements = useAppSelector((state) => selectGroupSettlements(state, groupId));
  return { group, members, expenses, settlements };
}
