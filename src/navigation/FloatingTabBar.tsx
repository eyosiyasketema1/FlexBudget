import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radius, elevation } from '@/theme/theme';

// A floating, frosted-glass navigation bar — detached from the bottom edge,
// rounded, blurring the content beneath it. Each tab shows an icon above its
// label. Active tab uses ink (near-black); inactive uses muted gray.
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
        alignItems: 'center', // hug content + center the pill
        paddingBottom: Math.max(insets.bottom, 8) + 6,
      }}
    >
      <BlurView
        intensity={Platform.OS === 'android' ? 60 : 50}
        tint="light"
        // Enables a real blur on Android (otherwise BlurView is just a tint).
        experimentalBlurMethod="dimezisBlurView"
        style={{
          borderRadius: radius.pill, // fully rounded
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.55)',
          ...elevation.floating,
        }}
      >
        {/* light wash so the frosted glass reads over white content */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.35)',
            paddingVertical: 8,
            paddingHorizontal: 8,
            gap: 6,
          }}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const Icon = options.tabBarIcon;
            const label =
              typeof options.title === 'string' ? options.title : route.name;

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
                android_ripple={null}
                unstable_pressDelay={0}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: focused ? colors.ink : 'transparent',
                }}
              >
                {Icon ? Icon({ focused, color: focused ? colors.onInk : colors.textMuted, size: 23 }) : null}
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
