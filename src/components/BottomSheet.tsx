import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, font, elevation } from '@/theme/theme';

// One reusable, on-system bottom sheet for all pickers. Dim backdrop, rounded
// top, drag handle, optional uppercase title, safe-area bottom padding.
export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(11,12,14,0.45)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingBottom: insets.bottom + spacing.md,
            paddingTop: spacing.sm,
            maxHeight: '80%',
            ...elevation.floating,
          }}
        >
          <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          {title ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: '700', letterSpacing: font.tracking.caps, textTransform: 'uppercase', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
              {title}
            </Text>
          ) : null}
          <ScrollView bounces={false}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// A consistent selectable row for sheets.
export function SheetOption({
  label,
  selected,
  onPress,
  trailing,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 14 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: selected ? '700' : '500' }}>{label}</Text>
        {trailing}
      </View>
      {selected ? <Check size={18} color={colors.primary} strokeWidth={2.5} /> : null}
    </Pressable>
  );
}

// A small uppercase group label inside a sheet.
export function SheetGroupLabel({ label }: { label: string }) {
  return (
    <Text style={{ color: colors.textFaint, fontSize: font.size.xs, fontWeight: '700', letterSpacing: font.tracking.caps, textTransform: 'uppercase', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs }}>
      {label}
    </Text>
  );
}
