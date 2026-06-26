import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { MessageSquareText, ChevronDown } from 'lucide-react-native';

import Button from '@/components/Button';
import BottomSheet, { SheetOption, SheetGroupLabel } from '@/components/BottomSheet';
import { colors, spacing, font, radius } from '@/theme/theme';
import { onDataChange } from '@/db';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { listPendingSms, dismissPendingSms, confirmPendingSms, listSubcategories, PendingSms, SubcategoryRow } from '@/data/repository';
import { formatCents } from '@/utils/money';

// Surfaces transactions captured from incoming SMS (telebirr/CBE). Each one
// waits for the user: pick a category and confirm to log it, or dismiss it.
// Nothing is recorded automatically.
export default function SmsPromptBanner() {
  const { activeMonth } = useActiveMonth();
  const [pending, setPending] = useState<PendingSms[]>([]);
  const [subs, setSubs] = useState<SubcategoryRow[]>([]);
  const [pickerFor, setPickerFor] = useState<PendingSms | null>(null);

  const load = useCallback(() => {
    listPendingSms().then(setPending);
    listSubcategories(activeMonth).then(setSubs);
  }, [activeMonth]);
  useEffect(() => {
    load();
    return onDataChange(load);
  }, [load]);

  if (pending.length === 0) return null;

  const groups: { categoryName: string; rows: SubcategoryRow[] }[] = [];
  for (const s of subs) {
    let g = groups.find((x) => x.categoryName === s.categoryName);
    if (!g) { g = { categoryName: s.categoryName, rows: [] }; groups.push(g); }
    g.rows.push(s);
  }

  const assign = async (sub: SubcategoryRow) => {
    if (!pickerFor) return;
    await confirmPendingSms(pickerFor.id, sub.id, pickerFor.amountCents);
    setPickerFor(null);
  };

  return (
    <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg, backgroundColor: colors.primaryFaint, borderWidth: 1, borderColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <MessageSquareText size={18} color={colors.primary} strokeWidth={2} />
        <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '700' }}>Transactions from SMS</Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md }}>
        We spotted these in your messages. Confirm to log them, or dismiss.
      </Text>

      {pending.map((sms) => (
        <View key={sms.id} style={{ marginBottom: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '700' }}>{formatCents(sms.amountCents)}</Text>
          <Text numberOfLines={2} style={{ color: colors.textFaint, fontSize: font.size.xs, marginBottom: spacing.sm }}>{sms.body}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable
              onPress={() => (subs.length ? setPickerFor(sms) : Alert.alert('No sub-categories', 'Add one in Expense Category Management first.'))}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10 }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>Log to…</Text>
              <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
            <Button title="Dismiss" variant="ghost" onPress={() => dismissPendingSms(sms.id)} />
          </View>
        </View>
      ))}

      <BottomSheet visible={!!pickerFor} onClose={() => setPickerFor(null)} title={pickerFor ? `Log ${formatCents(pickerFor.amountCents)} to` : 'Log to'}>
        {groups.map((g) => (
          <View key={g.categoryName}>
            <SheetGroupLabel label={g.categoryName} />
            {g.rows.map((s) => (
              <SheetOption key={s.id} label={s.name} onPress={() => assign(s)} />
            ))}
          </View>
        ))}
      </BottomSheet>
    </View>
  );
}
