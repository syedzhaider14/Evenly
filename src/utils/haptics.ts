import * as Haptics from 'expo-haptics';

import { useAppSelector } from '@/store/hooks';

/** Haptic feedback that respects the user's setting and never throws on unsupported devices. */
export function useHaptics() {
  const enabled = useAppSelector((state) => state.settings.hapticsEnabled);

  return {
    success: () => {
      if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    warning: () => {
      if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    },
    selection: () => {
      if (enabled) Haptics.selectionAsync().catch(() => {});
    },
  };
}
