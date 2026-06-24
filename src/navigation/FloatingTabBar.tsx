import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radius, elevation } from '@/theme/theme';

// A floating pill navigation bar — detached from the bottom edge, rounded,
// with each tab as a circle and the active tab filled black (iOS-style float,
// works identically on Android). Icons only, for a clean minimal bar.
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingBottom: Math.max(insets.bottom, 10) + 6,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: colors.surface,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 6,
          paddingVertical: 6,
          ...elevation.floating,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const Icon = options.tabBarIcon;
          const label =
            (options.tabBarAccessibilityLabel as string | undefined) ??
            (typeof options.title === 'string' ? options.title : route.name);

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={{
                width: 50,
                height: 50,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? colors.ink : 'transparent',
              }}
            >
              {Icon
                ? Icon({
                    focused,
                    color: focused ? colors.onInk : colors.textMuted,
                    size: 22,
                  })
                : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
