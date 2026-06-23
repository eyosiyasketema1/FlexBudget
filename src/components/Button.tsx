import React from 'react';
import { Pressable, Text, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, font, spacing } from '@/theme/theme';

type Variant = 'primary' | 'secondary' | 'danger';

const bg: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.surfaceAlt,
  danger: 'rgba(248,113,113,0.15)',
};
const fg: Record<Variant, string> = {
  primary: '#06122B',
  secondary: colors.text,
  danger: colors.negative,
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        {
          backgroundColor: bg[variant],
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: fg[variant], fontWeight: '600', fontSize: font.size.md }}>
        {title}
      </Text>
    </Pressable>
  );
}
