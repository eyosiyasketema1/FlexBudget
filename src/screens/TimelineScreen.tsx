import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock, Unlock, CopyPlus, Plus, Banknote, ChevronRight } from 'lucide-react-native';

import MonthBanner from '@/components/MonthBanner';
import TotalsHeader from '@/components/TotalsHeader';
import Card from '@/components/Card';
import Button, { IconButton } from '@/components/Button';
import SectionHeader from '@/components/SectionHeader';
import { colors, spacing, font, layout } from '@/theme/theme';
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

  const monthMissing =
    !loading && snapshot != null && snapshot.income.length === 0 && snapshot.categories.length === 0;
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
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: layout.tabBarSpace }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: '700', letterSpacing: font.tracking.tight }}>
            {formatMonthLabel(activeMonth)}
          </Text>
          {isLocked && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Lock size={14} color={colors.textMuted} strokeWidth={2} />
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Locked</Text>
            </View>
          )}
        </View>

        {monthMissing ? (
          <Card>
            <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>
              This month is empty. Start it from scratch, or copy last month's baseline.
            </Text>
            <Button title="Create empty month" icon={Plus} onPress={() => ensureMonth(activeMonth)} variant="secondary" />
          </Card>
        ) : (
          totals && <TotalsHeader totals={totals} />
        )}

        <SectionHeader
          title="Income"
          action={!isLocked ? <IconButton icon={Plus} label="Add income" onPress={() => nav.navigate('IncomeForm')} /> : undefined}
        />

        {activeIncome.length === 0 ? (
          <Text style={{ color: colors.textFaint, marginBottom: spacing.lg }}>No income yet.</Text>
        ) : (
          activeIncome.map((inc) => (
            <Pressable key={inc.id} disabled={isLocked} onPress={() => nav.navigate('IncomeForm', { incomeId: inc.id })}>
              <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 38, height: 38, borderRadius: 12, marginRight: spacing.md,
                    backgroundColor: colors.positiveSoft, alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Banknote size={19} color={colors.positive} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: font.size.md }}>{inc.label}</Text>
                  <Text style={{ color: colors.textFaint, fontSize: font.size.xs }}>{inc.category}</Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: font.size.md }}>{formatCents(inc.amountCents)}</Text>
                {!isLocked && <ChevronRight size={18} color={colors.textFaint} style={{ marginLeft: 4 }} />}
              </Card>
            </Pressable>
          ))
        )}

        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Button title="Copy baseline to next month" icon={CopyPlus} onPress={onCopyForward} variant="secondary" />
          <Button
            title={isLocked ? 'Unlock month' : 'Close out & lock month'}
            icon={isLocked ? Unlock : Lock}
            onPress={onToggleLock}
            variant={isLocked ? 'secondary' : 'danger'}
          />
        </View>
      </ScrollView>
    </View>
  );
}
