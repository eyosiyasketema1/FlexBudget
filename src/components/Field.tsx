import React from 'react';
import { View, Text, TextInput, KeyboardTypeOptions } from 'react-native';
import { colors, radius, spacing, font } from '@/theme/theme';

export default function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.xs }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          color: colors.text,
          padding: spacing.md,
          fontSize: font.size.md,
        }}
      />
    </View>
  );
}
