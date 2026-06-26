import React, { useState } from 'react';
import { View, Text, Pressable, ImageBackground, LayoutChangeEvent } from 'react-native';
import { Plus } from 'lucide-react-native';
import { formatCents } from '@/utils/money';
import { radius } from '@/theme/theme';
import { useT } from '@/i18n';

// Dark "account" card. The background is the supplied artwork (card-bg.png,
// 1110×630 = 3× of 370×210). The card keeps that aspect ratio so the image
// fills with no cropping; the mint label, amount, Show toggle, spent line and
// barcode are drawn on top.
const CARD = {
  bg: '#0E110F',
  mint: '#00C8B3',
  amount: '#FFFFFF',
  secondary: 'rgba(235,235,245,0.6)',
  tickOff: '#3A3A3C',
  radius: radius.lg, // match the app's system card radius
  aspect: 1110 / 630,
};

const TICK_W = 3;
const TICK_GAP = 3;
const TICK_H = 26;

const cardBg = require('../../assets/textures/card-bg.png');

function Barcode({ fraction }: { fraction: number }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const count = width > 0 ? Math.floor(width / (TICK_W + TICK_GAP)) : 0;
  const active = Math.round(Math.max(0, Math.min(fraction, 1)) * count);
  return (
    <View onLayout={onLayout} style={{ flexDirection: 'row', height: TICK_H, overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: TICK_W, height: TICK_H, marginRight: TICK_GAP, borderRadius: 1, backgroundColor: i < active ? CARD.mint : CARD.tickOff }} />
      ))}
    </View>
  );
}

export function AccountCard({
  title, amountCents, spentCents, budgetCents, hidden, onToggleHidden,
}: {
  title: string; amountCents: number; spentCents: number; budgetCents: number; hidden: boolean; onToggleHidden: () => void;
}) {
  const fraction = budgetCents > 0 ? spentCents / budgetCents : 0;
  const t = useT();
  return (
    <ImageBackground
      source={cardBg}
      resizeMode="cover"
      style={{ width: '100%', aspectRatio: CARD.aspect, backgroundColor: CARD.bg, borderRadius: CARD.radius, overflow: 'hidden' }}
      imageStyle={{ borderRadius: CARD.radius }}
    >
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <Text style={{ color: CARD.mint, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>{title.toUpperCase()}</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: CARD.amount, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 }}>
            {hidden ? '••••••' : formatCents(amountCents)}
          </Text>
          <Pressable onPress={onToggleHidden} hitSlop={8} accessibilityRole="button" accessibilityLabel={hidden ? t('home.show') : t('home.hide')}>
            <Text style={{ color: CARD.secondary, fontSize: 14, textDecorationLine: 'underline' }}>{hidden ? t('home.show') : t('home.hide')}</Text>
          </Pressable>
        </View>

        <View>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.10)', marginBottom: 14 }} />
          <Text style={{ color: CARD.secondary, fontSize: 13, marginBottom: 8 }}>
            {t('card.spent')} <Text style={{ color: CARD.amount, fontWeight: '700' }}>{hidden ? '••••' : formatCents(spentCents)}</Text>
            {'  / '}{hidden ? '••••••' : formatCents(budgetCents)} {t('card.budgeted')}
          </Text>
          <Barcode fraction={fraction} />
        </View>
      </View>
    </ImageBackground>
  );
}

export function AddIncomeCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add income"
      style={{
        width: '100%',
        aspectRatio: CARD.aspect,
        borderRadius: CARD.radius,
        backgroundColor: CARD.bg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Plus size={28} color={CARD.mint} strokeWidth={2.25} />
      <Text style={{ color: CARD.secondary, fontSize: 15, fontWeight: '600' }}>Add income</Text>
    </Pressable>
  );
}
