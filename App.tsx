import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';

import { initDatabase } from '@/db';
import { ensureCurrentMonth } from '@/db/seed';
import { getCycleStartDayStored, getRemindersEnabled, getSmsCaptureEnabled } from '@/data/repository';
import { scheduleReminders } from '@/utils/notifications';
import { startSmsCapture } from '@/utils/smsReader';
import { setCycleStartDayCache } from '@/utils/date';
import { ActiveMonthProvider } from '@/state/ActiveMonthContext';
import { LanguageProvider, getStoredLang, Lang } from '@/i18n';
import RootNavigator from '@/navigation/RootNavigator';
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

  useEffect(() => {
    (async () => {
      await initDatabase();
      setInitialLang(await getStoredLang());
      // Load the pay-cycle start day, then resolve the current period safely.
      setCycleStartDayCache(await getCycleStartDayStored());
      const resolved = await ensureCurrentMonth();
      setInitialMonth(resolved);
      // Re-arm reminders if the user has them on (schedules persist, but this
      // keeps them alive across reinstalls / cleared schedules).
      if (await getRemindersEnabled()) scheduleReminders();
      if (await getSmsCaptureEnabled()) startSmsCapture();
      try {
        await Font.loadAsync(fontAssets);
        applyGeneralSans();
      } catch {
        // Real font not present yet — keep the system font.
      }
    })().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider initialLang={initialLang}>
        <ActiveMonthProvider initialMonth={initialMonth}>
          <StatusBar style="dark" />
          <RootNavigator />
        </ActiveMonthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
