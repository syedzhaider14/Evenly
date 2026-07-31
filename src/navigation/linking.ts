import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './types';

/**
 * Deep links, e.g. `evenly://group/<id>` opens a group and `evenly://new-group` starts the
 * create flow. Handy for widgets, notifications and QA.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['evenly://'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Groups: 'groups',
          Activity: 'activity',
          Settings: 'settings',
        },
      },
      CreateGroup: 'new-group',
      GroupDetail: 'group/:groupId',
      GroupSettings: 'group/:groupId/settings',
      ExpenseDetail: 'expense/:expenseId',
    },
  },
};
