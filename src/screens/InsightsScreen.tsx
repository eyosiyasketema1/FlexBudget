import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Gauge, Wallet, PieChart as PieIcon, Target, TrendingUp, AlertTriangle } from 'lucide-react-native';

import MonthDropdown from '@/components/MonthDropdown';
import Card from '@/components/Card';
import SectionHeader from '@/components/SectionHeader';
import Field from '@/components/Field';
import Button from '@/components/Button';
import DonutChart from '@/components/charts/DonutChart';
import LineChart from '@/components/charts/LineChart';
import { colors, spacing, font, radius, layout } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { useMonth } from '@/data/useMonth';
import { useAllMonthSnapshots } from '@/data/useHistory';
import { computeRunway } from '@/calc/engine';
import {
  computeSafeToSpend,
  computeComposition,
  topSpendItems,
  overspentItems,
  computeSavingsGoal,
  buildTrends,
} from '@/calc/analytics';
import { onDataChange } from '@/db';
import { getSavingsTargetCents, setSavingsTargetCents } from '@/data/repository';
import { formatCents, toCents } from '@/utils/money';
import { formatMonthShort } from '@/utils/date';
import type { Bucket } from '@/calc/types';

const BUCKET_COLOR: Record<Bucket, string> = { needs: '#06C167', wants: '#7C5CFF', savings: '#F5A623', church: '#19B5C9' };
const BUCKET_LABEL: Record<Bucket, string> = { needs: 'Needs', wants: 'Wants', savings: 'Savings', church: 'Church' };

