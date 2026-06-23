import React, { useEffect, useState } from 'react';
import { ScrollView, Alert, View, Text, Switch } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import { colors, spacing, font } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { collections } from '@/db';
import { addItem, updateItem, archiveItem } from '@/data/repository';
import { toCents, formatCents } from '@/utils/money';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function ItemFormScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ItemForm'>>();
  const { categoryId, itemId } = route.params;
  const { activeMonth } = useActiveMonth();

  const [name, setName] = useState('');
  const [cap, setCap] = useState('');
  const [actual, setActual] = useState('');
  const [rollover, setRollover] = useState(false);
  const [carry, setCarry] = useState(0);

  useEffect(() => {
    if (!itemId) return;
    collections.items.find(itemId).then((row) => {
      setName(row.name);
      setCap(formatCents(row.budgetCapCents));
      setActual(formatCents(row.actualSpentCents));
      setRollover(row.rolloverEnabled);
      setCarry(row.rolloverCents);
    });
  }, [itemId]);

  const onSave = async () => {
    if (!name.trim()) return Alert.alert('Name the item first.');
    const data = {
      name: name.trim(),
      budgetCapCents: toCents(cap),
      actualSpentCents: toCents(actual),
      rolloverEnabled: rollover,
    };
    try {
      if (itemId) await updateItem(itemId, data);
      else await addItem(activeMonth, categoryId, data);
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
      <Field label="Item name" value={name} onChangeText={setName} placeholder="Rent" />
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

      <Button title={itemId ? 'Save' : 'Add item'} onPress={onSave} />
      {itemId && <Button title="Archive" onPress={onDelete} variant="danger" style={{ marginTop: spacing.sm }} />}
    </ScrollView>
  );
}
