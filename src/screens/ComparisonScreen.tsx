import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ArrowLeftRight } from 'lucide-react-native';

import MonthBanner from '@/components/MonthBanner';
import Card from '@/components/Card';
import VarianceBadge from '@/components/VarianceBadge';
import SectionHeader from '@/components/SectionHeader';
import ScreenTitle from '@/components/ScreenTitle';
import { colors, spacing, font, layout } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { useMonth } from '@/data/useMonth';
import { loadMonthSnapshot } from '@/data/snapshot';
import { computeTotals, monthDelta, classifyVariance } from '@/calc/engine';
import { formatCents, formatSignedCents } from '@/utils/money';
import { prevMonth, formatMonthLabel } from '@/utils/date';
import type { MonthTotals, MonthDelta } from '@/calc/types';

// Section 4 — the Mathematical Comparison Matrix.
// Panel A: Budgeted caps vs actual outlays (this month), color-coded per category.
// Panel B: This month vs prior month headline figures.

function DeltaRow({ label, cents }: { label: string; cents: number }) {
  const positiveIsGood = !label.toLowerCase().includes('spent') && !label.toLowerCase().includes('budgeted');
  const good = positiveIsGood ? cents >= 0 : cents <= 0;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <Text style={{ color: good ? colors.positive : colors.negative, fontWeight: '600' }}>
        {formatSignedCents(cents)}
      </Text>
    </View>
  );
}

export default function ComparisonScreen() {
  const { activeMonth } = useActiveMonth();
  const { totals, rollups } = useMonth(activeMonth);

  const [priorTotals, setPriorTotals] = useState<MonthTotals | null>(null);
  const [delta, setDelta] = useState<MonthDelta | null>(null);
  const priorKey = prevMonth(activeMonth);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [cur, prior] = await Promise.all([
        loadMonthSnapshot(activeMonth),
        loadMonthSnapshot(priorKey),
      ]);
      if (!alive) return;
      const pt = computeTotals(prior);
      const hasPrior =
        prior.income.length > 0 || prior.categories.length > 0;
      setPriorTotals(hasPrior ? pt : null);
      setDelta(hasPrior ? monthDelta(cur, prior) : null);
    })();
    return () => {
      alive = false;
    };
  }, [activeMonth, priorKey]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MonthBanner />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: layout.tabBarSpace }}>
        <ScreenTitle title="Compare" icon={ArrowLeftRight} />

        {/* Panel A: Budget vs Actual by category */}
        <SectionHeader title={`Budgeted vs Actual — ${formatMonthLabel(activeMonth)}`} />
        {rollups.length === 0 && <Text style={{ color: colors.textFaint, marginBottom: spacing.md }}>No categories to compare.</Text>}
        {rollups.map((cat) => (
          <Card key={cat.id} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{cat.name}</Text>
              <VarianceBadge state={cat.state} varianceCents={cat.varianceCents} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              Budget {formatCents(cat.budgetedCents)}  ·  Actual {formatCents(cat.actualCents)}
            </Text>
          </Card>
        ))}

        {totals && (
          <Card style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>All categories</Text>
              <VarianceBadge
                state={classifyVariance(totals.totalBudgetedCents, totals.totalActualCents)}
                varianceCents={totals.totalBudgetedCents - totals.totalActualCents}
              />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginTop: 4 }}>
              Budget {formatCents(totals.totalBudgetedCents)}  ·  Actual {formatCents(totals.totalActualCents)}
            </Text>
          </Card>
        )}

        {/* Panel B: This month vs prior */}
        <View style={{ marginTop: spacing.md }}>
          <SectionHeader title={`${formatMonthLabel(activeMonth)} vs ${formatMonthLabel(priorKey)}`} />
        </View>
        {delta && priorTotals ? (
          <Card>
            <DeltaRow label="Income" cents={delta.totalIncomeDelta} />
            <DeltaRow label="Budgeted" cents={delta.totalBudgetedDelta} />
            <DeltaRow label="Actual spent" cents={delta.totalActualDelta} />
            <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: spacing.sm }} />
            <DeltaRow label="Net saved" cents={delta.actualNetSavedDelta} />
          </Card>
        ) : (
          <Text style={{ color: colors.textMuted }}>
            No prior month data to compare against yet.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
