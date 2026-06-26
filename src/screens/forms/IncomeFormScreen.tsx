import React, { useEffect, useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import { colors, spacing } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { addIncome, updateIncome, archiveIncome, getIncome } from '@/data/repository';
import { toCents, formatCents } from '@/utils/money';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function IncomeFormScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'IncomeForm'>>();
  const incomeId = route.params?.incomeId;
  const { activeMonth } = useActiveMonth();
  const t = useT();

  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!incomeId) return;
    getIncome(incomeId).then((row) => {
      if (!row) return;
      setLabel(row.label);
      setCategory(row.category);
      setAmount(formatCents(row.amountCents));
    });
  }, [incomeId]);

  const onSave = async () => {
    if (!label.trim()) return Alert.alert(t('income.addLabelFirst'));
    const data = { label: label.trim(), category: category.trim() || 'Other', amountCents: toCents(amount) };
    try {
      if (incomeId) await updateIncome(incomeId, data);
      else await addIncome(activeMonth, data);
      nav.goBack();
    } catch (e) {
      Alert.alert(t('common.couldNotSave'), (e as Error).message);
    }
  };

  const onDelete = () => {
    if (!incomeId) return;
    Alert.alert(t('income.removeTitle'), t('income.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.archive'),
        style: 'destructive',
        onPress: async () => {
          await archiveIncome(incomeId);
          nav.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <Field label={t('income.label')} value={label} onChangeText={setLabel} placeholder="Monthly Salary" />
      <Field label={t('income.category')} value={category} onChangeText={setCategory} placeholder="Primary Job" />
      <Field label={t('income.amount')} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
      <Button title={incomeId ? t('common.save') : t('income.add')} onPress={onSave} />
      {incomeId && <Button title={t('common.archive')} onPress={onDelete} variant="danger" style={{ marginTop: spacing.sm }} />}
    </ScrollView>
  );
}
