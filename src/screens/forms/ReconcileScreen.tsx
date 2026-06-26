import React, { useEffect, useState } from 'react';
import { ScrollView, Alert, View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronDown, Scale } from 'lucide-react-native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import Card from '@/components/Card';
import BottomSheet, { SheetOption, SheetGroupLabel } from '@/components/BottomSheet';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { useMonth } from '@/data/useMonth';
import { listSubcategories, recordExpense, SubcategoryRow } from '@/data/repository';
import { toCents, formatCents } from '@/utils/money';

// Reconciliation: instead of logging every small expense, you periodically tell
// the app how much money you actually have on hand. The app knows what you
// *should* have (income − what you've already logged). The gap is spending you
// forgot to record — you assign it to a sub-category in one tap.
export default function ReconcileScreen() {
  const nav = useNavigation();
  const { activeMonth } = useActiveMonth();
  const { totals } = useMonth(activeMonth);

  const income = totals?.totalIncomeCents ?? 0;
  const spent = totals?.totalActualCents ?? 0;
  const expected = income - spent; // what should still be on hand

  const [onHand, setOnHand] = useState('');
  const [subs, setSubs] = useState<SubcategoryRow[]>([]);
  const [chosen, setChosen] = useState<SubcategoryRow | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    listSubcategories(activeMonth).then(setSubs);
  }, [activeMonth]);

  const onHandCents = onHand.trim() === '' ? null : toCents(onHand);
  const gap = onHandCents === null ? null : expected - onHandCents; // >0 = unlogged spend

  // group subs by main category for the picker
  const groups: { categoryName: string; rows: SubcategoryRow[] }[] = [];
  for (const s of subs) {
    let g = groups.find((x) => x.categoryName === s.categoryName);
    if (!g) { g = { categoryName: s.categoryName, rows: [] }; groups.push(g); }
    g.rows.push(s);
  }

  const onLog = async () => {
    if (gap === null || gap <= 0) return;
    if (!chosen) return Alert.alert('Pick a category', 'Choose where the untracked spending belongs.');
    try {
      await recordExpense(chosen.id, gap, 'Reconciliation — untracked spending');
      Alert.alert('Caught up', `${formatCents(gap)} logged to ${chosen.name}. Your records now match your balance.`);
      nav.goBack();
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm }}>
        <Scale size={20} color={colors.text} strokeWidth={1.9} />
        <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: '700' }}>Reconcile balance</Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.lg }}>
        Don't log every coffee. Just tell the app how much money you actually have right now — it works out what you forgot to record.
      </Text>

      <Card style={{ marginBottom: spacing.lg }}>
        <Row label="Income this period" value={formatCents(income)} />
        <Row label="Logged as spent" value={`− ${formatCents(spent)}`} />
        <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: spacing.sm }} />
        <Row label="So you should have" value={formatCents(expected)} bold />
      </Card>

      <Field
        label="How much do you actually have? (wallet + account)"
        value={onHand}
        onChangeText={setOnHand}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />

      {gap !== null && gap > 0 && (
        <>
          <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.primaryFaint, borderColor: colors.primarySoft, borderWidth: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: font.size.md, marginBottom: 4 }}>
              {formatCents(gap)} spent but not logged
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              You have {formatCents(gap)} less than expected. Assign it to a category to catch up.
            </Text>
          </Card>

          <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '600', letterSpacing: font.tracking.caps, textTransform: 'uppercase', marginBottom: spacing.sm }}>
            Assign to
          </Text>
          <Pressable
            onPress={() => (subs.length ? setPickerOpen(true) : Alert.alert('No sub-categories', 'Add one in Expense Category Management first.'))}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.lg }}
          >
            <Text style={{ color: chosen ? colors.text : colors.textFaint, fontSize: font.size.md, fontWeight: '600' }}>{chosen ? `${chosen.name} · ${chosen.categoryName}` : 'Select…'}</Text>
            <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
          </Pressable>

          <Button title={`Log ${formatCents(gap)} as spent`} onPress={onLog} />
        </>
      )}

      {gap !== null && gap === 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>All caught up</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Your balance matches your records exactly.</Text>
        </Card>
      )}

      {gap !== null && gap < 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{formatCents(-gap)} more than expected</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
            You have more on hand than your records predict — maybe extra income, or a logged expense you didn't actually pay. Nothing to record here; adjust your salary or a payment if needed.
          </Text>
        </Card>
      )}

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Assign untracked spending to">
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

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: bold ? '700' : '600' }}>{value}</Text>
    </View>
  );
}
