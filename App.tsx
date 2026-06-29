import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';

import { initDatabase } from '@/db';
import { ensureCurrentMonth, seedTemplate } from '@/db/seed';
import { getCycleStartDayStored, setCycleStartDayStored, getRemindersEnabled, getSmsCaptureEnabled, hasAnyData, getOnboarded, setOnboarded, getAppLockHash } from '@/data/repository';
import { scheduleReminders } from '@/utils/notifications';
import { startSmsCapture } from '@/utils/smsReader';
import { setCycleStartDayCache, currentPeriodKey } from '@/utils/date';
import { ActiveMonthProvider } from '@/state/ActiveMonthContext';
import { LanguageProvider, getStoredLang, getStoredCalendar, Lang, CalendarSystem } from '@/i18n';
import { setLangCache, setCalendarCache } from '@/utils/date';
import RootNavigator from '@/navigation/RootNavigator';
import OnboardingScreen from '@/screens/OnboardingScreen';
import LockScreen from '@/screens/LockScreen';
import { colors } from '@/theme/theme';
import { FONT_FAMILY, fontAssets } from '@/theme/fonts';

// Apply General Sans to EVERY <Text>/<TextInput>, including ones that already
// have a style prop. defaultProps.style is ignored when a component passes its
// own style, so we patch render and merge fontFamily underneath the local
// style (local styles still win for everything except the family).
function applyGeneralSans() {
  const patch = (Comp: any) => {
    if (!Comp || Comp.__gsPatched || typeof Comp.render !== 'function') return;
    const orig = Comp.render;
    Comp.render = function (...args: any[]) {
      const el = orig.apply(this, args);
      return React.cloneElement(el, {
        style: [{ fontFamily: FONT_FAMILY }, el.props.style],
      });
    };
    Comp.__gsPatched = true;
  };
  patch(Text);
  patch(TextInput);
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialMonth, setInitialMonth] = useState<string | undefined>(undefined);
  const [initialLang, setInitialLang] = useState<Lang>('en');
  const [initialCalendar, setInitialCalendar] = useState<CalendarSystem>('gregorian');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [lockHash, setLockHash] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  // Shared post-setup tasks (reminders, sms, fonts) once a budget exists.
  const finishSetup = async () => {
    if (await getRemindersEnabled()) scheduleReminders();
    if (await getSmsCaptureEnabled()) startSmsCapture();
    try {
      await Font.loadAsync(fontAssets);
      applyGeneralSans();
    } catch {
      // Real font not present yet — keep the system font.
    }
  };

  useEffect(() => {
    (async () => {
      await initDatabase();
      const lang = await getStoredLang();
      const calendar = await getStoredCalendar();
      setInitialLang(lang);
      setInitialCalendar(calendar);
      setLangCache(lang);
      setCalendarCache(calendar);
      setCycleStartDayCache(await getCycleStartDayStored());
      setLockHash(await getAppLockHash()); // null = no app password

      // Decide first-run onboarding: only for a genuinely fresh install.
      const onboarded = await getOnboarded();
      const dataExists = await hasAnyData();
      if (!onboarded && !dataExists) {
        setNeedsOnboarding(true);
        await Font.loadAsync(fontAssets).then(applyGeneralSans).catch(() => {});
        return; // onboarding seeds the first budget
      }
      if (!onboarded && dataExists) await setOnboarded(true); // existing user upgrading

      const resolved = await ensureCurrentMonth();
      setInitialMonth(resolved);
      await finishSetup();
    })().finally(() => setReady(true));
  }, []);

  // Called when onboarding completes: persist salary day, seed the first budget.
  const completeOnboarding = async (salaryCents: number, day: number) => {
    await setCycleStartDayStored(day);
    setCycleStartDayCache(day);
    const my = currentPeriodKey();
    await seedTemplate(my, salaryCents);
    await setOnboarded(true);
    setInitialMonth(my);
    setNeedsOnboarding(false);
    await finishSetup();
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider initialLang={initialLang} initialCalendar={initialCalendar}>
        <StatusBar style="dark" />
        {needsOnboarding ? (
          <OnboardingScreen onDone={completeOnboarding} />
        ) : lockHash && !unlocked ? (
          <LockScreen expectedHash={lockHash} onUnlock={() => setUnlocked(true)} />
        ) : (
          <ActiveMonthProvider initialMonth={initialMonth}>
            <RootNavigator />
          </ActiveMonthProvider>
        )}
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
