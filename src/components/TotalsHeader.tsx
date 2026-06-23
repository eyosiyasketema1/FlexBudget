import React from 'react';
import { View, Text } from 'react-native';
import Card from './Card';
import { colors, spacing, font } from '@/theme/theme';
import { formatCents } from '@/utils/money';
import type { MonthTotals } from '@/calc/types';

function Stat({ label, cents, accent }: { label: string; cents: number; accent?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginBottom: 2 }}>
        {label}
      </Text>
      <Text style={{ color: accent ?? colors.text, fontSize: font.size.md, fontWeight: '700' }}>
        {formatCents(cents)}
      </Text>
    </View>
  );
}

export default function TotalsHeader({ totals }: { totals: MonthTotals }) {
  const savedAccent =
    totals.actualNetSavedCents >= 0 ? colors.positive : colors.negative;
  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>NET SAVED (ACTUAL)</Text>
      <Text style={{ color: savedAccent, fontSize: font.size.xxl, fontWeight: '700', marginBottom: spacing.md }}>
        {formatCents(totals.actualNetSavedCents, true)}
      </Text>
      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        <Stat label="Income" cents={totals.totalIncomeCents} />
        <Stat label="Budgeted" cents={totals.totalBudgetedCents} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Stat label="Actual spent" cents={totals.totalActualCents} />
        <Stat
          label="Expected savings"
          cents={totals.expectedSavingsCents}
          accent={totals.expectedSavingsCents >= 0 ? colors.text : colors.negative}
        />
      </View>
    </Card>
  );
}
