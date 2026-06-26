import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PiggyBank, RefreshCw, ChevronRight } from 'lucide-react-native';

import Card from '@/components/Card';
import ScreenTitle from '@/components/ScreenTitle';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { colors, spacing, font, radius, layout } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { useMonth } from '@/data/useMonth';
import { useAllMonthSnapshots } from '@/data/useHistory';
import { computeSavingsRollover, rolloverByMonth } from '@/calc/analytics';
import { computeTotals } from '@/calc/engine';
import { getTotalSaved } from '@/data/repository';
import { onDataChange } from '@/db';
import { formatCents } from '@/utils/money';
import { useT, useMonthFmt } from '@/i18n';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Tab = 'analytics' | 'history';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeMonth } = useActiveMonth();
  const t = useT();
  const fmt = useMonthFmt();
  const { snapshot } = useMonth(activeMonth);
  const { snapshots } = useAllMonthSnapshots();
  const { rolloverTotalCents } = computeSavingsRollover(snapshots);
  const [tab, setTab] = useState<Tab>('analytics');

  // Total Savings = sum of CONFIRMED amounts saved per period.
  const [totalSavingsCents, setTotalSavingsCents] = useState(0);
  const loadSaved = useCallback(() => getTotalSaved().then(setTotalSavingsCents), []);
  useEffect(() => {
    loadSaved();
    return onDataChange(loadSaved);
  }, [loadSaved]);

  const months = [...snapshots].sort((a, b) => b.monthYear.localeCompare(a.monthYear));
  const rollMap = rolloverByMonth(snapshots);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: layout.tabBarSpace }}>
        <ScreenTitle title={t('insights.title')} />

        {/* Total Savings */}
        <Card style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.positiveSoft, alignItems: 'center', justifyContent: 'center' }}>
              <PiggyBank size={19} color={colors.positive} strokeWidth={2} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '700' }}>{t('insights.totalSavings')}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: font.size.xxl, fontWeight: '800', letterSpacing: font.tracking.tight }}>{formatCents(totalSavingsCents)}</Text>
          <Text style={{ color: colors.textFaint, fontSize: font.size.xs, marginTop: 2 }}>{t('insights.confirmedSavings')}</Text>
        </Card>

        {/* Rollover */}
        <Pressable onPress={() => nav.navigate('Rollover')} accessibilityRole="button" accessibilityLabel="Rollover breakdown">
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '700' }}>{t('insights.rollover')}</Text>
              <View style={{ flex: 1 }} />
              <ChevronRight size={20} color={colors.textFaint} />
            </View>
            <Text style={{ color: rolloverTotalCents >= 0 ? colors.text : colors.negative, fontSize: font.size.xxl, fontWeight: '800', letterSpacing: font.tracking.tight }}>{formatCents(rolloverTotalCents)}</Text>
          </Card>
        </Pressable>

        {/* Segmented tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4, marginBottom: spacing.lg }}>
          {(['analytics', 'history'] as Tab[]).map((tName) => {
            const active = tab === tName;
            return (
              <Pressable key={tName} onPress={() => setTab(tName)} style={{ flex: 1, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: active ? colors.bg : 'transparent', alignItems: 'center' }}>
                <Text style={{ color: active ? colors.text : colors.textMuted, fontWeight: active ? '700' : '500', fontSize: font.size.sm }}>
                  {tName === 'analytics' ? t('insights.analytics') : t('insights.history')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'analytics' ? (
          snapshot ? <AnalyticsDashboard snapshot={snapshot} snapshots={snapshots} /> : null
        ) : (
          <View>
            {months.length === 0 && <Text style={{ color: colors.textFaint }}>{t('insights.noMonths')}</Text>}
            {months.map((m) => {
              const mt = computeTotals(m);
              return (
                <Pressable key={m.monthYear} onPress={() => nav.navigate('MonthDetail', { monthYear: m.monthYear })}>
                  <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '700' }}>{fmt.label(m.monthYear)}</Text>
                      <Text style={{ color: colors.textFaint, fontSize: font.size.xs }}>
                        {t('insights.in', { in: formatCents(mt.totalIncomeCents), spent: formatCents(mt.totalActualCents) })}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <RefreshCw size={11} color={colors.primary} strokeWidth={2.25} />
                        <Text style={{ color: colors.primary, fontSize: font.size.xs, fontWeight: '600' }}>
                          {t('insights.rolloverLabel', { amount: formatCents(rollMap[m.monthYear] ?? 0) })}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: mt.actualNetSavedCents >= 0 ? colors.positive : colors.negative, fontSize: font.size.md, fontWeight: '700', marginRight: 4 }}>
                      {formatCents(mt.actualNetSavedCents)}
                    </Text>
                    <ChevronRight size={18} color={colors.textFaint} />
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
