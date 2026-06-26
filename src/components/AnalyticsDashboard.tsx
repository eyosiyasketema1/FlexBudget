import React from 'react';
import { View, Text } from 'react-native';
import { Wallet, AlertTriangle, TrendingUp } from 'lucide-react-native';

import Card from '@/components/Card';
import SectionHeader from '@/components/SectionHeader';
import DonutChart from '@/components/charts/DonutChart';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import { colors, spacing, font, radius } from '@/theme/theme';
import {
  computeSafeToSpend,
  computeComposition,
  topSpendItems,
  overspentItems,
  buildTrends,
  computeBudgetAllocation,
} from '@/calc/analytics';
import { formatCents } from '@/utils/money';
import { useT, useLocalizeName, useMonthFmt } from '@/i18n';
import type { MonthSnapshot, Bucket } from '@/calc/types';

const BUCKET_COLOR: Record<Bucket, string> = { needs: '#06C167', wants: '#7C5CFF', savings: '#F5A623', church: '#19B5C9' };
const BUCKET_TKEY: Record<Bucket, string> = { needs: 'bucket.needs', wants: 'bucket.wants', savings: 'bucket.savings', church: 'bucket.church' };

function Bar({ pct, color, over }: { pct: number; color: string; over?: boolean }) {
  return (
    <View style={{ height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${Math.min(pct, 100)}%`, height: 8, borderRadius: radius.pill, backgroundColor: over ? colors.negative : color }} />
    </View>
  );
}

// Per-month analytics dashboard. `snapshot` is the month to analyze; `snapshots`
// is the full history (for trends).
export default function AnalyticsDashboard({ snapshot, snapshots }: { snapshot: MonthSnapshot; snapshots: MonthSnapshot[] }) {
  const tr = useT();
  const localize = useLocalizeName();
  const fmt = useMonthFmt();
  const safe = computeSafeToSpend(snapshot);
  const comp = computeComposition(snapshot);
  const top = topSpendItems(snapshot, 5);
  const over = overspentItems(snapshot);
  const alloc = computeBudgetAllocation(snapshot);
  const trends = buildTrends(snapshots);
  const donutSlices = comp.slices.map((s) => ({ value: s.actualCents, color: BUCKET_COLOR[s.bucket] }));
  const trendLabels = trends.map((tt) => fmt.short(tt.monthYear));

  return (
    <View>
      {/* Safe to spend */}
      <SectionHeader title={tr('analytics.safeToSpend')} />
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Wallet size={15} color={colors.textFaint} strokeWidth={2} />
          <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '600' }}>{tr('analytics.leftToSpend')}</Text>
        </View>
        <Text style={{ color: safe.remainingCents >= 0 ? colors.text : colors.negative, fontSize: font.size.xxl, fontWeight: '800', letterSpacing: font.tracking.tight }}>
          {formatCents(safe.remainingCents)}
        </Text>
        {safe.daysLeft > 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{formatCents(safe.dailyAllowanceCents)}</Text>{tr('analytics.perDay', { days: safe.daysLeft })}
          </Text>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{tr('analytics.monthComplete')}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: safe.onPace ? colors.positive : colors.negative }} />
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
            {safe.onPace ? tr('analytics.onPace') : tr('analytics.overPace')} · {tr('analytics.projected', { amount: formatCents(safe.projectedSpendCents) })}
          </Text>
        </View>
      </Card>

      {/* Composition */}
      <SectionHeader title={tr('analytics.whereItGoes')} />
      <Card style={{ marginBottom: spacing.lg }}>
        {comp.totalSpentCents > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <DonutChart slices={donutSlices} size={128} center={
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textFaint, fontSize: 10 }}>{tr('analytics.spent')}</Text>
                <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: '800' }}>{formatCents(comp.totalSpentCents)}</Text>
              </View>
            } />
            <View style={{ flex: 1, gap: spacing.sm }}>
              {comp.slices.filter((s) => s.actualCents > 0).map((s) => (
                <View key={s.bucket} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: BUCKET_COLOR[s.bucket] }} />
                  <Text style={{ color: colors.text, fontSize: font.size.sm, flex: 1 }}>{tr(BUCKET_TKEY[s.bucket])}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{s.percent.toFixed(0)}%</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={{ color: colors.textMuted }}>{tr('analytics.noSpending')}</Text>
        )}
      </Card>

      {/* Top spending */}
      {top.length > 0 && (
        <>
          <SectionHeader title={tr('analytics.topSpending')} />
          <Card style={{ marginBottom: spacing.lg }}>
            {top.map((it, i) => (
              <View key={it.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: i < top.length - 1 ? spacing.sm : 0 }}>
                <Text style={{ color: colors.text, fontSize: font.size.sm }}>{localize(it.name)}</Text>
                <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: '600' }}>{formatCents(it.actualSpentCents)}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {over.length > 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
            <AlertTriangle size={15} color={colors.negative} strokeWidth={2} />
            <Text style={{ color: colors.negative, fontSize: font.size.xs, fontWeight: '700', letterSpacing: font.tracking.caps }}>{tr('analytics.overBudget')}</Text>
          </View>
          {over.map((v) => (
            <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: colors.text, fontSize: font.size.sm }}>{localize(v.name)}</Text>
              <Text style={{ color: colors.negative, fontSize: font.size.sm, fontWeight: '600' }}>{tr('analytics.overAmount', { amount: formatCents(-v.varianceCents) })}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Allocation vs caps */}
      <SectionHeader title={tr('analytics.allocationVsCap')} />
      <Card style={{ marginBottom: spacing.lg }}>
        {alloc.buckets.map((b, i) => (
          <View key={b.id} style={{ marginBottom: i < alloc.buckets.length - 1 ? spacing.md : 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: '600' }}>{b.name}</Text>
              <Text style={{ color: b.withinTarget ? colors.textMuted : colors.negative, fontSize: font.size.sm }}>
                {b.percentOfIncome.toFixed(0)}%{b.targetPercent != null ? ` / ${b.targetPercent}%` : ''}
              </Text>
            </View>
            <Bar pct={b.percentOfIncome} color={b.bucket ? BUCKET_COLOR[b.bucket] : colors.primary} over={!b.withinTarget} />
          </View>
        ))}
      </Card>

      {/* Trends */}
      <SectionHeader title={tr('analytics.trends')} />
      {trends.length >= 2 ? (
        <>
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
              <TrendingUp size={15} color={colors.textFaint} strokeWidth={2} />
              <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '700', letterSpacing: font.tracking.caps }}>{tr('analytics.netSaved')}</Text>
            </View>
            <BarChart values={trends.map((t) => t.netSavedCents / 100)} labels={trendLabels} color={colors.positive} />
          </Card>
          <Card>
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '700', letterSpacing: font.tracking.caps, marginBottom: spacing.sm }}>{tr('analytics.savingsRate')}</Text>
            <LineChart values={trends.map((t) => t.savingsRatePercent)} labels={trendLabels} color="#7C5CFF" />
          </Card>
        </>
      ) : (
        <Text style={{ color: colors.textFaint }}>{tr('analytics.trendsLocked')}</Text>
      )}
    </View>
  );
}
