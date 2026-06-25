import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { PiggyBank } from 'lucide-react-native';

import Button from '@/components/Button';
import Field from '@/components/Field';
import { colors, spacing, font, radius } from '@/theme/theme';
import { onDataChange } from '@/db';
import { endedUnconfirmedPeriods, setMonthSaved, EndedPeriod } from '@/data/repository';
import { formatCents, toCents } from '@/utils/money';
import { formatMonthLabel } from '@/utils/date';

// Shows when a budget period has ended but its savings hasn't been confirmed.
// Asks "did you save the planned amount?" — Yes records the plan, No lets you
// enter the actual amount. Total Savings only counts confirmed amounts.
export default function SavingsPromptBanner() {
  const [pending, setPending] = useState<EndedPeriod[]>([]);
  const [amountMode, setAmountMode] = useState(false);
  const [amount, setAmount] = useState('');

  const load = useCallback(() => endedUnconfirmedPeriods().then(setPending), []);
  useEffect(() => {
    load();
    return onDataChange(load);
  }, [load]);

  if (pending.length === 0) return null;
  const p = pending[0];

  const confirm = async (cents: number) => {
    await setMonthSaved(p.monthYear, cents);
    setAmountMode(false);
    setAmount('');
  };

  return (
    <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg, backgroundColor: colors.primaryFaint, borderWidth: 1, borderColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <PiggyBank size={18} color={colors.primary} strokeWidth={2} />
        <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '700' }}>Confirm your savings</Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md }}>
        {formatMonthLabel(p.monthYear)} ended. Did you save your planned {formatCents(p.plannedCents)}?
      </Text>

      {!amountMode ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title={`Yes — ${formatCents(p.plannedCents)}`} onPress={() => confirm(p.plannedCents)} style={{ flex: 1 }} />
          <Button title="No / other" variant="secondary" onPress={() => { setAmount(''); setAmountMode(true); }} style={{ flex: 1 }} />
        </View>
      ) : (
        <View>
          <Field label="How much did you actually save?" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button title="Save" onPress={() => confirm(toCents(amount))} style={{ flex: 1 }} />
            <Button title="Back" variant="ghost" onPress={() => setAmountMode(false)} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </View>
  );
}
