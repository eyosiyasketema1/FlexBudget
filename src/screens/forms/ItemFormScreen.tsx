import React, { useEffect, useState } from 'react';
import { ScrollView, Alert, View, Text, Switch, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronDown } from 'lucide-react-native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import BottomSheet, { SheetOption } from '@/components/BottomSheet';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { addItem, updateItem, archiveItem, getItem, listActiveCategories, moveItemToCategory } from '@/data/repository';
import { toCents, formatCents } from '@/utils/money';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function ItemFormScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ItemForm'>>();
  const categoryId = route.params?.categoryId;
  const itemId = route.params?.itemId;
  const { activeMonth } = useActiveMonth();
  const t = useT();
  const [pickerOpen, setPickerOpen] = useState(false);

  const [name, setName] = useState('');
  const [cap, setCap] = useState('');
  const [rollover, setRollover] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [carry, setCarry] = useState(0);
  const [actualPreserved, setActualPreserved] = useState(0); // kept, not edited here

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [chosenCat, setChosenCat] = useState<string | undefined>(categoryId);
  const [originalCat, setOriginalCat] = useState<string | undefined>(categoryId);

  useEffect(() => {
    listActiveCategories(activeMonth).then((cats) => {
      setCategories(cats);
      if (!itemId && !categoryId && cats.length === 1) setChosenCat(cats[0].id);
    });
  }, [activeMonth, itemId, categoryId]);

  useEffect(() => {
    if (!itemId) return;
    getItem(itemId).then((row) => {
      if (!row) return;
      setName(row.name);
      setCap(formatCents(row.budgetCapCents));
      setRollover(row.rolloverEnabled);
      setRecurring(row.isRecurring);
      setCarry(row.rolloverCents);
      setActualPreserved(row.actualSpentCents);
      setChosenCat(row.categoryId);
      setOriginalCat(row.categoryId);
    });
  }, [itemId]);

  const chosenName = categories.find((c) => c.id === chosenCat)?.name ?? t('item.select');

  const openPicker = () => {
    if (categories.length === 0) {
      return Alert.alert(t('item.noMainTitle'), t('item.noMainBody'));
    }
    setPickerOpen(true);
  };

  const onSave = async () => {
    if (!name.trim()) return Alert.alert(t('item.nameFirst'));
    if (!chosenCat) return Alert.alert(t('item.pickMain'), t('item.pickMainBody'));
    const data = {
      name: name.trim(),
      budgetCapCents: toCents(cap),
      actualSpentCents: actualPreserved, // preserved; spend is recorded on Home
      rolloverEnabled: rollover,
      isRecurring: recurring,
    };
    try {
      if (itemId) {
        await updateItem(itemId, data);
        if (chosenCat !== originalCat) await moveItemToCategory(itemId, chosenCat);
      } else {
        await addItem(activeMonth, chosenCat, data);
      }
      nav.goBack();
    } catch (e) {
      Alert.alert(t('common.couldNotSave'), (e as Error).message);
    }
  };

  const onDelete = () => {
    if (!itemId) return;
    Alert.alert(t('item.removeTitle'), t('item.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.archive'), style: 'destructive', onPress: async () => { await archiveItem(itemId); nav.goBack(); } },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      {/* Main category selector */}
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '600', letterSpacing: font.tracking.caps, textTransform: 'uppercase', marginBottom: spacing.sm }}>
        {t('item.mainCategory')}
      </Text>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`Main category: ${chosenName}. Tap to change.`}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
          borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.lg,
        }}
      >
        <Text style={{ color: chosenCat ? colors.text : colors.textFaint, fontSize: font.size.md, fontWeight: '600' }}>{chosenName}</Text>
        <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
      </Pressable>

      <Field label={t('item.name')} value={name} onChangeText={setName} placeholder="Rent" />
      <Field label={t('item.budget')} value={cap} onChangeText={setCap} placeholder="0.00" keyboardType="decimal-pad" />

      <View
        style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
          borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
        }}
      >
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{t('item.rollover')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>
            {t('item.rollover.sub')}
            {itemId && carry !== 0 ? `  ${formatCents(carry)}.` : ''}
          </Text>
        </View>
        <Switch value={rollover} onValueChange={setRollover} trackColor={{ true: colors.primary, false: colors.surfaceAlt }} />
      </View>

      <View
        style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
          borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
        }}
      >
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{t('item.recurring')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>
            {t('item.recurring.sub')}
          </Text>
        </View>
        <Switch value={recurring} onValueChange={setRecurring} trackColor={{ true: colors.primary, false: colors.surfaceAlt }} />
      </View>

      <Button title={itemId ? t('common.save') : t('item.addSub')} onPress={onSave} />
      {itemId && <Button title={t('common.archive')} onPress={onDelete} variant="danger" style={{ marginTop: spacing.sm }} />}

      {/* Bottom-sheet category picker */}
      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title={itemId ? t('item.moveTo') : t('item.mainCategory')}>
        {categories.map((c) => (
          <SheetOption key={c.id} label={c.name} selected={c.id === chosenCat} onPress={() => { setChosenCat(c.id); setPickerOpen(false); }} />
        ))}
      </BottomSheet>
    </ScrollView>
  );
}
