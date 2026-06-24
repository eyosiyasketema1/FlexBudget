import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onDataChange } from '@/db';
import { listMonths } from '@/data/snapshot';
import { colors, radius, spacing, font } from '@/theme/theme';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { formatMonthShort, shiftMonth, currentMonthYear } from '@/utils/date';

// Sticky horizontal timeline banner. Shows existing months plus a couple of
// future planning slots; tap to time-travel. Lock badge marks closed months.
export default function MonthBanner() {
  const { activeMonth, setActiveMonth } = useActiveMonth();
  const insets = useSafeAreaInsets();
  const [months, setMonths] = useState<{ monthYear: string; locked: boolean }[]>([]);

  const refresh = useCallback(async () => {
    const rows = await listMonths();
    const map = new Map(rows.map((m) => [m.monthYear, m.isLocked]));

    // Build a continuous range so the banner reads like a calendar, even for
    // months that don't exist yet (future planning slates).
    const keys = new Set<string>(map.keys());
    keys.add(currentMonthYear());
    keys.add(activeMonth);
    const sorted = [...keys].sort();
    const first = sorted[0] ?? currentMonthYear();
    const last = sorted[sorted.length - 1] ?? currentMonthYear();

    const range: string[] = [];
    let cur = first;
    range.push(cur);
    while (cur < last) {
      cur = shiftMonth(cur, 1);
      range.push(cur);
    }
    // one future planning slot beyond the last
    range.push(shiftMonth(last, 1));

    setMonths(range.map((my) => ({ monthYear: my, locked: map.get(my) ?? false })));
  }, [activeMonth]);

  useEffect(() => {
    void refresh();
    return onDataChange(refresh);
  }, [refresh]);

  return (
    <View style={{ backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.hairline, paddingTop: insets.top }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm }}
      >
        {months.map(({ monthYear, locked }) => {
          const active = monthYear === activeMonth;
          const [y, m] = monthYear.split('-');
          return (
            <Pressable
              key={monthYear}
              onPress={() => setActiveMonth(monthYear)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${formatMonthShort(monthYear)} ${monthYear.split('-')[0]}${locked ? ', locked' : ''}`}
              style={{
                backgroundColor: active ? colors.primary : colors.surfaceAlt,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                alignItems: 'center',
                minWidth: 66,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    color: active ? colors.onAccent : colors.text,
                    fontWeight: '700',
                    fontSize: font.size.sm,
                  }}
                >
                  {formatMonthShort(monthYear)}
                </Text>
                {locked ? (
                  <Lock size={11} color={active ? colors.onAccent : colors.textMuted} strokeWidth={2.5} />
                ) : null}
              </View>
              <Text style={{ color: active ? colors.onAccent : colors.textFaint, fontSize: 10 }}>
                {y}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
