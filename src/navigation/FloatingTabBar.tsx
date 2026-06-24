import React from 'react';
import { View, Pressable, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radius, font, elevation } from '@/theme/theme';

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
        paddingHorizontal: 18,
        paddingBottom: Math.max(insets.bottom, 8) + 6,
      }}
    >
      <BlurView
        intensity={Platform.OS === 'android' ? 25 : 40}
        tint="light"
        style={{
          borderRadius: 28,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.06)',
          ...elevation.floating,
        }}
      >
        {/* translucent white wash so the glass reads on white content */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(255,255,255,0.55)',
            paddingVertical: 10,
            paddingHorizontal: 6,
          }}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const Icon = options.tabBarIcon;
            const label =
              typeof options.title === 'string' ? options.title : route.name;
            const tint = focused ? colors.ink : colors.textMuted;

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
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 2 }}
              >
                {Icon ? Icon({ focused, color: tint, size: 22 }) : null}
                <Text style={{ color: tint, fontSize: 11, fontWeight: focused ? '700' : '500' }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
