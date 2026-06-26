import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radius, elevation, font } from '@/theme/theme';
import { usePendingConfirmations } from '@/data/usePendingConfirmations';

const BAR_HEIGHT = 68; // inner circle (52) + vertical padding (8 + 8)

// A floating, frosted-glass navigation bar — detached from the bottom edge,
// rounded, blurring the content beneath it. Each tab shows an icon above its
// label. Active tab uses ink (near-black); inactive uses muted gray.
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { total: pendingCount } = usePendingConfirmations();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center', // center the nav+button group
        paddingBottom: Math.max(insets.bottom, 8) + 6,
      }}
    >
      {/* nav pill + circular add button, centered as a group */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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

            const showBadge = route.name === 'Confirm' && pendingCount > 0;

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={showBadge ? `${label}, ${pendingCount} pending` : label}
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
                {showBadge ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      minWidth: 18,
                      height: 18,
                      paddingHorizontal: 4,
                      borderRadius: 9,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.onInk, fontSize: font.size.xs, fontWeight: '800' }}>
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </BlurView>

      {/* Circular add-expense button — same height as the nav pill */}
      <Pressable
        onPress={() => navigation.navigate('RecordExpense' as never)}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
        android_ripple={null}
        style={{ width: BAR_HEIGHT, height: BAR_HEIGHT, borderRadius: radius.pill, overflow: 'hidden' }}
      >
        <BlurView
          intensity={Platform.OS === 'android' ? 60 : 50}
          tint="light"
          experimentalBlurMethod="dimezisBlurView"
          style={{
            flex: 1,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
            ...elevation.floating,
          }}
        >
          <View
            style={{
              flex: 1,
              alignSelf: 'stretch',
              backgroundColor: 'rgba(255,255,255,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={28} color={colors.ink} strokeWidth={2.25} />
          </View>
        </BlurView>
      </Pressable>
      </View>
    </View>
  );
}
