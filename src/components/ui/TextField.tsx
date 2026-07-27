import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  /** Rendered at the leading edge of the input, e.g. a currency code. */
  prefix?: string;
  large?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, prefix, large = false, onFocus, onBlur, ...inputProps },
  ref,
) {
  const { colors, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.negative : focused ? colors.focus : colors.border;

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.row,
          {
            borderColor,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {prefix ? (
          <Text variant={large ? 'title' : 'body'} tone="muted" style={{ marginRight: spacing.sm }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          accessibilityLabel={label}
          accessibilityHint={hint}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            large ? typography.title : typography.body,
            styles.input,
            { color: colors.text, paddingVertical: large ? spacing.md : spacing.sm + 2 },
          ]}
          {...inputProps}
        />
      </View>
      {error ? (
        <Text variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 44,
  },
  input: {
    flex: 1,
  },
});
