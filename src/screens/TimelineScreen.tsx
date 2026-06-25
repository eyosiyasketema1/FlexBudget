import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import MonthDropdown from '@/components/MonthDropdown';
import Card from '@/components/Card';
import IncomeCarousel from '@/components/IncomeCarousel';
import { colors, spacing, font, radius, layout } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { useMonth } from '@/data/useMonth';
import { formatCents } from '@/utils/money';
import { BUCKET_ORDER } from '@/db/template';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import type { CategoryRollup, ItemVariance } from '@/calc/types';

function bucketRank(bucket: string | null | undefined): number {
  const i = BUCKET_ORDER.indexOf(bucket as never);
  return i === -1 ? 99 : i;
}

function ItemRow({ item, onPress }: { item: ItemVariance; onPress: () => void }) {
  const pct = Math.min(item.percentUsed, 100);
  const over = item.state === 'over';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, spent ${formatCents(item.actualSpentCents)} of ${formatCents(item.effectiveBudgetCents)}`}
      style={{ marginBottom: spacing.md }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '500' }}>{item.name}</Text>
        <Text style={{ color: over ? colors.negative : colors.textMuted, fontSize: font.size.sm }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{formatCents(item.actualSpentCents)}</Text>
          {' / '}{formatCents(item.effectiveBudgetCents)}
        </Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: 8, borderRadius: radius.pill, backgroundColor: over ? colors.negative : colors.primary }} />
      </View>
    </Pressable>
  );
}

export default function TimelineScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeMonth } = useActiveMonth();
  const { snapshot, totals, rollups } = useMonth(activeMonth);
  const [hidden, setHidden] = useState(false);

  const income = (snapshot?.income ?? []).filter((i) => !i.isArchived);
  const buckets: CategoryRollup[] = [...rollups].sort((a, b) => bucketRank(a.bucket) - bucketRank(b.bucket));

  const spent = totals?.totalActualCents ?? 0;
  const budget = totals?.totalBudgetedCents ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MonthDropdown />
      <ScrollView contentContainerStyle={{ paddingBottom: layout.tabBarSpace }}>
        {/* Account card carousel (Figma) */}
        <View style={{ marginBottom: spacing.xl }}>
          <IncomeCarousel
            incomes={income}
            spentCents={spent}
            budgetCents={budget}
            hidden={hidden}
            onToggleHidden={() => setHidden((h) => !h)}
            onAddIncome={() => nav.navigate('IncomeForm')}
          />
        </View>

        {/* Expenses grouped by bucket */}
        <View style={{ paddingHorizontal: spacing.lg }}>
        {buckets.length === 0 && (
          <Text style={{ color: colors.textFaint, marginTop: spacing.sm }}>No expenses set up for this month.</Text>
        )}

        {buckets.map((cat) => {
          const catPct = cat.budgetedCents > 0 ? Math.round((cat.actualCents / cat.budgetedCents) * 100) : 0;
          return (
            <View key={cat.id} style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: '700' }}>{cat.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                  {formatCents(cat.actualCents)} / {formatCents(cat.budgetedCents)}  ·  {catPct}%
                </Text>
              </View>
              <Card>
                {cat.items.length === 0 ? (
                  <Text style={{ color: colors.textFaint, fontSize: font.size.sm }}>No items.</Text>
                ) : (
                  cat.items.map((item, idx) => (
                    <View key={item.id}>
                      <ItemRow item={item} onPress={() => nav.navigate('ItemForm', { categoryId: cat.id, itemId: item.id })} />
                      {idx < cat.items.length - 1 && <View style={{ height: 1, backgroundColor: colors.hairline, marginBottom: spacing.md }} />}
                    </View>
                  ))
                )}
              </Card>
            </View>
          );
        })}
        </View>
      </ScrollView>
    </View>
  );
}
