import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { House, BadgeCheck, Sparkles, Tags } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import Card from '@/components/Card';
import { colors, spacing, font } from '@/theme/theme';
import { useT } from '@/i18n';

// A short "show me around" of the basics, reachable from Settings.
export default function HelpScreen() {
  const t = useT();

  const items: { icon: LucideIcon; tk: string; bk: string }[] = [
    { icon: House, tk: 'help.home.t', bk: 'help.home.b' },
    { icon: BadgeCheck, tk: 'help.confirm.t', bk: 'help.confirm.b' },
    { icon: Sparkles, tk: 'help.insights.t', bk: 'help.insights.b' },
    { icon: Tags, tk: 'help.categories.t', bk: 'help.categories.b' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      {items.map(({ icon: Icon, tk, bk }) => (
        <Card key={tk} style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryFaint, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
            <Icon size={19} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '700', marginBottom: 2 }}>{t(tk)}</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{t(bk)}</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
