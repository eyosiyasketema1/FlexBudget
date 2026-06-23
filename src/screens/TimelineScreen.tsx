import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import MonthBanner from '@/components/MonthBanner';
import TotalsHeader from '@/components/TotalsHeader';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { colors, spacing, font } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { useMonth } from '@/data/useMonth';
import { formatCents } from '@/utils/money';
import { formatMonthLabel } from '@/utils/date';
import { ensureMonth, copyBaselineToNewMonth, lockMonth, unlockMonth } from '@/data/repository';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function TimelineScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeMonth, setActiveMonth } = useActiveMonth();
  const { loading, isLocked, snapshot, totals } = useMonth(activeMonth);

  // A future month the user navigated to may not exist yet.
  const monthMissing = !loading && snapshot != null && snapshot.income.length === 0 &&
    snapshot.categories.length === 0;

  const activeIncome = (snapshot?.income ?? []).filter((i) => !i.isArchived);

  const onCopyForward = async () => {
    try {
      const created = await copyBaselineToNewMonth(activeMonth);
      setActiveMonth(created);
      Alert.alert('Copied', `Baseline copied to ${formatMonthLabel(created)}. Actuals reset to zero.`);
    } catch (e) {
      Alert.alert('Could not copy', (e as Error).message);
    }
  };

  const onToggleLock = async () => {
    if (isLocked) await unlockMonth(activeMonth);
    else await lockMonth(activeMonth);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MonthBanner />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: '700' }}>
            {formatMonthLabel(activeMonth)}
          </Text>
          {isLocked && (
            <Text style={{ color: colors.locked, fontSize: font.size.sm }}>🔒 Locked</Text>
          )}
        </View>

        {monthMissing ? (
          <Card>
            <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>
              This month is empty. Start it from scratch, or copy last month's baseline.
            </Text>
            <Button title="Create empty month" onPress={() => ensureMonth(activeMonth)} variant="secondary" />
          </Card>
        ) : (
          totals && <TotalsHeader totals={totals} />
        )}

        {/* Income */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '600' }}>Income</Text>
          {!isLocked && (
            <Pressable onPress={() => nav.navigate('IncomeForm')}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Add</Text>
            </Pressable>
          )}
        </View>

        {activeIncome.length === 0 ? (
          <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>No income yet.</Text>
        ) : (
          activeIncome.map((inc) => (
            <Pressable
              key={inc.id}
              disabled={isLocked}
              onPress={() => nav.navigate('IncomeForm', { incomeId: inc.id })}
            >
              <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{inc.label}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{inc.category}</Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{formatCents(inc.amountCents)}</Text>
              </Card>
            </Pressable>
          ))
        )}

        {/* Month lifecycle actions */}
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Button title="Copy baseline to next month" onPress={onCopyForward} variant="secondary" />
          <Button
            title={isLocked ? 'Unlock month' : 'Close out & lock month'}
            onPress={onToggleLock}
            variant={isLocked ? 'secondary' : 'danger'}
          />
        </View>
      </ScrollView>
    </View>
  );
}
