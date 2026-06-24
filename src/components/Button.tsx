import React from 'react';
import { Pressable, Text, View, ViewStyle, StyleProp } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, font, spacing } from '@/theme/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const bg: Record<Variant, string> = {
  primary: colors.ink, // black pill CTA
  secondary: colors.surfaceAlt,
  ghost: 'transparent',
  danger: colors.negativeSoft,
};
const fg: Record<Variant, string> = {
  primary: colors.onInk,
  secondary: colors.text,
  ghost: colors.textMuted,
  danger: colors.negative,
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  icon: IconComp,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: LucideIcon;
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
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          borderRadius: radius.pill,
          paddingVertical: 16,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {IconComp ? <IconComp size={18} color={fg[variant]} strokeWidth={2} /> : null}
      <Text style={{ color: fg[variant], fontWeight: '600', fontSize: font.size.md }}>{title}</Text>
    </Pressable>
  );
}

// A compact circular icon button (used for + add actions, etc.).
export function IconButton({
  icon: IconComp,
  onPress,
  label,
  color = colors.primary,
  bg: background = colors.primarySoft,
  size = 38,
}: {
  icon: LucideIcon;
  onPress: () => void;
  label: string;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: radius.pill,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <IconComp size={size * 0.5} color={color} strokeWidth={2} />
    </Pressable>
  );
}
