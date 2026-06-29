import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { Minus, Plus, Clock, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import Card from '@/components/Card';
import { showDialog } from '@/components/Dialog';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useT } from '@/i18n';
import {
  getRemindersEnabled, setRemindersEnabled, getReminderCount, setReminderCount,
  getReminderSound, setReminderSound, getReminderWindow, setReminderStart, setReminderEnd,
} from '@/data/repository';
import { applyReminderSetting, scheduleReminders, sendTestReminder } from '@/utils/notifications';

const fmt = (h: number, m: number) => {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
};

// "Set reminder" screen: enable, how many per day, sound, and a start–end window.
export default function ReminderScreen() {
  const t = useT();
  const [enabled, setEnabled] = useState(false);
  const [count, setCount] = useState(1);
  const [sound, setSound] = useState(true);
  const [win, setWin] = useState({ startH: 8, startM: 0, endH: 20, endM: 0 });
  const [picking, setPicking] = useState<null | 'start' | 'end'>(null);

  useEffect(() => {
    getRemindersEnabled().then(setEnabled);
    getReminderCount().then(setCount);
    getReminderSound().then(setSound);
    getReminderWindow().then(setWin);
  }, []);

  // After any change, reschedule if enabled.
  const reschedule = async () => { if (await getRemindersEnabled()) await scheduleReminders(); };

  const toggleEnable = async (on: boolean) => {
    setEnabled(on);
    const applied = await applyReminderSetting(on);
    await setRemindersEnabled(applied);
    setEnabled(applied);
    if (on && !applied) showDialog(t('alert.remindersUnavailable'), t('alert.remindersUnavailable.body'));
  };

  const changeCount = async (delta: number) => {
    const n = Math.min(12, Math.max(1, count + delta));
    setCount(n);
    await setReminderCount(n);
    await reschedule();
  };

  const toggleSound = async (on: boolean) => {
    setSound(on);
    await setReminderSound(on);
    await reschedule();
  };

  const onPickTime = async (_e: any, d?: Date) => {
    const which = picking;
    setPicking(null);
    if (!d || !which) return;
    const h = d.getHours(), m = d.getMinutes();
    if (which === 'start') { setWin((w) => ({ ...w, startH: h, startM: m })); await setReminderStart(h, m); }
    else { setWin((w) => ({ ...w, endH: h, endM: m })); await setReminderEnd(h, m); }
    await reschedule();
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: font.size.md }}>{label}</Text>
      {children}
    </View>
  );

  const TimeField = ({ label, h, m, which }: { label: string; h: number; m: number; which: 'start' | 'end' }) => (
    <View style={{ marginTop: spacing.md }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '600', letterSpacing: font.tracking.caps, textTransform: 'uppercase', marginBottom: spacing.sm }}>{label}</Text>
      <Pressable
        onPress={() => setPicking(which)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color={colors.textMuted} strokeWidth={2} />
          <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '600' }}>{fmt(h, m)}</Text>
        </View>
        <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <Card>
        <Row label={t('reminder.enable')}>
          <Switch value={enabled} onValueChange={toggleEnable} trackColor={{ true: colors.primary, false: colors.surfaceAlt }} />
        </Row>
        <View style={{ height: 1, backgroundColor: colors.hairline }} />

        <Row label={t('reminder.howMany')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '800' }}>{count}×</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
              <Pressable onPress={() => changeCount(-1)} hitSlop={6} style={{ paddingHorizontal: spacing.md, paddingVertical: 8 }}>
                <Minus size={18} color={count > 1 ? colors.text : colors.textFaint} strokeWidth={2.2} />
              </Pressable>
              <View style={{ width: 1, height: 20, backgroundColor: colors.border }} />
              <Pressable onPress={() => changeCount(1)} hitSlop={6} style={{ paddingHorizontal: spacing.md, paddingVertical: 8 }}>
                <Plus size={18} color={count < 12 ? colors.text : colors.textFaint} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>
        </Row>
        <View style={{ height: 1, backgroundColor: colors.hairline }} />

        <Row label={t('reminder.sound')}>
          <Switch value={sound} onValueChange={toggleSound} trackColor={{ true: colors.primary, false: colors.surfaceAlt }} />
        </Row>

        <TimeField label={t('reminder.start')} h={win.startH} m={win.startM} which="start" />
        <TimeField label={t('reminder.end')} h={win.endH} m={win.endM} which="end" />
      </Card>

      <Text style={{ color: colors.textFaint, fontSize: font.size.xs, marginTop: spacing.md }}>
        {t('reminder.windowNote')}
      </Text>

      <Pressable
        onPress={async () => {
          const ok = await sendTestReminder();
          showDialog(ok ? t('alert.testSent') : t('alert.testFail'), ok ? t('alert.testSent.body') : t('alert.testFail.body'));
        }}
        style={{ paddingVertical: spacing.lg }}
      >
        <Text style={{ color: colors.primary, fontSize: font.size.sm, fontWeight: '600' }}>{t('settings.testReminder')}</Text>
      </Pressable>

      {picking && (
        <DateTimePicker
          value={new Date(2000, 0, 1, picking === 'start' ? win.startH : win.endH, picking === 'start' ? win.startM : win.endM)}
          mode="time"
          onChange={onPickTime}
        />
      )}
    </ScrollView>
  );
}
