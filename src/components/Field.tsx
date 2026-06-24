import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardTypeOptions } from 'react-native';
import { colors, radius, spacing, font } from '@/theme/theme';

export default function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  prefix,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: font.size.xs,
          fontWeight: '600',
          letterSpacing: font.tracking.caps,
          textTransform: 'uppercase',
          marginBottom: spacing.sm,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: focused ? colors.primary : colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
        }}
      >
        {prefix ? (
          <Text style={{ color: colors.textFaint, fontSize: font.size.md, marginRight: 6 }}>{prefix}</Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            color: colors.text,
            paddingVertical: 14,
            fontSize: font.size.md,
          }}
        />
      </View>
    </View>
  );
}
