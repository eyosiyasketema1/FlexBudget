import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { showDialog } from '@/components/Dialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, PiggyBank, Wallet, MessageSquareText, BadgeCheck } from 'lucide-react-native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import BottomSheet, { SheetOption } from '@/components/BottomSheet';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useLang, LANGS, LANG_NAMES } from '@/i18n';
import { toCents } from '@/utils/money';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// First-launch onboarding: introduce the core features, then collect the user's
// salary and salary day so we can seed their first budget.
export default function OnboardingScreen({ onDone }: { onDone: (salaryCents: number, day: number) => void }) {
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useLang();
  const [salary, setSalary] = useState('');
  const [day, setDay] = useState(1);
  const [dayOpen, setDayOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const finish = () => {
    const cents = toCents(salary);
    if (cents <= 0) return showDialog(t('onboard.enterSalary'));
    onDone(cents, day);
  };

  const Feature = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryFaint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={{ color: colors.text, fontSize: font.size.sm, flex: 1 }}>{text}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }}>
        {/* language switch, top-right */}
        <Pressable onPress={() => setLangOpen(true)} style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md }}>
          <Text style={{ color: colors.primary, fontSize: font.size.sm, fontWeight: '600' }}>{LANG_NAMES[lang]}</Text>
          <ChevronDown size={16} color={colors.primary} strokeWidth={2} />
        </Pressable>

        <Text style={{ color: colors.text, fontSize: font.size.display, fontWeight: '800', letterSpacing: font.tracking.tight }}>
          {t('onboard.welcomeTitle')}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.md, marginTop: spacing.sm, marginBottom: spacing.xl }}>
          {t('onboard.welcomeSub')}
        </Text>

        <Feature icon={Wallet} text={t('onboard.feature1')} />
        <Feature icon={MessageSquareText} text={t('onboard.feature2')} />
        <Feature icon={PiggyBank} text={t('onboard.feature3')} />

        <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: spacing.xl }} />

        <Field label={t('onboard.salaryQ')} value={salary} onChangeText={setSalary} placeholder="0.00" keyboardType="decimal-pad" />

        <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.sm }}>{t('onboard.dayQ')}</Text>
        <Pressable
          onPress={() => setDayOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.lg }}
        >
          <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '600' }}>
            {day === 1 ? t('settings.cycle.first') : t('settings.cycle.fromDay', { day: ordinal(day) })}
          </Text>
          <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
        </Pressable>

        <Button title={t('onboard.start')} icon={BadgeCheck} onPress={finish} />
        <Text style={{ color: colors.textFaint, fontSize: font.size.xs, textAlign: 'center', marginTop: spacing.md }}>
          {t('onboard.editLater')}
        </Text>
      </ScrollView>

      <BottomSheet visible={dayOpen} onClose={() => setDayOpen(false)} title={t('settings.cycleSheet')}>
        <SheetOption label={t('settings.cycle.first')} selected={day === 1} onPress={() => { setDay(1); setDayOpen(false); }} />
        {Array.from({ length: 27 }, (_, i) => i + 2).map((d) => (
          <SheetOption key={d} label={ordinal(d)} selected={day === d} onPress={() => { setDay(d); setDayOpen(false); }} />
        ))}
      </BottomSheet>

      <BottomSheet visible={langOpen} onClose={() => setLangOpen(false)} title={t('settings.langSheet')}>
        {LANGS.map((l) => (
          <SheetOption key={l} label={LANG_NAMES[l]} selected={l === lang} onPress={() => { setLang(l); setLangOpen(false); }} />
        ))}
      </BottomSheet>
    </View>
  );
}
