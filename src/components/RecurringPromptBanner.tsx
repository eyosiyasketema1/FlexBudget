import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Repeat } from 'lucide-react-native';

import Button from '@/components/Button';
import { colors, spacing, font, radius } from '@/theme/theme';
import { onDataChange } from '@/db';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { listUnpaidRecurring, recordExpense, UnpaidRecurringDto } from '@/data/repository';
import { formatCents } from '@/utils/money';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/RootNavigator';

// Recurring fixed bills (rent, internet, tithe) that haven't been paid yet this
// period. The user confirms each one with a tap — only then is it posted. They
// can also open the full record screen to log a different amount.
export default function RecurringPromptBanner() {
  const { activeMonth } = useActiveMonth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const t = useT();
  const [pending, setPending] = useState<UnpaidRecurringDto[]>([]);

  const load = useCallback(() => {
    listUnpaidRecurring(activeMonth).then(setPending);
  }, [activeMonth]);
  useEffect(() => {
    load();
    return onDataChange(load);
  }, [load]);

  if (pending.length === 0) return null;

  const confirm = async (item: UnpaidRecurringDto) => {
    await recordExpense(item.id, item.budgetCapCents, 'Recurring bill — confirmed');
  };

  return (
    <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Repeat size={18} color={colors.primary} strokeWidth={2} />
        <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '700' }}>{t('recurring.title')}</Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md }}>
        {t('recurring.body')}
      </Text>

      {pending.map((item) => (
        <View
          key={item.id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{item.name}</Text>
            <Text
              onPress={() => nav.navigate('RecordExpense', { itemId: item.id })}
              style={{ color: colors.textMuted, fontSize: font.size.xs }}
            >
              {item.categoryName} · {formatCents(item.budgetCapCents)} — {t('recurring.tapToChange')}
            </Text>
          </View>
          <Button title={t('recurring.confirmPaid')} onPress={() => confirm(item)} />
        </View>
      ))}
    </View>
  );
}
