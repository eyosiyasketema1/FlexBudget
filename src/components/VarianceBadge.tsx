import React from 'react';
import { View, Text } from 'react-native';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { colors, radius, font } from '@/theme/theme';
import type { VarianceState } from '@/calc/types';
import { formatCents } from '@/utils/money';

const palette = {
  over: { bg: colors.negativeSoft, fg: colors.negative, label: 'Over', Icon: TrendingUp },
  under: { bg: colors.positiveSoft, fg: colors.positive, label: 'Saved', Icon: TrendingDown },
  on_track: { bg: colors.surfaceAlt, fg: colors.textMuted, label: 'On track', Icon: Minus },
} as const;

export default function VarianceBadge({
  state,
  varianceCents,
  compact = false,
}: {
  state: VarianceState;
  varianceCents: number;
  compact?: boolean;
}) {
  const p = palette[state];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: p.bg,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <p.Icon size={13} color={p.fg} strokeWidth={2.25} />
      <Text style={{ color: p.fg, fontSize: font.size.xs, fontWeight: '600' }}>
        {compact ? '' : `${p.label} `}
        {formatCents(Math.abs(varianceCents))}
      </Text>
    </View>
  );
}
