import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { House, Sparkles, Settings2, BadgeCheck } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors } from '@/theme/theme';
import { useT } from '@/i18n';
import FloatingTabBar from '@/navigation/FloatingTabBar';
import TimelineScreen from '@/screens/TimelineScreen';
import BudgetScreen from '@/screens/BudgetScreen';
import InsightsScreen from '@/screens/InsightsScreen';
import ConfirmScreen from '@/screens/ConfirmScreen';
import RolloverScreen from '@/screens/RolloverScreen';
import MonthDetailScreen from '@/screens/MonthDetailScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import IncomeFormScreen from '@/screens/forms/IncomeFormScreen';
import CategoryFormScreen from '@/screens/forms/CategoryFormScreen';
import ItemFormScreen from '@/screens/forms/ItemFormScreen';
import RecordExpenseScreen from '@/screens/forms/RecordExpenseScreen';
import ReconcileScreen from '@/screens/forms/ReconcileScreen';

export type RootStackParamList = {
  Tabs: undefined;
  Budget: undefined;
  Rollover: undefined;
  MonthDetail: { monthYear: string };
  RecordExpense: { itemId?: string } | undefined;
  Reconcile: undefined;
  IncomeForm: { incomeId?: string } | undefined;
  CategoryForm: { categoryId?: string } | undefined;
  ItemForm: { categoryId?: string; itemId?: string } | undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

function tabIcon(Comp: LucideIcon) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Comp size={22} color={color} strokeWidth={focused ? 2.4 : 1.9} />
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Timeline" component={TimelineScreen} options={{ title: 'Home', tabBarIcon: tabIcon(House) }} />
      <Tab.Screen name="Confirm" component={ConfirmScreen} options={{ title: 'To confirm', tabBarIcon: tabIcon(BadgeCheck) }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarIcon: tabIcon(Sparkles) }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: tabIcon(Settings2) }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const t = useT();
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Budget" component={BudgetScreen} options={{ title: t('nav.expenseCategories') }} />
        <Stack.Screen name="Rollover" component={RolloverScreen} options={{ title: t('nav.rollover') }} />
        <Stack.Screen name="MonthDetail" component={MonthDetailScreen} options={{ title: t('nav.month') }} />
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen name="RecordExpense" component={RecordExpenseScreen} options={{ title: t('record.title') }} />
          <Stack.Screen name="Reconcile" component={ReconcileScreen} options={{ title: t('nav.reconcile') }} />
          <Stack.Screen name="IncomeForm" component={IncomeFormScreen} options={{ title: t('nav.income') }} />
          <Stack.Screen name="CategoryForm" component={CategoryFormScreen} options={{ title: t('nav.category') }} />
          <Stack.Screen
            name="ItemForm"
            component={ItemFormScreen}
            options={({ route }) => ({
              title: route.params?.itemId ? t('nav.editExpense') : route.params?.categoryId ? t('nav.newItem') : t('record.title'),
            })}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
