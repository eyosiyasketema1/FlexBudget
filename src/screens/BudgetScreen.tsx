import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, FolderPlus, ChevronRight } from 'lucide-react-native';

import Card from '@/components/Card';
import SectionHeader from '@/components/SectionHeader';
import { IconButton } from '@/components/Button';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { useMonth } from '@/data/useMonth';
import { computeBudgetAllocation } from '@/calc/analytics';
import { rebalanceSavings } from '@/data/repository';
import { formatCents } from '@/utils/money';
import { useT } from '@/i18n';
import { BUCKET_ORDER } from '@/db/template';
import type { RootStackParamList } from '@/navigation/RootNavigator';

function rank(bucket: string | null): number {
  const i = BUCKET_ORDER.indexOf(bucket as never);
  return i === -1 ? 99 : i;
}

// 50/30/20 appraisal bar: fill = budget % of income, marker = target %.
function AppraisalBar({ percent, target, within }: { percent: number; target: number | null; within: boolean }) {
  return (
    <View style={{ height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, marginTop: 8 }}>
      <View style={{ width: `${Math.min(percent, 100)}%`, height: 8, borderRadius: radius.pill, backgroundColor: within ? colors.positive : colors.negative }} />
      {target != null && (
        <View style={{ position: 'absolute', left: `${Math.min(target, 100)}%`, top: -3, width: 2, height: 14, backgroundColor: colors.text }} />
      )}
    </View>
  );
}

export default function BudgetScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeMonth } = useActiveMonth();
  const t = useT();
  const { snapshot, rollups, isLocked } = useMonth(activeMonth);

  // Keep the plan zero-based: Savings absorbs the difference so total = income.
  useEffect(() => {
    if (!isLocked) void rebalanceSavings(activeMonth);
  }, [activeMonth, isLocked]);

  const alloc = snapshot ? computeBudgetAllocation(snapshot) : null;
  const itemsByCat = new Map(rollups.map((r) => [r.id, r.items]));
  const buckets = alloc ? [...alloc.buckets].sort((a, b) => rank(a.bucket) - rank(b.bucket)) : [];

  const totalBudgeted = alloc?.totalBudgetedCents ?? 0;
  const income = alloc?.incomeCents ?? 0;
  const unalloc = alloc?.unallocatedCents ?? 0;
  const statusColor = unalloc === 0 ? colors.positive : unalloc > 0 ? colors.warning : colors.negative;
  const statusText = unalloc === 0 ? t('budget.balanced') : unalloc > 0 ? t('budget.unallocated', { amount: formatCents(unalloc) }) : t('budget.overIncome', { amount: formatCents(-unalloc) });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {alloc && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <View>
              <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '700' }}>{t('budget.totalBudgeted')}</Text>
              <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: '800', letterSpacing: font.tracking.tight }}>
                {formatCents(totalBudgeted)} <Text style={{ color: colors.textFaint, fontSize: font.size.sm, fontWeight: '500' }}>/ {formatCents(income)}</Text>
              </Text>
            </View>
            <Text style={{ color: statusColor, fontSize: font.size.sm, fontWeight: '600' }}>{statusText}</Text>
          </View>
        )}

        <SectionHeader
          title={t('budget.mainCategories')}
          action={!isLocked ? <IconButton icon={FolderPlus} label={t('budget.addMain')} onPress={() => nav.navigate('CategoryForm')} /> : undefined}
        />

        {buckets.length === 0 && <Text style={{ color: colors.textFaint }}>{t('budget.noCategories')}</Text>}

        {buckets.map((cat) => {
          const items = itemsByCat.get(cat.id) ?? [];
          return (
            <Card key={cat.id} style={{ marginBottom: spacing.lg }}>
              <Pressable disabled={isLocked} onPress={() => nav.navigate('CategoryForm', { categoryId: cat.id })}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '700' }}>{cat.name}</Text>
                  <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '700' }}>{formatCents(cat.budgetedCents)}</Text>
                </View>
                {cat.targetPercent != null && (
                  <>
                    <Text style={{ color: cat.withinTarget ? colors.textMuted : colors.negative, fontSize: font.size.xs, marginTop: 2 }}>
                      {t('budget.ofIncomeCap', { pct: cat.percentOfIncome.toFixed(0), cap: cat.targetPercent })}
                      {cat.withinTarget ? '' : cat.bucket === 'savings' ? `  ${t('budget.under')}` : `  ${t('budget.over')}`}
                    </Text>
                    <AppraisalBar percent={cat.percentOfIncome} target={cat.targetPercent} within={cat.withinTarget} />
                  </>
                )}
              </Pressable>

              <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: spacing.md }} />

              {items.map((item) => (
                <Pressable
                  key={item.id}
                  disabled={isLocked}
                  onPress={() => nav.navigate('ItemForm', { categoryId: cat.id, itemId: item.id })}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}
                >
                  <Text style={{ color: colors.text, fontSize: font.size.sm, flex: 1 }}>{item.name}</Text>
                  <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: '600' }}>{formatCents(item.budgetCapCents)}</Text>
                  {!isLocked && <ChevronRight size={16} color={colors.textFaint} style={{ marginLeft: 4 }} />}
                </Pressable>
              ))}

              {!isLocked && (
                <Pressable onPress={() => nav.navigate('ItemForm', { categoryId: cat.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs }}>
                  <Plus size={15} color={colors.primary} strokeWidth={2.25} />
                  <Text style={{ color: colors.primary, fontSize: font.size.sm, fontWeight: '600' }}>{t('budget.addSub')}</Text>
                </Pressable>
              )}
            </Card>
          );
        })}

        <Text style={{ color: colors.textFaint, fontSize: font.size.xs, marginTop: spacing.xs }}>
          {t('budget.footer')}
        </Text>
      </ScrollView>
    </View>
  );
}
