import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LucideIcon } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Tags, ShieldCheck, Download, Upload, ChevronRight, ChevronDown, CalendarClock, BellRing, MessageSquareText, Languages, CalendarDays } from 'lucide-react-native';

import Button from '@/components/Button';
import ScreenTitle from '@/components/ScreenTitle';
import BottomSheet, { SheetOption } from '@/components/BottomSheet';
import { colors, spacing, font } from '@/theme/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { useLang, LANGS, LANG_NAMES } from '@/i18n';
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
  const { t, lang, setLang, calendar, setCalendar } = useLang();
  const [busy, setBusy] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [cycleDay, setCycleDay] = useState(1);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [reminders, setReminders] = useState(false);
  const [smsOn, setSmsOn] = useState(false);

  useEffect(() => { getCycleStartDayStored().then(setCycleDay); }, []);
  useEffect(() => { getRemindersEnabled().then(setReminders); }, []);
  useEffect(() => { getSmsCaptureEnabled().then(setSmsOn); }, []);

  const toggleSms = async (on: boolean) => {
    if (on && !isSmsModuleAvailable()) {
      Alert.alert(t('alert.needBuild'), t('alert.needBuild.body'));
      return;
    }
    setSmsOn(on);
    if (on) {
      const started = await enableSmsCapture();
      await setSmsCaptureEnabled(started);
      setSmsOn(started);
      if (started) Alert.alert(t('alert.smsOn'), t('alert.smsOn.body'));
      else Alert.alert(t('alert.smsPerm'), t('alert.smsPerm.body'));
    } else {
      stopSmsCapture();
      await setSmsCaptureEnabled(false);
    }
  };

  const simulateSms = async () => {
    const sample = 'Dear customer, you have transferred ETB 250.00 to ABEBE STORE. Your balance is ETB 1,300.45. Ref 8842';
    const captured = await ingestSmsBody(sample);
    Alert.alert(captured ? t('alert.simCaptured') : t('alert.simNone'), captured ? t('alert.simCaptured.body') : t('alert.simNone.body'));
  };

  const scanNow = async () => {
    if (!isSmsModuleAvailable()) {
      Alert.alert(t('alert.needBuild'), t('alert.needBuild.scan'));
      return;
    }
    const n = await scanRecent(7);
    Alert.alert(t('alert.scanComplete'), n > 0 ? t('alert.scanFound', { n }) : t('alert.scanNone'));
  };

  const toggleReminders = async (on: boolean) => {
    setReminders(on); // optimistic
    const applied = await applyReminderSetting(on);
    await setRemindersEnabled(applied);
    setReminders(applied);
    if (on && !applied) Alert.alert(t('alert.remindersUnavailable'), t('alert.remindersUnavailable.body'));
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
      Alert.alert(t('alert.backupFailed'), (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    if (busy) return;
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const uri = picked.assets[0].uri;
    Alert.alert(t('alert.replaceAll'), t('alert.replaceAll.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('alert.restoreReplace'),
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await importBackup(uri);
            Alert.alert(t('alert.restored'), t('alert.restored.body'));
          } catch (e) {
            Alert.alert(t('alert.restoreFailed'), (e as Error).message);
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

  const hairline = <View style={{ height: 1, backgroundColor: colors.hairline }} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl }}
    >
      <ScreenTitle title={t('settings.title')} />

      <Row
        icon={Tags}
        title={t('settings.categoryMgmt')}
        subtitle={t('settings.categoryMgmt.sub')}
        onPress={() => nav.navigate('Budget')}
        right={<ChevronRight size={20} color={colors.textFaint} />}
      />
      {hairline}
      <Row
        icon={Languages}
        title={t('settings.language')}
        subtitle={LANG_NAMES[lang]}
        onPress={() => setLangOpen(true)}
        right={<ChevronRight size={20} color={colors.textFaint} />}
      />
      {hairline}
      <Row
        icon={CalendarDays}
        title={t('settings.calendar')}
        subtitle={calendar === 'ethiopian' ? t('calendar.ethiopian') : t('calendar.gregorian')}
        onPress={() => setCalOpen(true)}
        right={<ChevronRight size={20} color={colors.textFaint} />}
      />
      {hairline}
      <Row
        icon={CalendarClock}
        title={t('settings.cycle')}
        subtitle={cycleDay === 1 ? t('settings.cycle.calendar') : t('settings.cycle.startsOn', { day: ordinal(cycleDay), range: formatPeriodRange(currentPeriodKey(), cycleDay) })}
        onPress={() => setCycleOpen(true)}
        right={<ChevronRight size={20} color={colors.textFaint} />}
      />
      {hairline}
      <Row
        icon={BellRing}
        title={t('settings.reminders')}
        subtitle={t('settings.reminders.sub')}
        onPress={() => toggleReminders(!reminders)}
        right={<Switch value={reminders} onValueChange={toggleReminders} trackColor={{ true: colors.primary, false: colors.surfaceAlt }} />}
      />
      <Pressable
        onPress={async () => {
          const ok = await sendTestReminder();
          Alert.alert(ok ? t('alert.testSent') : t('alert.testFail'), ok ? t('alert.testSent.body') : t('alert.testFail.body'));
        }}
        style={{ paddingBottom: spacing.md }}
      >
        <Text style={{ color: colors.primary, fontSize: font.size.sm, fontWeight: '600' }}>{t('settings.testReminder')}</Text>
      </Pressable>
      {hairline}
      <Row
        icon={MessageSquareText}
        title={t('settings.sms')}
        subtitle={t('settings.sms.sub')}
        onPress={() => toggleSms(!smsOn)}
        right={<Switch value={smsOn} onValueChange={toggleSms} trackColor={{ true: colors.primary, false: colors.surfaceAlt }} />}
      />
      <View style={{ flexDirection: 'row', gap: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={scanNow}>
          <Text style={{ color: colors.primary, fontSize: font.size.sm, fontWeight: '600' }}>{t('settings.scanNow')}</Text>
        </Pressable>
        <Pressable onPress={simulateSms}>
          <Text style={{ color: colors.primary, fontSize: font.size.sm, fontWeight: '600' }}>{t('settings.simulate')}</Text>
        </Pressable>
      </View>
      {hairline}
      <Row
        icon={ShieldCheck}
        title={t('settings.backup')}
        subtitle={t('settings.backup.sub')}
        onPress={() => setBackupOpen((o) => !o)}
        right={backupOpen ? <ChevronDown size={20} color={colors.textFaint} /> : <ChevronRight size={20} color={colors.textFaint} />}
      />

      {backupOpen && (
        <View style={{ paddingTop: spacing.md }}>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md }}>
            {t('settings.backup.body')}
          </Text>
          <Button title={busy ? t('common.working') : t('settings.backup.do')} icon={Download} onPress={onExport} disabled={busy} />
          <Button title={t('settings.backup.restore')} icon={Upload} onPress={onImport} variant="secondary" disabled={busy} style={{ marginTop: spacing.sm }} />
        </View>
      )}

      <Text style={{ color: colors.textFaint, fontSize: font.size.xs, marginTop: spacing.xxl, textAlign: 'center' }}>
        {t('settings.localNote')}
      </Text>

      <BottomSheet visible={langOpen} onClose={() => setLangOpen(false)} title={t('settings.langSheet')}>
        {LANGS.map((l) => (
          <SheetOption key={l} label={LANG_NAMES[l]} selected={l === lang} onPress={() => { setLang(l); setLangOpen(false); }} />
        ))}
      </BottomSheet>

      <BottomSheet visible={calOpen} onClose={() => setCalOpen(false)} title={t('settings.calendarSheet')}>
        <SheetOption label={t('calendar.gregorian')} selected={calendar === 'gregorian'} onPress={() => { setCalendar('gregorian'); setCalOpen(false); }} />
        <SheetOption label={t('calendar.ethiopian')} selected={calendar === 'ethiopian'} onPress={() => { setCalendar('ethiopian'); setCalOpen(false); }} />
      </BottomSheet>

      <BottomSheet visible={cycleOpen} onClose={() => setCycleOpen(false)} title={t('settings.cycleSheet')}>
        <SheetOption label={t('settings.cycle.first')} selected={cycleDay === 1} onPress={() => chooseCycleDay(1)} />
        {Array.from({ length: 27 }, (_, i) => i + 2).map((d) => (
          <SheetOption key={d} label={ordinal(d)} selected={cycleDay === d} onPress={() => chooseCycleDay(d)} />
        ))}
      </BottomSheet>
    </ScrollView>
  );
}
