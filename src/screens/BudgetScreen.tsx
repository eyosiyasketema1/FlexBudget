import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import MonthBanner from '@/components/MonthBanner';
import Card from '@/components/Card';
import VarianceBadge from '@/components/VarianceBadge';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { useMonth } from '@/data/useMonth';
import { formatCents } from '@/utils/money';
import { archiveCategory, archiveItem } from '@/data/repository';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import type { ItemVariance } from '@/calc/types';

function ProgressBar({ percent, over }: { percent: number; over: boolean }) {
  const width = Math.min(percent, 100);
  return (
    <View style={{ height: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, marginTop: 6 }}>
      <View
        style={{
          width: `${width}%`,
          height: 6,
          borderRadius: radius.pill,
          backgroundColor: over ? colors.negative : colors.positive,
        }}
      />
    </View>
  );
}

export default function BudgetScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeMonth } = useActiveMonth();
  const { loading, isLocked, rollups } = useMonth(activeMonth);

  const confirmArchiveItem = (item: ItemVariance) => {
    Alert.alert('Remove item', `Archive "${item.name}"? History stays intact.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => archiveItem(item.id) },
    ]);
  };

  const confirmArchiveCategory = (id: string, name: string) => {
    Alert.alert('Remove category', `Archive "${name}" and its items? Past months are unaffected.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => archiveCategory(id) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MonthBanner />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: '700' }}>Budget</Text>
          {!isLocked && (
            <Pressable onPress={() => nav.navigate('CategoryForm')}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Category</Text>
            </Pressable>
          )}
        </View>

        {!loading && rollups.length === 0 && (
          <Text style={{ color: colors.textMuted }}>No categories yet. Add one to start budgeting.</Text>
        )}

        {rollups.map((cat) => (
          <Card key={cat.id} style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Pressable
                disabled={isLocked}
                onPress={() => nav.navigate('CategoryForm', { categoryId: cat.id })}
                style={{ flex: 1 }}
              >
                <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '700' }}>{cat.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>
                  {formatCents(cat.actualCents)} of {formatCents(cat.budgetedCents)}
                  {cat.allocationCapPercent != null
                    ? `  ·  ${cat.actualSharePercent.toFixed(0)}% / ${cat.allocationCapPercent}% cap`
                    : ''}
                </Text>
              </Pressable>
              <VarianceBadge state={cat.state} varianceCents={cat.varianceCents} />
            </View>
            {cat.capExceeded && (
              <Text style={{ color: colors.warning, fontSize: font.size.xs, marginTop: 4 }}>
                ⚠︎ Over its {cat.allocationCapPercent}% allocation rule
              </Text>
            )}

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

            {cat.items.map((item) => (
              <Pressable
                key={item.id}
                disabled={isLocked}
                onLongPress={() => confirmArchiveItem(item)}
                onPress={() => nav.navigate('ItemForm', { categoryId: cat.id, itemId: item.id })}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, spent ${formatCents(item.actualSpentCents)} of ${formatCents(item.effectiveBudgetCents)}`}
                accessibilityHint="Opens the item to edit. Long-press to archive."
                style={{ marginBottom: spacing.md }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text }}>
                    {item.name}
                    {item.rolloverCents !== 0 ? (
                      <Text style={{ color: colors.primary, fontSize: font.size.xs }}>
                        {'  '}↻ {formatCents(item.rolloverCents)}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={{ color: colors.text }}>
                    {formatCents(item.actualSpentCents)}{' '}
                    <Text style={{ color: colors.textMuted }}>/ {formatCents(item.effectiveBudgetCents)}</Text>
                  </Text>
                </View>
                <ProgressBar percent={item.percentUsed} over={item.state === 'over'} />
              </Pressable>
            ))}

            {!isLocked && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
                <Pressable onPress={() => nav.navigate('ItemForm', { categoryId: cat.id })}>
                  <Text style={{ color: colors.primary, fontSize: font.size.sm }}>+ Add item</Text>
                </Pressable>
                <Pressable onPress={() => confirmArchiveCategory(cat.id, cat.name)}>
                  <Text style={{ color: colors.negative, fontSize: font.size.sm }}>Remove category</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ))}
        <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: spacing.sm }}>
          Tip: long-press an item to archive it. Archived rows stay in history.
        </Text>
      </ScrollView>
    </View>
  );
}
