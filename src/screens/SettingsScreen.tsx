import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LucideIcon } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Tags, ShieldCheck, Download, Upload, ChevronRight, ChevronDown, CalendarClock, BellRing, MessageSquareText } from 'lucide-react-native';

import Button from '@/components/Button';
import ScreenTitle from '@/components/ScreenTitle';
import BottomSheet, { SheetOption } from '@/components/BottomSheet';
import { colors, spacing, font } from '@/theme/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { exportBackup, importBackup } from '@/data/backup';
import { getCycleStartDayStored, setCycleStartDayStored, getRemindersEnabled, setRemindersEnabled, getSmsCaptureEnabled, setSmsCaptureEnabled } from '@/data/repository';
import { ensureCurrentMonth } from '@/db/seed';
import { applyReminderSetting, sendTestReminder } from '@/utils/notifications';
import { enableSmsCapture, stopSmsCapture, isSmsModuleAvailable, ingestSmsBody, scanRecent } from '@/utils/smsReader';
import { setCycleStartDayCache, formatPeriodRange, currentPeriodKey } from '@/utils/date';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setActiveMonth } = useActiveMonth();
  const [busy, setBusy] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [cycleDay, setCycleDay] = useState(1);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [reminders, setReminders] = useState(false);
  const [smsOn, setSmsOn] = useState(false);

  useEffect(() => { getCycleStartDayStored().then(setCycleDay); }, []);
  useEffect(() => { getRemindersEnabled().then(setReminders); }, []);
  useEffect(() => { getSmsCaptureEnabled().then(setSmsOn); }, []);

  const toggleSms = async (on: boolean) => {
    if (on && !isSmsModuleAvailable()) {
      Alert.alert('Needs a full build', 'Reading SMS isn\'t available in Expo Go. Install the dev build (eas build) and try again.');
      return;
    }
    setSmsOn(on);
    if (on) {
      const started = await enableSmsCapture();
      await setSmsCaptureEnabled(started);
      setSmsOn(started);
      if (started) {
        Alert.alert('SMS reading on', 'New bank/telecom payment messages will appear on Home for you to confirm — including ones that arrived while the app was closed. Try "Simulate a transaction SMS" to see the flow now.');
      } else {
        Alert.alert('Permission needed', 'Allow SMS access for FlexBudget so it can spot your bank/telecom transactions. If you denied it, enable SMS for FlexBudget in your phone\'s app settings, then toggle this again.');
      }
    } else {
      stopSmsCapture();
      await setSmsCaptureEnabled(false);
    }
  };

  const simulateSms = async () => {
    const sample = 'Dear customer, you have transferred ETB 250.00 to ABEBE STORE. Your balance is ETB 1,300.45. Ref 8842';
    const captured = await ingestSmsBody(sample);
    Alert.alert(captured ? 'Captured a test transaction' : 'Nothing captured', captured ? 'Open Home — it\'s waiting under "Transactions from SMS" for you to confirm.' : 'The sample did not parse.');
  };

  const scanNow = async () => {
    if (!isSmsModuleAvailable()) {
      Alert.alert('Needs a full build', 'Reading real messages needs the dev build (eas build). The simulate button works without it.');
      return;
    }
    const n = await scanRecent(7);
    Alert.alert('Scan complete', n > 0 ? `Found ${n} transaction${n === 1 ? '' : 's'} in the last 7 days. Check Home.` : 'No transaction messages found in the last 7 days. Make sure SMS permission is granted, then try buying a small package and scan again.');
  };

  const toggleReminders = async (on: boolean) => {
    setReminders(on); // optimistic
    const applied = await applyReminderSetting(on);
    await setRemindersEnabled(applied);
    setReminders(applied);
    if (on && !applied) {
      Alert.alert('Reminders unavailable', 'Allow notifications for FlexBudget in your phone settings. (In Expo Go, reminders only fire in a full app build.)');
    }
  };

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
      await exportBackup();
    } catch (e) {
      Alert.alert('Backup failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    if (busy) return;
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const uri = picked.assets[0].uri;
    Alert.alert('Replace all data?', 'Restoring a backup overwrites everything currently on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore & replace',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await importBackup(uri);
            Alert.alert('Restored', 'Your data has been restored from the backup.');
          } catch (e) {
            Alert.alert('Restore failed', (e as Error).message);
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
        icon={BellRing}
        title="Spending reminders"
        subtitle="A nudge every 6 hours to log what you spent"
        onPress={() => toggleReminders(!reminders)}
        right={<Switch value={reminders} onValueChange={toggleReminders} trackColor={{ true: colors.primary, false: colors.surfaceAlt }} />}
      />
      <Pressable
        onPress={async () => {
          const ok = await sendTestReminder();
          Alert.alert(ok ? 'Test reminder sent' : 'Could not send', ok ? 'It will appear in ~2 seconds. Background the app to see the banner.' : 'Allow notifications for FlexBudget. (In Expo Go these only fire in a full app build.)');
        }}
        style={{ paddingBottom: spacing.md }}
      >
        <Text style={{ color: colors.primary, fontSize: font.size.sm, fontWeight: '600' }}>Send a test reminder now</Text>
      </Pressable>
      <View style={{ height: 1, backgroundColor: colors.hairline }} />
      <Row
        icon={MessageSquareText}
        title="Read transaction SMS"
        subtitle="Spot telebirr/CBE payments and ask you to confirm them"
        onPress={() => toggleSms(!smsOn)}
        right={<Switch value={smsOn} onValueChange={toggleSms} trackColor={{ true: colors.primary, false: colors.surfaceAlt }} />}
      />
      <View style={{ flexDirection: 'row', gap: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={scanNow}>
          <Text style={{ color: colors.primary, fontSize: font.size.sm, fontWeight: '600' }}>Scan messages now</Text>
        </Pressable>
        <Pressable onPress={simulateSms}>
          <Text style={{ color: colors.primary, fontSize: font.size.sm, fontWeight: '600' }}>Simulate (test)</Text>
        </Pressable>
      </View>
      <View style={{ height: 1, backgroundColor: colors.hairline }} />
      <Row
        icon={ShieldCheck}
        title="Backup & Restore"
        subtitle="Save a copy of your data, or restore it"
        onPress={() => setBackupOpen((o) => !o)}
        right={backupOpen ? <ChevronDown size={20} color={colors.textFaint} /> : <ChevronRight size={20} color={colors.textFaint} />}
      />

      {backupOpen && (
        <View style={{ paddingTop: spacing.md }}>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md }}>
            Save a backup file of your data to move it between devices or keep it safe — no cloud, no account. Restore it anytime.
          </Text>
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
