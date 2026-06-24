import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing, font } from '@/theme/theme';

// Consistent section title row: small uppercase label on the left, optional
// action (button/icon) on the right.
export default function SectionHeader({
  title,
  action,
  style,
}: {
  title: string;
  action?: React.ReactNode;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
          minHeight: 38,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.textMuted,
          fontSize: font.size.xs,
          fontWeight: '700',
          letterSpacing: font.tracking.caps,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {action}
    </View>
  );
}
