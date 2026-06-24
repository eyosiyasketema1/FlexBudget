import React from 'react';
import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, spacing, font } from '@/theme/theme';

// Large screen heading with an optional leading icon and trailing action.
export default function ScreenTitle({
  title,
  icon: I,
  action,
}: {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {I ? <I size={22} color={colors.text} strokeWidth={2} /> : null}
        <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: '700', letterSpacing: font.tracking.tight }}>
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}
