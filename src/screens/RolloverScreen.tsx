import React from 'react';
import { View, Text, ScrollView } from 'react-native';

import Card from '@/components/Card';
import { colors, spacing, font } from '@/theme/theme';
import { useAllMonthSnapshots } from '@/data/useHistory';
import { computeSavingsRollover } from '@/calc/analytics';
import { formatCents, formatSignedCents } from '@/utils/money';
import { formatMonthLabel } from '@/utils/date';
import { useT } from '@/i18n';
import type { RolloverEntry } from '@/calc/analytics';

export default function RolloverScreen() {
  const t = useT();
  const { snapshots } = useAllMonthSnapshots();
  const { rolloverTotalCents, entries } = computeSavingsRollover(snapshots);

  // group entries by month, preserving newest-first order
  const groups: { monthYear: string; rows: RolloverEntry[] }[] = [];
  for (const e of entries) {
    let g = groups.find((x) => x.monthYear === e.monthYear);
    if (!g) { g = { monthYear: e.monthYear, rows: [] }; groups.push(g); }
    g.rows.push(e);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '700' }}>{t('rollover.pool')}</Text>
        <Text style={{ color: rolloverTotalCents >= 0 ? colors.text : colors.negative, fontSize: font.size.display, fontWeight: '800', letterSpacing: font.tracking.tight }}>
          {formatCents(rolloverTotalCents)}
        </Text>
        <Text style={{ color: colors.textFaint, fontSize: font.size.sm }}>{t('rollover.poolSub')}</Text>
      </Card>

      {groups.length === 0 ? (
        <Text style={{ color: colors.textFaint, textAlign: 'center', marginTop: spacing.xl }}>
          {t('rollover.emptyLong')}
        </Text>
      ) : (
        groups.map((g) => (
          <View key={g.monthYear} style={{ marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '700', letterSpacing: font.tracking.caps, textTransform: 'uppercase', marginBottom: spacing.sm }}>
              {formatMonthLabel(g.monthYear)}
            </Text>
            <Card>
              {g.rows.map((r, i) => (
                <View
                  key={r.categoryName + i}
                  style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingVertical: spacing.sm,
                    borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.hairline,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: font.size.sm }}>{r.categoryName}</Text>
                  <Text style={{ color: r.amountCents >= 0 ? colors.positive : colors.negative, fontSize: font.size.sm, fontWeight: '600' }}>
                    {formatSignedCents(r.amountCents)}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
    </ScrollView>
  );
}
