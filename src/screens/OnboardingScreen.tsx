import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronLeft, PiggyBank, Wallet, MessageSquareText, BadgeCheck, LayoutGrid, Check } from 'lucide-react-native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import Card from '@/components/Card';
import BottomSheet, { SheetOption } from '@/components/BottomSheet';
import { showDialog } from '@/components/Dialog';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useLang, LANGS, LANG_NAMES } from '@/i18n';
import { toCents } from '@/utils/money';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export type OnboardMode = 'template' | 'custom';

// 3-step first-launch onboarding: welcome → income → budgeting method.
export default function OnboardingScreen({ onDone }: { onDone: (salaryCents: number, day: number, mode: OnboardMode) => void }) {
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useLang();
  const [step, setStep] = useState(0); // 0,1,2
  const [salary, setSalary] = useState('');
  const [day, setDay] = useState(1);
  const [mode, setMode] = useState<OnboardMode>('template');
  const [dayOpen, setDayOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const next = () => {
    if (step === 1 && toCents(salary) <= 0) return showDialog(t('onboard.enterSalary'));
    setStep((s) => Math.min(2, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));
  const finish = () => onDone(toCents(salary), day, mode);

  const Feature = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryFaint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={{ color: colors.text, fontSize: font.size.sm, flex: 1 }}>{text}</Text>
    </View>
  );

  const MethodCard = ({ value, icon: Icon, title, body }: { value: OnboardMode; icon: any; title: string; body: string }) => {
    const active = mode === value;
    return (
      <Pressable onPress={() => setMode(value)} style={{ marginBottom: spacing.md }}>
        <Card style={{ borderWidth: 1.5, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryFaint : colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: active ? colors.primary : colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={active ? colors.onInk : colors.textMuted} strokeWidth={2} />
            </View>
            <Text style={{ flex: 1, color: colors.text, fontSize: font.size.md, fontWeight: '700' }}>{title}</Text>
            {active && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginTop: spacing.sm }}>{body}</Text>
        </Card>
      </Pressable>
    );
  };

  const Dots = () => (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: spacing.lg }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: radius.pill, backgroundColor: i === step ? colors.primary : colors.surfaceAlt }} />
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
        {/* top bar: back (steps 2-3) + language */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          {step > 0 ? (
            <Pressable onPress={back} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
              <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: '600' }}>{t('common.back')}</Text>
            </Pressable>
          ) : <View />}
          <Pressable onPress={() => setLangOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: colors.primary, fontSize: font.size.sm, fontWeight: '600' }}>{LANG_NAMES[lang]}</Text>
            <ChevronDown size={16} color={colors.primary} strokeWidth={2} />
          </Pressable>
        </View>

        <Dots />

        {step === 0 && (
          <>
            <Text style={{ color: colors.text, fontSize: font.size.display, fontWeight: '800', letterSpacing: font.tracking.tight }}>{t('onboard.welcomeTitle')}</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.md, marginTop: spacing.sm, marginBottom: spacing.xl }}>{t('onboard.welcomeSub')}</Text>
            <Feature icon={Wallet} text={t('onboard.feature1')} />
            <Feature icon={MessageSquareText} text={t('onboard.feature2')} />
            <Feature icon={PiggyBank} text={t('onboard.feature3')} />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: '800', marginBottom: spacing.lg }}>{t('onboard.step2Title')}</Text>
            <Field label={t('onboard.salaryQ')} value={salary} onChangeText={setSalary} placeholder="0.00" keyboardType="decimal-pad" />
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.sm }}>{t('onboard.dayQ')}</Text>
            <Pressable
              onPress={() => setDayOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14 }}
            >
              <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: '600' }}>
                {day === 1 ? t('settings.cycle.first') : t('settings.cycle.fromDay', { day: ordinal(day) })}
              </Text>
              <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: '800', marginBottom: spacing.lg }}>{t('onboard.methodTitle')}</Text>
            <MethodCard value="template" icon={LayoutGrid} title={t('onboard.useMethod.title')} body={t('onboard.useMethod.body')} />
            <MethodCard value="custom" icon={BadgeCheck} title={t('onboard.custom.title')} body={t('onboard.custom.body')} />
          </>
        )}

        <View style={{ marginTop: spacing.xl }}>
          {step < 2 ? (
            <Button title={t('onboard.continue')} onPress={next} />
          ) : (
            <Button title={t('onboard.start')} icon={BadgeCheck} onPress={finish} />
          )}
        </View>
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
