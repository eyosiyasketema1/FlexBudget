import React, { useState } from 'react';
import { View, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { AccountCard, AddIncomeCard } from './AccountCard';
import { colors, spacing } from '@/theme/theme';

interface IncomeItem {
  id: string;
  label: string;
  amountCents: number;
}

// Swipeable carousel of "account" cards — one per income source, plus a trailing
// "Add income" card. Page dots track position. Spent/budget is month-level and
// shown on each income card.
export default function IncomeCarousel({
  incomes,
  spentCents,
  budgetCents,
  hidden,
  onToggleHidden,
  onAddIncome,
  onPressIncome,
}: {
  incomes: IncomeItem[];
  spentCents: number;
  budgetCents: number;
  hidden: boolean;
  onToggleHidden: () => void;
  onAddIncome: () => void;
}) {
  const pageWidth = Dimensions.get('window').width;
  const cardWidth = pageWidth - spacing.lg * 2;
  const [index, setIndex] = useState(0);

  const pages = incomes.length + 1; // + Add card

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (i !== index) setIndex(i);
  };

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {incomes.map((inc) => (
          <View key={inc.id} style={{ width: pageWidth, paddingHorizontal: spacing.lg }}>
            <View style={{ width: cardWidth }}>
              <AccountCard
                title={inc.label}
                amountCents={inc.amountCents}
                spentCents={spentCents}
                budgetCents={budgetCents}
                hidden={hidden}
                onToggleHidden={onToggleHidden}
              />
            </View>
          </View>
        ))}
        <View style={{ width: pageWidth, paddingHorizontal: spacing.lg, justifyContent: 'center' }}>
          <AddIncomeCard onPress={onAddIncome} />
        </View>
      </ScrollView>

      {/* page dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.md }}>
        {Array.from({ length: pages }).map((_, i) => (
          <View
            key={i}
            style={{
              width: i === index ? 18 : 7,
              height: 7,
              borderRadius: 999,
              backgroundColor: i === index ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}
