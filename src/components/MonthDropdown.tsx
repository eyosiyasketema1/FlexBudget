import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { ChevronDown, Check, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onDataChange } from '@/db';
import { listMonths } from '@/data/snapshot';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { colors, radius, spacing, font, elevation } from '@/theme/theme';
import { formatMonthLabel, currentMonthYear } from '@/utils/date';

// Compact month selector: shows the active month with a chevron; tapping opens
// a dropdown listing the current month and all past months. Months are created
// automatically, so there is no "add month" action here.
export default function MonthDropdown({ safeTop = true }: { safeTop?: boolean }) {
  const insets = useSafeAreaInsets();
  const { activeMonth, setActiveMonth } = useActiveMonth();
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState<{ monthYear: string; isLocked: boolean }[]>([]);

  const refresh = useCallback(async () => {
    const rows = await listMonths();
    setMonths(rows.slice().reverse()); // newest first
  }, []);

  useEffect(() => {
    void refresh();
    return onDataChange(refresh);
  }, [refresh]);

  const thisMonth = currentMonthYear();

  return (
    <View style={{ backgroundColor: colors.bg, paddingTop: safeTop ? insets.top : 0 }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Month: ${formatMonthLabel(activeMonth)}. Tap to change.`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
        >
          <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: '800', letterSpacing: font.tracking.tight }}>
            {formatMonthLabel(activeMonth)}
          </Text>
          <ChevronDown size={22} color={colors.textMuted} strokeWidth={2.5} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} onPress={() => setOpen(false)}>
          <View style={{ marginTop: insets.top + 52, marginHorizontal: spacing.lg }}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
                ...elevation.floating,
              }}
            >
              <ScrollView style={{ maxHeight: 320 }}>
                {months.map((m, i) => {
                  const active = m.monthYear === activeMonth;
                  return (
                    <Pressable
                      key={m.monthYear}
                      onPress={() => {
                        setActiveMonth(m.monthYear);
                        setOpen(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.lg,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: colors.hairline,
                        backgroundColor: active ? colors.surfaceAlt : 'transparent',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: active ? '700' : '500' }}>
                          {formatMonthLabel(m.monthYear)}
                        </Text>
                        {m.monthYear === thisMonth && (
                          <Text style={{ color: colors.primary, fontSize: font.size.xs, fontWeight: '700' }}>NOW</Text>
                        )}
                        {m.isLocked && <Lock size={12} color={colors.textFaint} strokeWidth={2} />}
                      </View>
                      {active && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
