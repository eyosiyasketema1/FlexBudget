import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LucideIcon } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Tags, ShieldCheck, Download, Upload, ChevronRight, ChevronDown, CalendarClock } from 'lucide-react-native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import ScreenTitle from '@/components/ScreenTitle';
import BottomSheet, { SheetOption } from '@/components/BottomSheet';
import { colors, spacing, font } from '@/theme/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { exportEncryptedBackup, importEncryptedBackup } from '@/data/backup';
import { getCycleStartDayStored, setCycleStartDayStored } from '@/data/repository';
import { ensureCurrentMonth } from '@/db/seed';
import { setCycleStartDayCache, formatPeriodRange, currentPeriodKey } from '@/utils/date';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setActiveMonth } = useActiveMonth();
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [cycleDay, setCycleDay] = useState(1);
  const [cycleOpen, setCycleOpen] = useState(false);

  useEffect(() => { getCycleStartDayStored().then(setCycleDay); }, []);

  // Safe: ensureCurrentMonth is guarded so it never creates a backwards/dummy
  // period; it returns the real period to land on.
  const chooseCycleDay = async (day: number) => {
    await setCycleStartDayStored(day);
    setCycleStartDayCache(day);
    const resolved = await ensureCurrentMonth();
    setActiveMonth(resolved);
    setCycleDay(day);
    setCycleOpen(false);
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
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const uri = picked.assets[0].uri;
    Alert.alert('Replace all data?', 'Importing a backup overwrites everything currently on this device.', [
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
          } catch (e) {
            Alert.alert('Import failed', (e as Error).message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const Row = ({ icon: Icon, title, subtitle, onPress, right }: {
    icon: LucideIcon; title: string; subtitle: string; onPress: () => void; right: React.ReactNode;
  }) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg }}>
      <Icon size={20} color={colors.text} strokeWidth={1.9} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: colors.textFaint, fontSize: font.size.xs }}>{subtitle}</Text>
      </View>
      {right}
    </Pressable>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl }}
    >
      <ScreenTitle title="Settings" />

      <Row
        icon={Tags}
        title="Expense Category Management"
        subtitle="Add, edit, move & organize categories"
        onPress={() => nav.navigate('Budget')}
        right={<ChevronRight size={20} color={colors.textFaint} />}
      />
      <View style={{ height: 1, backgroundColor: colors.hairline }} />
      <Row
        icon={CalendarClock}
        title="Budget cycle"
        subtitle={cycleDay === 1 ? 'Calendar month (1st–end)' : `Starts on the ${ordinal(cycleDay)} · ${formatPeriodRange(currentPeriodKey(), cycleDay)}`}
        onPress={() => setCycleOpen(true)}
        right={<ChevronRight size={20} color={colors.textFaint} />}
      />
      <View style={{ height: 1, backgroundColor: colors.hairline }} />
      <Row
        icon={ShieldCheck}
        title="Encrypted Backup"
        subtitle="Export or restore your data"
        onPress={() => setBackupOpen((o) => !o)}
        right={backupOpen ? <ChevronDown size={20} color={colors.textFaint} /> : <ChevronRight size={20} color={colors.textFaint} />}
      />

      {backupOpen && (
        <View style={{ paddingTop: spacing.md }}>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md }}>
            Save a backup file of your data to move it between devices — no cloud. Leave the passphrase blank for a quick backup, or set one to encrypt it (you'll need it to restore).
          </Text>
          <Field label="Passphrase (optional)" value={passphrase} onChangeText={setPassphrase} placeholder="Leave blank, or 6+ characters to encrypt" />
          <Button title={busy ? 'Working…' : 'Back up my data'} icon={Download} onPress={onExport} disabled={busy} />
          <Button title="Restore from file" icon={Upload} onPress={onImport} variant="secondary" disabled={busy} style={{ marginTop: spacing.sm }} />
        </View>
      )}

      <Text style={{ color: colors.textFaint, fontSize: font.size.xs, marginTop: spacing.xxl, textAlign: 'center' }}>
        All data is stored locally on this device. Nothing is sent to a server.
      </Text>

      <BottomSheet visible={cycleOpen} onClose={() => setCycleOpen(false)} title="Budget cycle starts on">
        <SheetOption label="1st (calendar month)" selected={cycleDay === 1} onPress={() => chooseCycleDay(1)} />
        {Array.from({ length: 27 }, (_, i) => i + 2).map((d) => (
          <SheetOption key={d} label={ordinal(d)} selected={cycleDay === d} onPress={() => chooseCycleDay(d)} />
        ))}
      </BottomSheet>
    </ScrollView>
  );
}
