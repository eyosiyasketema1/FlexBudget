import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import MonthDropdown from '@/components/MonthDropdown';
import Card from '@/components/Card';
import { AccountCard } from '@/components/AccountCard';
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
  const salary = income[0]; // single salary account
  const buckets: CategoryRollup[] = [...rollups].sort((a, b) => bucketRank(a.bucket) - bucketRank(b.bucket));

  const spent = totals?.totalActualCents ?? 0;
  const budget = totals?.totalBudgetedCents ?? 0;
  const incomeTotal = totals?.totalIncomeCents ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MonthDropdown />
      <ScrollView contentContainerStyle={{ paddingBottom: layout.tabBarSpace }}>
        {/* Salary account card (tap to edit the amount) */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
          <Pressable onPress={() => nav.navigate('IncomeForm', salary ? { incomeId: salary.id } : undefined)} accessibilityRole="button" accessibilityLabel="Edit salary">
            <AccountCard
              title={salary?.label ?? 'Salary Account'}
              amountCents={incomeTotal}
              spentCents={spent}
              budgetCents={budget}
              hidden={hidden}
              onToggleHidden={() => setHidden((h) => !h)}
            />
          </Pressable>
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
                      <ItemRow item={item} onPress={() => nav.navigate('RecordExpense', { itemId: item.id })} />
                      {idx < cat.items.length - 1 && <View style={{ height: 1, backgroundColor: colors.hairline, marginBottom: spacing.md }} />}
                    </View>
                  ))
                )}
              </Card>
            </View>
          );
        })}

        {buckets.length > 0 && (
          <Pressable
            onPress={() => nav.navigate('Reconcile')}
            accessibilityRole="button"
            accessibilityLabel="Reconcile balance"
            style={{ marginBottom: spacing.lg }}
          >
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '700' }}>Reconcile balance</Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>
                    Forgot to log some spending? Enter what you actually have and catch the rest.
                  </Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Check</Text>
              </View>
            </Card>
          </Pressable>
        )}
        </View>
      </ScrollView>
    </View>
  );
}
