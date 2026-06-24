import React from 'react';
import { View, Text } from 'react-native';
import { Wallet, Target, Receipt, PiggyBank } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import Card from './Card';
import { colors, spacing, font, radius } from '@/theme/theme';
import { formatCents } from '@/utils/money';
import type { MonthTotals } from '@/calc/types';

function Stat({ icon: I, label, cents, accent }: { icon: LucideIcon; label: string; cents: number; accent?: string }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <I size={14} color={colors.textFaint} strokeWidth={2} />
        <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{label}</Text>
      </View>
      <Text style={{ color: accent ?? colors.text, fontSize: font.size.lg, fontWeight: '700', letterSpacing: font.tracking.tight }}>
        {formatCents(cents)}
      </Text>
    </View>
  );
}

export default function TotalsHeader({ totals }: { totals: MonthTotals }) {
  const positive = totals.actualNetSavedCents >= 0;
  const accent = positive ? colors.positive : colors.negative;

  // Share of income already spent (clamped for the meter).
  const spentPct =
    totals.totalIncomeCents > 0
      ? Math.min((totals.totalActualCents / totals.totalIncomeCents) * 100, 100)
      : 0;

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <PiggyBank size={15} color={colors.textFaint} strokeWidth={2} />
        <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '600' }}>
          NET SAVED
        </Text>
      </View>
      <Text style={{ color: accent, fontSize: font.size.display, fontWeight: '700', letterSpacing: font.tracking.tight, marginBottom: spacing.md }}>
        {formatCents(totals.actualNetSavedCents, true)}
      </Text>

      {/* Spend-of-income meter */}
      <View style={{ height: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden', marginBottom: 6 }}>
        <View style={{ width: `${spentPct}%`, height: 6, borderRadius: radius.pill, backgroundColor: spentPct >= 100 ? colors.negative : colors.primary }} />
      </View>
      <Text style={{ color: colors.textFaint, fontSize: font.size.xs, marginBottom: spacing.lg }}>
        {spentPct.toFixed(0)}% of income spent
      </Text>

      <View style={{ height: 1, backgroundColor: colors.hairline, marginBottom: spacing.lg }} />

      <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
        <Stat icon={Wallet} label="Income" cents={totals.totalIncomeCents} />
        <Stat icon={Target} label="Budgeted" cents={totals.totalBudgetedCents} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Stat icon={Receipt} label="Actual spent" cents={totals.totalActualCents} />
        <Stat
          icon={PiggyBank}
          label="Expected savings"
          cents={totals.expectedSavingsCents}
          accent={totals.expectedSavingsCents >= 0 ? colors.text : colors.negative}
        />
      </View>
    </Card>
  );
}
