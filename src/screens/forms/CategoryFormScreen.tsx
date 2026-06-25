import React, { useEffect, useState } from 'react';
import { ScrollView, Alert, View, Text, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { addCategory, updateCategory, archiveCategory, getCategory } from '@/data/repository';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import type { Bucket } from '@/calc/types';

const BUCKETS: { key: Bucket | null; label: string }[] = [
  { key: 'needs', label: 'Needs' },
  { key: 'wants', label: 'Wants' },
  { key: 'church', label: 'Church' },
  { key: 'savings', label: 'Savings' },
  { key: null, label: 'None' },
];

export default function CategoryFormScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryForm'>>();
  const categoryId = route.params?.categoryId;
  const { activeMonth } = useActiveMonth();

  const [name, setName] = useState('');
  const [cap, setCap] = useState('');
  const [bucket, setBucket] = useState<Bucket | null>(null);

  useEffect(() => {
    if (!categoryId) return;
    getCategory(categoryId).then((row) => {
      if (!row) return;
      setName(row.name);
      setCap(row.allocationCapPercent != null ? String(row.allocationCapPercent) : '');
      setBucket(row.bucket);
    });
  }, [categoryId]);

  const onSave = async () => {
    if (!name.trim()) return Alert.alert('Name the category first.');
    const capValue = cap.trim() === '' ? null : Number(cap);
    if (capValue != null && (Number.isNaN(capValue) || capValue < 0 || capValue > 100)) {
      return Alert.alert('Cap must be a percent between 0 and 100.');
    }
    const data = { name: name.trim(), allocationCapPercent: capValue, bucket };
    try {
      if (categoryId) await updateCategory(categoryId, data);
      else await addCategory(activeMonth, data);
      nav.goBack();
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
    }
  };

  const onDelete = () => {
    if (!categoryId) return;
    Alert.alert('Remove category', 'Archive this category and its items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await archiveCategory(categoryId);
          nav.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <Field label="Category name" value={name} onChangeText={setName} placeholder="Essentials" />
      <Field
        label="Allocation cap % (optional)"
        value={cap}
        onChangeText={setCap}
        placeholder="e.g. 60"
        keyboardType="number-pad"
      />

      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.xs }}>
        50/30/20 bucket (optional)
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        {BUCKETS.map((b) => {
          const active = bucket === b.key;
          return (
            <Pressable
              key={b.label}
              onPress={() => setBucket(b.key)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                backgroundColor: active ? colors.primary : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: active ? colors.onAccent : colors.text, fontWeight: '600', fontSize: font.size.sm }}>
                {b.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button title={categoryId ? 'Save' : 'Add category'} onPress={onSave} />
      {categoryId && <Button title="Archive" onPress={onDelete} variant="danger" style={{ marginTop: spacing.sm }} />}
    </ScrollView>
  );
}
