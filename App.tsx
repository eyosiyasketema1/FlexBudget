import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from '@nozbe/watermelondb/react';

import { database } from '@/db';
import { ensureSeeded } from '@/db/seed';
import { ActiveMonthProvider } from '@/state/ActiveMonthContext';
import RootNavigator from '@/navigation/RootNavigator';
import { colors } from '@/theme/theme';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // First launch: make sure at least the current month exists.
    ensureSeeded().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <DatabaseProvider database={database}>
      <SafeAreaProvider>
        <ActiveMonthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </ActiveMonthProvider>
      </SafeAreaProvider>
    </DatabaseProvider>
  );
}
