import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ActivityScreen } from '@/screens/activity/ActivityScreen';
import { ExpenseDetailScreen } from '@/screens/expense/ExpenseDetailScreen';
import { ExpenseEditorScreen } from '@/screens/expense/ExpenseEditorScreen';
import { CreateGroupScreen } from '@/screens/group/CreateGroupScreen';
import { GroupDetailScreen } from '@/screens/group/GroupDetailScreen';
import { GroupSettingsScreen } from '@/screens/group/GroupSettingsScreen';
import { GroupsScreen } from '@/screens/groups/GroupsScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { SettleUpScreen } from '@/screens/settle/SettleUpScreen';
import { useTheme } from '@/theme/ThemeProvider';

import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, [focused: string, idle: string]> = {
  Groups: ['people', 'people-outline'],
  Activity: ['pulse', 'pulse-outline'],
  Settings: ['settings', 'settings-outline'],
};

function Tabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          const [active, idle] = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={(focused ? active : idle) as keyof typeof Ionicons.glyphMap}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: '' }} />
      <Stack.Screen
        name="GroupSettings"
        component={GroupSettingsScreen}
        options={{ title: 'Group settings' }}
      />
      <Stack.Screen
        name="ExpenseDetail"
        component={ExpenseDetailScreen}
        options={{ title: 'Expense' }}
      />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen
          name="CreateGroup"
          component={CreateGroupScreen}
          options={{ title: 'New group' }}
        />
        <Stack.Screen
          name="ExpenseEditor"
          component={ExpenseEditorScreen}
          options={{ title: 'Add expense' }}
        />
        <Stack.Screen name="SettleUp" component={SettleUpScreen} options={{ title: 'Record a payment' }} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
