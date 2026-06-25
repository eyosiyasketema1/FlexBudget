import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Gauge } from 'lucide-react-native';

import MonthDropdown from '@/components/MonthDropdown';
import Card from '@/components/Card';
import SectionHeader from '@/components/SectionHeader';
import VarianceBadge from '@/components/VarianceBadge';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { useMonth } from '@/data/useMonth';
import { useAllMonthSnapshots } from '@/data/useHistory';
import { loadMonthSnapshot } from '@/data/snapshot';
import { computeRunway, computeBenchmark, computeTotals, monthDelta, classifyVariance } from '@/calc/engine';
import { formatCents, formatSignedCents } from '@/utils/money';
import { prevMonth, formatMonthLabel } from '@/utils/date';
import type { Bucket, MonthTotals, MonthDelta } from '@/calc/types';

const bucketLabel: Record<Bucket, string> = { needs: 'Needs', wants: 'Wants', savings: 'Savings' };

function Meter({ percent, target, good }: { percent: number; target: number; good: boolean }) {
  const width = Math.min(percent, 100);
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden' }}>
        <View style={{ width: `${width}%`, height: 8, backgroundColor: good ? colors.positive : colors.negative }} />
      </View>
      <View style={{ position: 'relative', height: 0 }}>
        <View style={{ position: 'absolute', left: `${Math.min(target, 100)}%`, top: -10, width: 2, height: 10, backgroundColor: colors.text }} />
      </View>
    </View>
  );
}

function DeltaRow({ label, cents, goodWhenPos = true }: { label: string; cents: number; goodWhenPos?: boolean }) {
  const good = goodWhenPos ? cents >= 0 : cents <= 0;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <Text style={{ color: good ? colors.positive : colors.negative, fontWeight: '600' }}>{formatSignedCents(cents)}</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const { activeMonth } = useActiveMonth();
  const { snapshot, totals, rollups } = useMonth(activeMonth);
  const { snapshots } = useAllMonthSnapshots();

  const runway = computeRunway(snapshots);
  const benchmark = snapshot ? computeBenchmark(snapshot) : null;

  // Prior-month comparison
  const priorKey = prevMonth(activeMonth);
  const [priorTotals, setPriorTotals] = useState<MonthTotals | null>(null);
  const [delta, setDelta] = useState<MonthDelta | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [cur, prior] = await Promise.all([loadMonthSnapshot(activeMonth), loadMonthSnapshot(priorKey)]);
      if (!alive) return;
      const hasPrior = prior.income.length > 0 || prior.categories.length > 0;
      setPriorTotals(hasPrior ? computeTotals(prior) : null);
      setDelta(hasPrior ? monthDelta(cur, prior) : null);
    })();
    return () => { alive = false; };
  }, [activeMonth, priorKey, snapshots.length]);

  const runwayText =
    runway.runwayMonths === Infinity ? '∞' : runway.monthsAnalyzed === 0 ? '—' : `${runway.runwayMonths.toFixed(1)} months`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MonthDropdown safeTop={false} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {/* Budget vs Actual */}
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
        {totals && rollups.length > 0 && (
          <Card style={{ marginBottom: spacing.lg }}>
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

        {/* Month vs prior */}
        <SectionHeader title={`${formatMonthLabel(activeMonth)} vs ${formatMonthLabel(priorKey)}`} />
        {delta && priorTotals ? (
          <Card style={{ marginBottom: spacing.lg }}>
            <DeltaRow label="Income" cents={delta.totalIncomeDelta} />
            <DeltaRow label="Budgeted" cents={delta.totalBudgetedDelta} goodWhenPos={false} />
            <DeltaRow label="Actual spent" cents={delta.totalActualDelta} goodWhenPos={false} />
            <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: spacing.sm }} />
            <DeltaRow label="Net saved" cents={delta.actualNetSavedDelta} />
          </Card>
        ) : (
          <Text style={{ color: colors.textFaint, marginBottom: spacing.lg }}>No prior month data to compare against yet.</Text>
        )}

        {/* Predictive runway */}
        <SectionHeader title="Predictive runway" />
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Gauge size={15} color={colors.textFaint} strokeWidth={2} />
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '600' }}>
              EMERGENCY RUNWAY
            </Text>
          </View>
          <Text style={{ color: colors.primary, fontSize: font.size.xxl, fontWeight: '800', letterSpacing: font.tracking.tight }}>{runwayText}</Text>
          {runway.monthsAnalyzed > 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              Based on {runway.monthsAnalyzed} month{runway.monthsAnalyzed > 1 ? 's' : ''} of history,
              your savings of {formatCents(runway.savingsCents)} can cover an average spend of {formatCents(runway.avgMonthlySpendCents)}/month.
            </Text>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Track a couple of months to unlock a runway estimate.</Text>
          )}
        </Card>

        {/* 50/30/20 benchmark */}
        <SectionHeader title="50 / 30 / 20 benchmark" />
        {benchmark && benchmark.totalIncomeCents > 0 ? (
          <Card>
            {benchmark.buckets.map((b) => (
              <View key={b.bucket} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>
                    {bucketLabel[b.bucket]} <Text style={{ color: colors.textMuted, fontWeight: '400' }}>target {b.targetPercent}%</Text>
                  </Text>
                  <Text style={{ color: b.withinTarget ? colors.positive : colors.negative, fontWeight: '600' }}>{b.actualPercent.toFixed(0)}%</Text>
                </View>
                <Meter percent={b.actualPercent} target={b.targetPercent} good={b.withinTarget} />
                <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: 8 }}>
                  {formatCents(b.actualCents)} of {formatCents(b.targetCents)} target
                </Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: spacing.sm }} />
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              Savings rate this month: <Text style={{ color: colors.text, fontWeight: '700' }}>{benchmark.savingsRatePercent.toFixed(0)}%</Text>
            </Text>
            {benchmark.untaggedActualCents > 0 && (
              <Text style={{ color: colors.warning, fontSize: font.size.xs, marginTop: 4 }}>
                {formatCents(benchmark.untaggedActualCents)} of spending is in untagged categories — tag categories as Needs/Wants/Savings for a complete picture.
              </Text>
            )}
          </Card>
        ) : (
          <Text style={{ color: colors.textFaint }}>Add income and tagged categories to see the benchmark.</Text>
        )}
      </ScrollView>
    </View>
  );
}
