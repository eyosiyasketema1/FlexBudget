import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, Trash2, RefreshCw, TriangleAlert, FolderOpen } from 'lucide-react-native';

import MonthBanner from '@/components/MonthBanner';
import Card from '@/components/Card';
import VarianceBadge from '@/components/VarianceBadge';
import SectionHeader from '@/components/SectionHeader';
import { IconButton } from '@/components/Button';
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
    <View style={{ height: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, marginTop: 8, overflow: 'hidden' }}>
      <View style={{ width: `${width}%`, height: 6, borderRadius: radius.pill, backgroundColor: over ? colors.negative : colors.positive }} />
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
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <SectionHeader
          title="Budget"
          action={!isLocked ? <IconButton icon={Plus} label="Add category" onPress={() => nav.navigate('CategoryForm')} /> : undefined}
        />

        {!loading && rollups.length === 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <FolderOpen size={28} color={colors.textFaint} strokeWidth={1.75} />
            <Text style={{ color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' }}>
              No categories yet.{'\n'}Add one to start budgeting.
            </Text>
          </Card>
        )}

        {rollups.map((cat) => (
          <Card key={cat.id} style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Pressable disabled={isLocked} onPress={() => nav.navigate('CategoryForm', { categoryId: cat.id })} style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '700' }}>{cat.name}</Text>
                <Text style={{ color: colors.textFaint, fontSize: font.size.xs, marginTop: 2 }}>
                  {formatCents(cat.actualCents)} of {formatCents(cat.budgetedCents)}
                  {cat.allocationCapPercent != null ? `  ·  ${cat.actualSharePercent.toFixed(0)}% / ${cat.allocationCapPercent}% cap` : ''}
                </Text>
              </Pressable>
              <VarianceBadge state={cat.state} varianceCents={cat.varianceCents} />
            </View>
            {cat.capExceeded && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <TriangleAlert size={13} color={colors.warning} strokeWidth={2} />
                <Text style={{ color: colors.warning, fontSize: font.size.xs }}>Over its {cat.allocationCapPercent}% allocation rule</Text>
              </View>
            )}

            <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: spacing.md }} />

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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: font.size.sm }}>{item.name}</Text>
                    {item.rolloverCents !== 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <RefreshCw size={11} color={colors.primary} strokeWidth={2.25} />
                        <Text style={{ color: colors.primary, fontSize: font.size.xs }}>{formatCents(item.rolloverCents)}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: colors.text, fontSize: font.size.sm }}>
                    {formatCents(item.actualSpentCents)} <Text style={{ color: colors.textFaint }}>/ {formatCents(item.effectiveBudgetCents)}</Text>
                  </Text>
                </View>
                <ProgressBar percent={item.percentUsed} over={item.state === 'over'} />
              </Pressable>
            ))}

            {!isLocked && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs }}>
                <Pressable onPress={() => nav.navigate('ItemForm', { categoryId: cat.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Plus size={15} color={colors.primary} strokeWidth={2.25} />
                  <Text style={{ color: colors.primary, fontSize: font.size.sm, fontWeight: '600' }}>Add item</Text>
                </Pressable>
                <Pressable onPress={() => confirmArchiveCategory(cat.id, cat.name)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={14} color={colors.textFaint} strokeWidth={2} />
                  <Text style={{ color: colors.textFaint, fontSize: font.size.sm }}>Remove</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ))}

        {rollups.length > 0 && (
          <Text style={{ color: colors.textFaint, fontSize: font.size.xs, marginTop: spacing.xs }}>
            Tip: long-press an item to archive it. Archived rows stay in history.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
