import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { CurrencyPicker } from '@/components/members/CurrencyPicker';
import {
  Button,
  Card,
  Divider,
  Screen,
  SectionHeader,
  SegmentedControl,
  SwitchRow,
  Text,
  TextField,
} from '@/components/ui';
import type { ThemePreference } from '@/data/repositories';
import { validateMemberName } from '@/domain/validation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { eraseAllData, updateSettings } from '@/store/thunks';
import { useTheme } from '@/theme/ThemeProvider';
import { describeNameError } from '@/utils/messages';

const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: ThemePreference; label: string }[];

export function SettingsScreen() {
  const { spacing } = useTheme();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const [name, setName] = useState(settings.displayName);
  const [nameError, setNameError] = useState<string | null>(null);

  const saveName = () => {
    const error = validateMemberName(name, []);
    if (error) {
      setNameError(describeNameError(error, 'member'));
      return;
    }
    setNameError(null);
    if (name.trim() !== settings.displayName) dispatch(updateSettings({ displayName: name.trim() }));
  };

  const confirmErase = () =>
    Alert.alert(
      'Erase all data?',
      'Every group, expense and payment on this device will be deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase everything', style: 'destructive', onPress: () => dispatch(eraseAllData()) },
      ],
    );

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <TextField
          label="Your name"
          hint="Used when you create new groups. Inside a group you always appear as “You”."
          value={name}
          onChangeText={setName}
          onBlur={saveName}
          onSubmitEditing={saveName}
          autoCapitalize="words"
          error={nameError}
        />
        <CurrencyPicker
          label="Default currency for new groups"
          value={settings.defaultCurrency}
          onChange={(defaultCurrency) => dispatch(updateSettings({ defaultCurrency }))}
        />
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="muted">
            Appearance
          </Text>
          <SegmentedControl
            accessibilityLabel="Appearance"
            segments={THEMES}
            value={settings.theme}
            onChange={(theme) => dispatch(updateSettings({ theme }))}
          />
        </View>
      </View>

      <Card padded={false}>
        <SwitchRow
          title="Simplify debts in new groups"
          value={settings.simplifyByDefault}
          onValueChange={(simplifyByDefault) => dispatch(updateSettings({ simplifyByDefault }))}
        />
        <Divider inset={spacing.lg} />
        <SwitchRow
          title="Haptic feedback"
          value={settings.hapticsEnabled}
          onValueChange={(hapticsEnabled) => dispatch(updateSettings({ hapticsEnabled }))}
        />
      </Card>

      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Privacy" />
        <Text tone="muted">
          Evenly stores everything on this device in a local database. Nothing is uploaded, and no
          account is needed.
        </Text>
        <Button title="Erase all data" variant="danger" icon="trash-outline" onPress={confirmErase} />
      </View>

      <Text variant="caption" tone="muted" align="center">
        Evenly {Constants.expoConfig?.version ?? ''}
      </Text>
    </Screen>
  );
}
