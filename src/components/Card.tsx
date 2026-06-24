import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, spacing } from '@/theme/theme';

// Flat card — hairline border only, no shadow. On white we separate with
// borders and whitespace, not elevation.
export default function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  raised?: boolean; // kept for API compatibility; intentionally ignored (flat)
  padded?: boolean;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: padded ? spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
