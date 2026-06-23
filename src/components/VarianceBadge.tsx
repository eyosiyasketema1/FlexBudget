import React from 'react';
import { View, Text } from 'react-native';
import { colors, radius, font } from '@/theme/theme';
import type { VarianceState } from '@/calc/types';
import { formatSignedCents } from '@/utils/money';

const palette: Record<VarianceState, { bg: string; fg: string; label: string }> = {
  over: { bg: 'rgba(248,113,113,0.15)', fg: colors.negative, label: 'Over' },
  under: { bg: 'rgba(52,211,153,0.15)', fg: colors.positive, label: 'Saved' },
  on_track: { bg: 'rgba(154,164,178,0.15)', fg: colors.textMuted, label: 'On track' },
};

export default function VarianceBadge({
  state,
  varianceCents,
}: {
  state: VarianceState;
  varianceCents: number;
}) {
  const p = palette[state];
  return (
    <View
      style={{
        backgroundColor: p.bg,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: p.fg, fontSize: font.size.xs, fontWeight: '600' }}>
        {p.label} {formatSignedCents(varianceCents)}
      </Text>
    </View>
  );
}
