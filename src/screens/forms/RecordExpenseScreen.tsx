import React, { useEffect, useState } from 'react';
import { ScrollView, Alert, View, Text, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronDown, Trash2 } from 'lucide-react-native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import BottomSheet, { SheetOption, SheetGroupLabel } from '@/components/BottomSheet';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { listSubcategories, recordExpense, listExpenseEntries, deleteExpenseEntry, SubcategoryRow, ExpenseEntry } from '@/data/repository';
import { onDataChange } from '@/db';
import { toCents, formatCents } from '@/utils/money';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function RecordExpenseScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'RecordExpense'>>();
  const presetItemId = route.params?.itemId;
  const { activeMonth } = useActiveMonth();
  const t = useT();

  const [subs, setSubs] = useState<SubcategoryRow[]>([]);
  const [chosen, setChosen] = useState<SubcategoryRow | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);

  useEffect(() => {
    listSubcategories(activeMonth).then((rows) => {
      setSubs(rows);
      if (presetItemId) {
        const match = rows.find((r) => r.id === presetItemId);
        if (match) setChosen(match);
      }
    });
  }, [activeMonth, presetItemId]);

  // Load (and live-refresh) the chosen sub-category's payment history.
  useEffect(() => {
    if (!chosen) { setEntries([]); return; }
    const load = () => listExpenseEntries(chosen.id).then(setEntries);
    load();
    return onDataChange(load);
  }, [chosen]);

  const onDelete = (entry: ExpenseEntry) => {
    Alert.alert(t('record.deleteTitle'), t('record.deleteBody', { amount: formatCents(entry.amountCents) }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteExpenseEntry(entry.id) },
    ]);
  };

  const onSave = async () => {
    if (!chosen) return Alert.alert(t('record.pickFirst'));
    const cents = toCents(amount);
    if (cents <= 0) return Alert.alert(t('record.enterAmount'));
    try {
      await recordExpense(chosen.id, cents, reason);
      nav.goBack();
    } catch (e) {
      Alert.alert(t('common.couldNotSave'), (e as Error).message);
    }
  };

  // group subs by main category for the picker
  const groups: { categoryName: string; rows: SubcategoryRow[] }[] = [];
  for (const s of subs) {
    let g = groups.find((x) => x.categoryName === s.categoryName);
    if (!g) { g = { categoryName: s.categoryName, rows: [] }; groups.push(g); }
    g.rows.push(s);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      {/* Sub-category selector */}
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '600', letterSpacing: font.tracking.caps, textTransform: 'uppercase', marginBottom: spacing.sm }}>
        {t('record.subcategory')}
      </Text>
      <Pressable
        onPress={() => (subs.length ? setPickerOpen(true) : Alert.alert(t('record.noSubsTitle'), t('record.noSubsBody')))}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.md }}
      >
        <Text style={{ color: chosen ? colors.text : colors.textFaint, fontSize: font.size.md, fontWeight: '600' }}>{chosen ? chosen.name : t('record.select')}</Text>
        <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
      </Pressable>

      {/* Auto main category (read-only) */}
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '600', letterSpacing: font.tracking.caps, textTransform: 'uppercase', marginBottom: spacing.sm }}>
        {t('record.mainCategory')}
      </Text>
      <View style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.lg }}>
        <Text style={{ color: chosen ? colors.textMuted : colors.textFaint, fontSize: font.size.md }}>{chosen ? chosen.categoryName : '—'}</Text>
      </View>

      <Field label={t('record.iPaid')} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
      <Field label={t('record.reason')} value={reason} onChangeText={setReason} placeholder={t('record.reasonPlaceholder')} />

      <Button title={t('record.addExpense')} onPress={onSave} />

      {/* Payment history for the chosen sub-category */}
      {chosen && entries.length > 0 && (
        <View style={{ marginTop: spacing.xl }}>
          <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '700', letterSpacing: font.tracking.caps, textTransform: 'uppercase', marginBottom: spacing.sm }}>
            {t('record.payments', { name: chosen.name })}
          </Text>
          {entries.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.hairline }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: '600' }}>{formatCents(e.amountCents)}</Text>
                <Text style={{ color: colors.textFaint, fontSize: font.size.xs }}>
                  {new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {e.reason ? ` · ${e.reason}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => onDelete(e)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${formatCents(e.amountCents)} payment`}>
                <Trash2 size={18} color={colors.negative} strokeWidth={2} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Sub-category picker sheet */}
      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title={t('record.chooseSheet')}>
        {groups.map((g) => (
          <View key={g.categoryName}>
            <SheetGroupLabel label={g.categoryName} />
            {g.rows.map((s) => (
              <SheetOption key={s.id} label={s.name} selected={chosen?.id === s.id} onPress={() => { setChosen(s); setPickerOpen(false); }} />
            ))}
          </View>
        ))}
      </BottomSheet>
    </ScrollView>
  );
}
