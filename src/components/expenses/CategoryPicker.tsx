import { View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '@/domain/categories';
import { useTheme } from '@/theme/ThemeProvider';

export interface CategoryPickerProps {
  value: CategoryId;
  onChange: (category: CategoryId) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="muted">
        Category
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {CATEGORY_IDS.map((id) => (
          <Chip
            key={id}
            leading={CATEGORIES[id].emoji}
            label={CATEGORIES[id].label}
            selected={id === value}
            onPress={() => onChange(id)}
          />
        ))}
      </View>
    </View>
  );
}
