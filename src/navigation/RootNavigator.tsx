import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import { colors } from '@/theme/theme';
import TimelineScreen from '@/screens/TimelineScreen';
import BudgetScreen from '@/screens/BudgetScreen';
import ComparisonScreen from '@/screens/ComparisonScreen';
import InsightsScreen from '@/screens/InsightsScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import IncomeFormScreen from '@/screens/forms/IncomeFormScreen';
import CategoryFormScreen from '@/screens/forms/CategoryFormScreen';
import ItemFormScreen from '@/screens/forms/ItemFormScreen';

export type RootStackParamList = {
  Tabs: undefined;
  IncomeForm: { incomeId?: string } | undefined;
  CategoryForm: { categoryId?: string } | undefined;
  ItemForm: { categoryId: string; itemId?: string };
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

function tabIcon(label: string) {
  return ({ color }: { color: string }) => (
    <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{label}</Text>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Timeline" component={TimelineScreen} options={{ tabBarIcon: tabIcon('Home') }} />
      <Tab.Screen name="Budget" component={BudgetScreen} options={{ tabBarIcon: tabIcon('Budget') }} />
      <Tab.Screen name="Comparison" component={ComparisonScreen} options={{ tabBarIcon: tabIcon('Delta') }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarIcon: tabIcon('Insights') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: tabIcon('More') }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen name="IncomeForm" component={IncomeFormScreen} options={{ title: 'Income' }} />
          <Stack.Screen name="CategoryForm" component={CategoryFormScreen} options={{ title: 'Category' }} />
          <Stack.Screen name="ItemForm" component={ItemFormScreen} options={{ title: 'Line Item' }} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
