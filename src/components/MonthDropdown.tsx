import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onDataChange } from '@/db';
import { listMonths } from '@/data/snapshot';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import BottomSheet, { SheetOption } from '@/components/BottomSheet';
import { colors, spacing, font } from '@/theme/theme';
import { currentPeriodKey } from '@/utils/date';
import { useT, useMonthFmt } from '@/i18n';

// Compact month selector: the active month + chevron, opening a bottom sheet
// listing the current month and all past months. Months are created
// automatically, so there's no "add month" action here.
export default function MonthDropdown({ safeTop = true }: { safeTop?: boolean }) {
  const insets = useSafeAreaInsets();
  const { activeMonth, setActiveMonth } = useActiveMonth();
  const t = useT();
  const fmt = useMonthFmt();
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

  const thisMonth = currentPeriodKey();

  return (
    <View style={{ backgroundColor: colors.bg, paddingTop: safeTop ? insets.top : 0 }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Month: ${fmt.label(activeMonth)}. Tap to change.`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
        >
          <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: '800', letterSpacing: font.tracking.tight }}>
            {fmt.label(activeMonth)}
          </Text>
          <ChevronDown size={22} color={colors.textMuted} strokeWidth={2.5} />
        </Pressable>
      </View>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={t('month.select')}>
        {months.map((m) => (
          <SheetOption
            key={m.monthYear}
            label={fmt.label(m.monthYear)}
            selected={m.monthYear === activeMonth}
            onPress={() => { setActiveMonth(m.monthYear); setOpen(false); }}
            trailing={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {m.monthYear === thisMonth && (
                  <Text style={{ color: colors.primary, fontSize: font.size.xs, fontWeight: '700' }}>{t('month.now')}</Text>
                )}
                {m.isLocked && <Lock size={12} color={colors.textFaint} strokeWidth={2} />}
              </View>
            }
          />
        ))}
      </BottomSheet>
    </View>
  );
}
