import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeCheck, CheckCircle2 } from 'lucide-react-native';

import ScreenTitle from '@/components/ScreenTitle';
import SavingsPromptBanner from '@/components/SavingsPromptBanner';
import SmsPromptBanner from '@/components/SmsPromptBanner';
import RecurringPromptBanner from '@/components/RecurringPromptBanner';
import { colors, spacing, font, layout } from '@/theme/theme';
import { usePendingConfirmations } from '@/data/usePendingConfirmations';
import { useT } from '@/i18n';

// A single inbox for everything awaiting the user's confirmation: transactions
// captured from SMS, recurring bills due this period, and savings to confirm at
// the end of a budget period. Each section self-hides when it has nothing.
export default function ConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { total } = usePendingConfirmations();
  const t = useT();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: layout.tabBarSpace }}
    >
      <View style={{ paddingHorizontal: spacing.lg }}>
        <ScreenTitle title={t('confirm.title')} icon={BadgeCheck} />
      </View>

      {total === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: spacing.xxl * 2, paddingHorizontal: spacing.lg }}>
          <CheckCircle2 size={48} color={colors.primary} strokeWidth={1.6} />
          <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: '700', marginTop: spacing.lg }}>
            {t('confirm.empty.title')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center', marginTop: spacing.xs }}>
            {t('confirm.empty.body')}
          </Text>
        </View>
      ) : (
        <>
          <SmsPromptBanner />
          <RecurringPromptBanner />
          <SavingsPromptBanner />
        </>
      )}
    </ScrollView>
  );
}
