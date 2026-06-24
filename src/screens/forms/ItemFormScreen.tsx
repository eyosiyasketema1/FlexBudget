import React, { useEffect, useState } from 'react';
import { ScrollView, Alert, View, Text, Switch, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { addItem, updateItem, archiveItem, getItem, listActiveCategories } from '@/data/repository';
import { toCents, formatCents } from '@/utils/money';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function ItemFormScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ItemForm'>>();
  const categoryId = route.params?.categoryId;
  const itemId = route.params?.itemId;
  const { activeMonth } = useActiveMonth();

  const [name, setName] = useState('');
  const [cap, setCap] = useState('');
  const [actual, setActual] = useState('');
  const [rollover, setRollover] = useState(false);
  const [carry, setCarry] = useState(0);

  // Category picker — only when adding without a preselected category.
  const needsPicker = !itemId && !categoryId;
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [chosenCat, setChosenCat] = useState<string | undefined>(categoryId);

  useEffect(() => {
    if (!needsPicker) return;
    listActiveCategories(activeMonth).then((cats) => {
      setCategories(cats);
      if (cats.length === 1) setChosenCat(cats[0].id); // auto-pick the only one
    });
  }, [needsPicker, activeMonth]);

  useEffect(() => {
    if (!itemId) return;
    getItem(itemId).then((row) => {
      if (!row) return;
      setName(row.name);
      setCap(formatCents(row.budgetCapCents));
      setActual(formatCents(row.actualSpentCents));
      setRollover(row.rolloverEnabled);
      setCarry(row.rolloverCents);
    });
  }, [itemId]);

  const onSave = async () => {
    if (!name.trim()) return Alert.alert('Name the expense first.');
    const targetCat = categoryId ?? chosenCat;
    if (!itemId && !targetCat) {
      return Alert.alert(
        categories.length === 0 ? 'No categories yet' : 'Pick a category',
        categories.length === 0
          ? 'Create a category on the Budget tab first, then add expenses to it.'
          : 'Choose which category this expense belongs to.',
      );
    }
    const data = {
      name: name.trim(),
      budgetCapCents: toCents(cap),
      actualSpentCents: toCents(actual),
      rolloverEnabled: rollover,
    };
    try {
      if (itemId) await updateItem(itemId, data);
      else await addItem(activeMonth, targetCat!, data);
      nav.goBack();
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
    }
  };

  const onDelete = () => {
    if (!itemId) return;
    Alert.alert('Remove item', 'Archive this line item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await archiveItem(itemId);
          nav.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      {needsPicker && (
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              color: colors.textMuted, fontSize: font.size.xs, fontWeight: '600',
              letterSpacing: font.tracking.caps, textTransform: 'uppercase', marginBottom: spacing.sm,
            }}
          >
            Category
          </Text>
          {categories.length === 0 ? (
            <Text style={{ color: colors.textFaint, fontSize: font.size.sm }}>
              No categories yet — create one on the Budget tab first.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {categories.map((c) => {
                const active = chosenCat === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setChosenCat(c.id)}
                    style={{
                      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
                      borderRadius: radius.pill,
                      backgroundColor: active ? colors.ink : colors.surfaceAlt,
                      borderWidth: 1, borderColor: active ? colors.ink : colors.border,
                    }}
                  >
                    <Text style={{ color: active ? colors.onInk : colors.text, fontWeight: '600', fontSize: font.size.sm }}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}

      <Field label={itemId || categoryId ? 'Item name' : 'Expense name'} value={name} onChangeText={setName} placeholder="Rent" />
      <Field label="Budget cap" value={cap} onChangeText={setCap} placeholder="0.00" keyboardType="decimal-pad" />
      <Field label="Actual spent" value={actual} onChangeText={setActual} placeholder="0.00" keyboardType="decimal-pad" />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>Smart rollover</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>
            Carry unspent (or overspend) into next month when you copy forward.
            {itemId && carry !== 0
              ? `  Carried in this month: ${formatCents(carry)}.`
              : ''}
          </Text>
        </View>
        <Switch
          value={rollover}
          onValueChange={setRollover}
          trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
        />
      </View>

      <Button title={itemId ? 'Save' : needsPicker ? 'Add expense' : 'Add item'} onPress={onSave} />
      {itemId && <Button title="Archive" onPress={onDelete} variant="danger" style={{ marginTop: spacing.sm }} />}
    </ScrollView>
  );
}
