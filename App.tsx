import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';

import { initDatabase, run } from '@/db';
import { ensureCurrentMonth, fullyAllocateSavings } from '@/db/seed';
import { ActiveMonthProvider } from '@/state/ActiveMonthContext';
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

  useEffect(() => {
    (async () => {
      await initDatabase();
      await ensureCurrentMonth();
      // Non-destructive: rename any legacy "Salary" income to "Salary Account".
      try {
        await run("UPDATE income_items SET label = 'Salary Account' WHERE label = 'Salary'");
        await fullyAllocateSavings();
      } catch {
        /* ignore */
      }
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
      <ActiveMonthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </ActiveMonthProvider>
    </SafeAreaProvider>
  );
}
