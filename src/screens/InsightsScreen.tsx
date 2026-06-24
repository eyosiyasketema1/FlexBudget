import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Sparkles, Gauge, Scale } from 'lucide-react-native';

import MonthBanner from '@/components/MonthBanner';
import Card from '@/components/Card';
import ScreenTitle from '@/components/ScreenTitle';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { useMonth } from '@/data/useMonth';
import { useAllMonthSnapshots } from '@/data/useHistory';
import { computeRunway, computeBenchmark } from '@/calc/engine';
import { formatCents } from '@/utils/money';
import type { Bucket } from '@/calc/types';

const bucketLabel: Record<Bucket, string> = {
  needs: 'Needs',
  wants: 'Wants',
  savings: 'Savings',
};

function Meter({ percent, target, good }: { percent: number; target: number; good: boolean }) {
  const width = Math.min(percent, 100);
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden' }}>
        <View style={{ width: `${width}%`, height: 8, backgroundColor: good ? colors.positive : colors.negative }} />
      </View>
      {/* target marker */}
      <View style={{ position: 'relative', height: 0 }}>
        <View style={{ position: 'absolute', left: `${Math.min(target, 100)}%`, top: -10, width: 2, height: 10, backgroundColor: colors.text }} />
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const { activeMonth } = useActiveMonth();
  const { snapshot } = useMonth(activeMonth);
  const { snapshots } = useAllMonthSnapshots();

  const runway = computeRunway(snapshots);
  const benchmark = snapshot ? computeBenchmark(snapshot) : null;

  const runwayText =
    runway.runwayMonths === Infinity
      ? '∞'
      : runway.monthsAnalyzed === 0
        ? '—'
        : `${runway.runwayMonths.toFixed(1)} months`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MonthBanner />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <ScreenTitle title="Insights" icon={Sparkles} />

        {/* Predictive runway */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Gauge size={15} color={colors.textFaint} strokeWidth={2} />
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '600' }}>
              PREDICTIVE RUNWAY
            </Text>
          </View>
          <Text style={{ color: colors.primary, fontSize: font.size.xxl, fontWeight: '700', letterSpacing: font.tracking.tight }}>{runwayText}</Text>
          {runway.monthsAnalyzed > 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              Based on {runway.monthsAnalyzed} month{runway.monthsAnalyzed > 1 ? 's' : ''} of history,
              your savings of {formatCents(runway.savingsCents)} can cover an average
              spend of {formatCents(runway.avgMonthlySpendCents)}/month.
            </Text>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              Track a couple of months to unlock a runway estimate.
            </Text>
          )}
        </Card>

        {/* 50/30/20 benchmark */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md }}>
          <Scale size={15} color={colors.textFaint} strokeWidth={2} />
          <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '700', textTransform: 'uppercase' }}>
            50 / 30 / 20 benchmark
          </Text>
        </View>
        {benchmark && benchmark.totalIncomeCents > 0 ? (
          <Card>
            {benchmark.buckets.map((b) => (
              <View key={b.bucket} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>
                    {bucketLabel[b.bucket]}{' '}
                    <Text style={{ color: colors.textMuted, fontWeight: '400' }}>
                      target {b.targetPercent}%
                    </Text>
                  </Text>
                  <Text style={{ color: b.withinTarget ? colors.positive : colors.negative, fontWeight: '600' }}>
                    {b.actualPercent.toFixed(0)}%
                  </Text>
                </View>
                <Meter percent={b.actualPercent} target={b.targetPercent} good={b.withinTarget} />
                <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: 8 }}>
                  {formatCents(b.actualCents)} of {formatCents(b.targetCents)} target
                </Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              Savings rate this month:{' '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {benchmark.savingsRatePercent.toFixed(0)}%
              </Text>
            </Text>
            {benchmark.untaggedActualCents > 0 && (
              <Text style={{ color: colors.warning, fontSize: font.size.xs, marginTop: 4 }}>
                {formatCents(benchmark.untaggedActualCents)} of spending is in untagged categories —
                tag categories as Needs/Wants/Savings for a complete picture.
              </Text>
            )}
          </Card>
        ) : (
          <Text style={{ color: colors.textMuted }}>Add income and tagged categories to see the benchmark.</Text>
        )}

        <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: spacing.lg }}>
          The vertical marker on each bar shows the 50/30/20 target. Needs & Wants are good under target; Savings is good above.
        </Text>
      </ScrollView>
    </View>
  );
}
