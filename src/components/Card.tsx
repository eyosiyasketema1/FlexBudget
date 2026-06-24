import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, spacing, elevation } from '@/theme/theme';

export default function Card({
  children,
  style,
  raised = true,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  raised?: boolean;
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
        raised && elevation.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
