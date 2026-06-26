import React, { useEffect, useState } from 'react';
import { ScrollView, Alert, View, Text, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { addCategory, updateCategory, archiveCategory, getCategory } from '@/data/repository';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import type { Bucket } from '@/calc/types';

const BUCKETS: { key: Bucket | null; tkey: string }[] = [
  { key: 'needs', tkey: 'bucket.needs' },
  { key: 'wants', tkey: 'bucket.wants' },
  { key: 'church', tkey: 'bucket.church' },
  { key: 'savings', tkey: 'bucket.savings' },
  { key: null, tkey: 'bucket.none' },
];

export default function CategoryFormScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryForm'>>();
  const categoryId = route.params?.categoryId;
  const { activeMonth } = useActiveMonth();
  const t = useT();

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
    if (!name.trim()) return Alert.alert(t('category.nameFirst'));
    const capValue = cap.trim() === '' ? null : Number(cap);
    if (capValue != null && (Number.isNaN(capValue) || capValue < 0 || capValue > 100)) {
      return Alert.alert(t('category.capError'));
    }
    const data = { name: name.trim(), allocationCapPercent: capValue, bucket };
    try {
      if (categoryId) await updateCategory(categoryId, data);
      else await addCategory(activeMonth, data);
      nav.goBack();
    } catch (e) {
      Alert.alert(t('common.couldNotSave'), (e as Error).message);
    }
  };

  const onDelete = () => {
    if (!categoryId) return;
    Alert.alert(t('category.removeTitle'), t('category.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.archive'),
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
      <Field label={t('category.name')} value={name} onChangeText={setName} placeholder="Essentials" />
      <Field
        label={t('category.cap')}
        value={cap}
        onChangeText={setCap}
        placeholder="e.g. 60"
        keyboardType="number-pad"
      />

      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.xs }}>
        {t('category.bucketOptional')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        {BUCKETS.map((b) => {
          const active = bucket === b.key;
          return (
            <Pressable
              key={b.tkey}
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
                {t(b.tkey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button title={categoryId ? t('common.save') : t('category.add')} onPress={onSave} />
      {categoryId && <Button title={t('common.archive')} onPress={onDelete} variant="danger" style={{ marginTop: spacing.sm }} />}
    </ScrollView>
  );
}
