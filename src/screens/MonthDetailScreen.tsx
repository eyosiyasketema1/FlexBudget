import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RefreshCw } from 'lucide-react-native';

import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import Card from '@/components/Card';
import { colors, spacing, font } from '@/theme/theme';
import { useMonth } from '@/data/useMonth';
import { useAllMonthSnapshots } from '@/data/useHistory';
import { rolloverByMonth } from '@/calc/analytics';
import { formatCents } from '@/utils/money';
import { formatMonthLabel } from '@/utils/date';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function MonthDetailScreen() {
  const t = useT();
  const route = useRoute<RouteProp<RootStackParamList, 'MonthDetail'>>();
  const monthYear = route.params.monthYear;
  const { snapshot } = useMonth(monthYear);
  const { snapshots } = useAllMonthSnapshots();
  const roll = rolloverByMonth(snapshots)[monthYear] ?? 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: '800', letterSpacing: font.tracking.tight, marginBottom: spacing.lg }}>
        {formatMonthLabel(monthYear)}
      </Text>

      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
          <RefreshCw size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textMuted, fontSize: font.size.xs, letterSpacing: font.tracking.caps, fontWeight: '700' }}>{t('monthDetail.rolloverFrom')}</Text>
          <Text style={{ color: roll >= 0 ? colors.text : colors.negative, fontSize: font.size.lg, fontWeight: '800' }}>{formatCents(roll)}</Text>
        </View>
      </Card>

      {snapshot ? <AnalyticsDashboard snapshot={snapshot} snapshots={snapshots} /> : <View />}
    </ScrollView>
  );
}
