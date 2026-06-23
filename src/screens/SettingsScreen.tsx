import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import * as DocumentPicker from 'expo-document-picker';

import Card from '@/components/Card';
import Field from '@/components/Field';
import Button from '@/components/Button';
import { colors, spacing, font } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { collections, database } from '@/db';
import { formatMonthLabel } from '@/utils/date';
import { exportEncryptedBackup, importEncryptedBackup } from '@/data/backup';

// Settings: manage archived rows (the only place a true purge is offered) and
// restore mistakenly-archived items. Backup/restore is a Phase 4 stub.
export default function SettingsScreen() {
  const { activeMonth } = useActiveMonth();
  const [archivedItems, setArchivedItems] = useState<{ id: string; name: string }[]>([]);
  const [archivedCats, setArchivedCats] = useState<{ id: string; name: string }[]>([]);
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [items, cats] = await Promise.all([
      collections.items
        .query(Q.where('month_year', activeMonth), Q.where('is_archived', true))
        .fetch(),
      collections.categories
        .query(Q.where('month_year', activeMonth), Q.where('is_archived', true))
        .fetch(),
    ]);
    setArchivedItems(items.map((i) => ({ id: i.id, name: i.name })));
    setArchivedCats(cats.map((c) => ({ id: c.id, name: c.name })));
  }, [activeMonth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const restoreItem = async (id: string) => {
    const row = await collections.items.find(id);
    await database.write(async () => {
      await row.update((i) => {
        i.isArchived = false;
      });
    });
    void refresh();
  };

  const restoreCategory = async (id: string) => {
    const row = await collections.categories.find(id);
    await database.write(async () => {
      await row.update((c) => {
        c.isArchived = false;
      });
    });
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: '700', marginBottom: spacing.md }}>
        Settings
      </Text>

      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.sm }}>
        Archived in {formatMonthLabel(activeMonth)}
      </Text>

      {archivedCats.length === 0 && archivedItems.length === 0 && (
        <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>Nothing archived this month.</Text>
      )}

      {archivedCats.map((c) => (
        <Card key={c.id} style={{ marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text }}>{c.name} <Text style={{ color: colors.textMuted }}>(category)</Text></Text>
          <Pressable onPress={() => restoreCategory(c.id)}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Restore</Text>
          </Pressable>
        </Card>
      ))}

      {archivedItems.map((it) => (
        <Card key={it.id} style={{ marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text }}>{it.name}</Text>
          <Pressable onPress={() => restoreItem(it.id)}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Restore</Text>
          </Pressable>
        </Card>
      ))}

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />

      <Card>
        <Text style={{ color: colors.text, fontWeight: '600', marginBottom: spacing.xs }}>Encrypted backup</Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md }}>
          Export an AES-encrypted file of your local database to move data between devices — no cloud.
          You'll need the same passphrase to restore.
        </Text>
        <Field
          label="Passphrase"
          value={passphrase}
          onChangeText={setPassphrase}
          placeholder="At least 6 characters"
        />
        <Button title={busy ? 'Working…' : 'Export encrypted backup'} onPress={onExport} disabled={busy} />
        <Button
          title="Import from backup file"
          onPress={onImport}
          variant="secondary"
          disabled={busy}
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: spacing.lg }}>
        All data is stored locally on this device. Nothing is sent to a server.
      </Text>
    </ScrollView>
  );
}
