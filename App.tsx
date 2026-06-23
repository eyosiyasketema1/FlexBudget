import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from '@/db';
import { ensureSeeded } from '@/db/seed';
import { ActiveMonthProvider } from '@/state/ActiveMonthContext';
import RootNavigator from '@/navigation/RootNavigator';
import { colors } from '@/theme/theme';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // First launch: create tables (local SQLite) then seed the current month.
    (async () => {
      await initDatabase();
      await ensureSeeded();
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
        <StatusBar style="light" />
        <RootNavigator />
      </ActiveMonthProvider>
    </SafeAreaProvider>
  );
}