function Bar({ pct, color, over }: { pct: number; color: string; over?: boolean }) {
  return (
    <View style={{ height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${Math.min(pct, 100)}%`, height: 8, borderRadius: radius.pill, backgroundColor: over ? colors.negative : color }} />
    </View>
  );
}

export default function InsightsScreen() {
  const { activeMonth } = useActiveMonth();
  const { snapshot } = useMonth(activeMonth);
  const { snapshots } = useAllMonthSnapshots();

  const [target, setTarget] = useState(0);
  const [targetInput, setTargetInput] = useState('');

  const loadTarget = useCallback(async () => {
    const t = await getSavingsTargetCents();
    setTarget(t);
    setTargetInput(t > 0 ? formatCents(t) : '');
  }, []);

  useEffect(() => {
    void loadTarget();
    return onDataChange(loadTarget);
  }, [loadTarget]);

  if (!snapshot) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <MonthDropdown />
      </View>
    );
  }

  const safe = computeSafeToSpend(snapshot);
  const comp = computeComposition(snapshot);
  const top = topSpendItems(snapshot, 5);
  const over = overspentItems(snapshot);
  const goal = computeSavingsGoal(snapshot, target);
  const runway = computeRunway(snapshots);
  const trends = buildTrends(snapshots);
  const rolloverIn = snapshot.categories
    .flatMap((c) => c.items)
    .reduce((s, i) => s + (i.rolloverCents ?? 0), 0);

  const donutSlices = comp.slices.map((s) => ({ value: s.actualCents, color: BUCKET_COLOR[s.bucket] }));
  const trendLabels = trends.map((t) => formatMonthShort(t.monthYear));
  const runwayText = runway.runwayMonths === Infinity ? '∞' : runway.monthsAnalyzed === 0 ? '—' : `${runway.runwayMonths.toFixed(1)} mo`;

  const onSaveTarget = async () => {
    await setSavingsTargetCents(toCents(targetInput));
    void loadTarget();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MonthDropdown />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: layout.tabBarSpace }}>
        {/* SAFE TO SPEND */}
        <SectionHeader title="Safe to spend" />
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Wallet size={15} color={colors.textFaint} strokeWidth={2} />
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '600' }}>LEFT TO SPEND</Text>
          </View>
          <Text style={{ color: safe.remainingCents >= 0 ? colors.text : colors.negative, fontSize: font.size.xxl, fontWeight: '800', letterSpacing: font.tracking.tight }}>
            {formatCents(safe.remainingCents)}
          </Text>
          {safe.daysLeft > 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{formatCents(safe.dailyAllowanceCents)}</Text>/day for {safe.daysLeft} days left
            </Text>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Month complete.</Text>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: safe.onPace ? colors.positive : colors.negative }} />
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              {safe.onPace ? 'On pace' : 'Over pace'} — projected spend {formatCents(safe.projectedSpendCents)}
            </Text>
          </View>

          <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: spacing.md }} />
          {safe.perBucket.map((b) => (
            <View key={b.name} style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontSize: font.size.sm }}>{b.name}</Text>
                <Text style={{ color: b.remainingCents < 0 ? colors.negative : colors.textMuted, fontSize: font.size.sm }}>
                  {formatCents(b.remainingCents)} left
                </Text>
              </View>
              <Bar pct={b.budgetCents > 0 ? (b.actualCents / b.budgetCents) * 100 : 0} color={b.bucket ? BUCKET_COLOR[b.bucket] : colors.primary} over={b.remainingCents < 0} />
            </View>
          ))}
        </Card>

        {/* COMPOSITION */}
        <SectionHeader title="Where it goes" />
        <Card style={{ marginBottom: spacing.lg }}>
          {comp.totalSpentCents > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <DonutChart
                slices={donutSlices}
                size={132}
                center={
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.textFaint, fontSize: 10 }}>SPENT</Text>
                    <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '800' }}>{formatCents(comp.totalSpentCents)}</Text>
                  </View>
                }
              />
              <View style={{ flex: 1, gap: spacing.sm }}>
                {comp.slices.map((s) => (
                  <View key={s.bucket} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: BUCKET_COLOR[s.bucket] }} />
                    <Text style={{ color: colors.text, fontSize: font.size.sm, flex: 1 }}>{BUCKET_LABEL[s.bucket]}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{s.percent.toFixed(0)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <PieIcon size={26} color={colors.textFaint} strokeWidth={1.75} />
              <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>No spending recorded yet this month.</Text>
            </View>
          )}
        </Card>

        {top.length > 0 && (
          <>
            <SectionHeader title="Top spending" />
            <Card style={{ marginBottom: spacing.lg }}>
              {top.map((it, i) => (
                <View key={it.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: i < top.length - 1 ? spacing.sm : 0 }}>
                  <Text style={{ color: colors.text, fontSize: font.size.sm }}>{it.name}</Text>
                  <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: '600' }}>{formatCents(it.actualSpentCents)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {over.length > 0 && (
          <Card style={{ marginBottom: spacing.lg, borderColor: colors.negativeSoft }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
              <AlertTriangle size={15} color={colors.negative} strokeWidth={2} />
              <Text style={{ color: colors.negative, fontSize: font.size.xs, fontWeight: '700', letterSpacing: font.tracking.caps }}>OVER BUDGET</Text>
            </View>
            {over.map((v) => (
              <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: colors.text, fontSize: font.size.sm }}>{v.name}</Text>
                <Text style={{ color: colors.negative, fontSize: font.size.sm, fontWeight: '600' }}>{formatCents(-v.varianceCents)} over</Text>
              </View>
            ))}
          </Card>
        )}

        {/* SAVINGS GOAL */}
        <SectionHeader title="Savings goal" />
        <Card style={{ marginBottom: spacing.lg }}>
          {target > 0 ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Target size={15} color={colors.textFaint} strokeWidth={2} />
                <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '600' }}>
                  SAVED THIS MONTH
                </Text>
              </View>
              <Text style={{ color: goal.met ? colors.positive : colors.text, fontSize: font.size.xl, fontWeight: '800' }}>
                {formatCents(goal.savedCents)} <Text style={{ color: colors.textFaint, fontSize: font.size.sm, fontWeight: '500' }}>of {formatCents(goal.targetCents)}</Text>
              </Text>
              <Bar pct={goal.percent} color={colors.primary} />
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginTop: 8 }}>
                {goal.met ? '🎯 Goal met!' : `${formatCents(goal.shortfallCents)} to go (${goal.percent.toFixed(0)}%)`}
              </Text>
            </>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md }}>
              Set a monthly savings target to track your progress.
            </Text>
          )}
          <View style={{ marginTop: spacing.md }}>
            <Field label="Monthly savings target" value={targetInput} onChangeText={setTargetInput} placeholder="0.00" keyboardType="decimal-pad" />
            <Button title="Save goal" onPress={onSaveTarget} variant="secondary" />
          </View>
        </Card>

        {/* Runway + rollover */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Gauge size={14} color={colors.textFaint} strokeWidth={2} />
                <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '600' }}>RUNWAY</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: font.size.lg, fontWeight: '800' }}>{runwayText}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '600' }}>ROLLOVER CARRIED</Text>
              <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: '800' }}>{formatCents(rolloverIn)}</Text>
            </View>
          </View>
        </Card>

        {/* TRENDS */}
        <SectionHeader title="Trends" />
        {trends.length >= 2 ? (
          <>
            <Card style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
                <TrendingUp size={15} color={colors.textFaint} strokeWidth={2} />
                <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '700', letterSpacing: font.tracking.caps }}>NET SAVED / MONTH</Text>
              </View>
              <LineChart values={trends.map((t) => t.netSavedCents / 100)} labels={trendLabels} color={colors.primary} />
            </Card>
            <Card>
              <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '700', letterSpacing: font.tracking.caps, marginBottom: spacing.sm }}>SAVINGS RATE %</Text>
              <LineChart values={trends.map((t) => t.savingsRatePercent)} labels={trendLabels} color="#7C5CFF" showZero />
            </Card>
          </>
        ) : (
          <Text style={{ color: colors.textFaint }}>Trends unlock after a second month of history.</Text>
        )}
      </ScrollView>
    </View>
  );
}
