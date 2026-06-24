import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { Settings2, RotateCcw, ShieldCheck, Download, Upload, Archive, Sparkles, ChevronRight } from 'lucide-react-native';

import Card from '@/components/Card';
import Field from '@/components/Field';
import Button from '@/components/Button';
import ScreenTitle from '@/components/ScreenTitle';
import SectionHeader from '@/components/SectionHeader';
import { colors, spacing, font, layout } from '@/theme/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { onDataChange } from '@/db';
import { listArchived, restoreItem, restoreCategory } from '@/data/repository';
import { formatMonthLabel } from '@/utils/date';
import { exportEncryptedBackup, importEncryptedBackup } from '@/data/backup';

// Settings: manage archived rows (the only place a true purge is offered) and
// restore mistakenly-archived items. Backup/restore is a Phase 4 stub.
export default function SettingsScreen() {
  const { activeMonth } = useActiveMonth();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [archivedItems, setArchivedItems] = useState<{ id: string; name: string }[]>([]);
  const [archivedCats, setArchivedCats] = useState<{ id: string; name: string }[]>([]);
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { items, categories } = await listArchived(activeMonth);
    setArchivedItems(items);
    setArchivedCats(categories);
  }, [activeMonth]);

  useEffect(() => {
    void refresh();
    return onDataChange(refresh);
  }, [refresh]);

  const onRestoreItem = async (id: string) => {
    await restoreItem(id);
    void refresh();
  };

  const onRestoreCategory = async (id: string) => {
    await restoreCategory(id);
    void refresh();
  };

  const onExport = async () => {
    if (busy) return;
    try {
      setBusy(true);
      await exportEncryptedBackup(passphrase);
      setPassphrase('');
    } catch (e) {
      Alert.alert('Export failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    if (busy) return;
    if (passphrase.length < 6) return Alert.alert('Enter the backup passphrase first (6+ chars).');
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const uri = picked.assets[0].uri;
    Alert.alert(
      'Replace all data?',
      'Importing a backup overwrites everything currently on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import & replace',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              await importEncryptedBackup(uri, passphrase);
              setPassphrase('');
              Alert.alert('Restored', 'Your data has been restored from the backup.');
              void refresh();
            } catch (e) {
              Alert.alert('Import failed', (e as Error).message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const RestoreRow = ({ id, name, suffix, onPress }: { id: string; name: string; suffix?: string; onPress: () => void }) => (
    <Card key={id} style={{ marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
        <Archive size={17} color={colors.textFaint} strokeWidth={2} />
        <Text style={{ color: colors.text }}>
          {name}
          {suffix ? <Text style={{ color: colors.textFaint }}> {suffix}</Text> : null}
        </Text>
      </View>
      <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <RotateCcw size={15} color={colors.primary} strokeWidth={2.25} />
        <Text style={{ color: colors.primary, fontWeight: '600' }}>Restore</Text>
      </Pressable>
    </Card>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: layout.tabBarSpace }}
    >
      <ScreenTitle title="Settings" icon={Settings2} />

      <Pressable onPress={() => nav.navigate('Insights')} accessibilityRole="button" accessibilityLabel="Open Insights">
        <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 40, height: 40, borderRadius: 12, marginRight: spacing.md,
              backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Sparkles size={20} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: font.size.md }}>Insights</Text>
            <Text style={{ color: colors.textFaint, fontSize: font.size.xs }}>
              Budget vs actual, trends, runway & 50/30/20
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textFaint} />
        </Card>
      </Pressable>

      <SectionHeader title={`Archived in ${formatMonthLabel(activeMonth)}`} />

      {archivedCats.length === 0 && archivedItems.length === 0 && (
        <Text style={{ color: colors.textFaint, marginBottom: spacing.lg }}>Nothing archived this month.</Text>
      )}

      {archivedCats.map((c) => (
        <RestoreRow key={c.id} id={c.id} name={c.name} suffix="(category)" onPress={() => onRestoreCategory(c.id)} />
      ))}
      {archivedItems.map((it) => (
        <RestoreRow key={it.id} id={it.id} name={it.name} onPress={() => onRestoreItem(it.id)} />
      ))}

      <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: spacing.lg }} />

      <SectionHeader title="Encrypted backup" />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <ShieldCheck size={20} color={colors.primary} strokeWidth={2} />
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: font.size.md }}>Move data between devices</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md }}>
          Export an AES-encrypted file of your local database — no cloud. You'll need the same passphrase to restore.
        </Text>
        <Field label="Passphrase" value={passphrase} onChangeText={setPassphrase} placeholder="At least 6 characters" />
        <Button title={busy ? 'Working…' : 'Export encrypted backup'} icon={Download} onPress={onExport} disabled={busy} />
        <Button title="Import from backup file" icon={Upload} onPress={onImport} variant="secondary" disabled={busy} style={{ marginTop: spacing.sm }} />
      </Card>

      <Text style={{ color: colors.textFaint, fontSize: font.size.xs, marginTop: spacing.lg, textAlign: 'center' }}>
        All data is stored locally on this device. Nothing is sent to a server.
      </Text>
    </ScrollView>
  );
}
