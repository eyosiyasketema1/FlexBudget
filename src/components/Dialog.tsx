import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { Info, CheckCircle2, AlertTriangle } from 'lucide-react-native';

import Button from '@/components/Button';
import { colors, spacing, font, radius, elevation } from '@/theme/theme';
import { useT } from '@/i18n';

// On-brand replacement for the native Alert. `showDialog` mirrors Alert.alert's
// signature so call sites swap cleanly. A single <DialogHost/> at the app root
// renders the styled modal. Tone (info / success / danger) is inferred from the
// buttons (a destructive button → danger) or passed explicitly.

export type DialogButton = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
export type DialogTone = 'info' | 'success' | 'danger';
interface DialogRequest { title: string; message?: string; buttons?: DialogButton[]; tone?: DialogTone }

let emit: ((r: DialogRequest) => void) | null = null;

/** Alert.alert-compatible: showDialog(title, message?, buttons?, tone?). */
export function showDialog(title: string, message?: string, buttons?: DialogButton[], tone?: DialogTone): void {
  emit?.({ title, message, buttons, tone });
}

const TONE = {
  info: { icon: Info, color: colors.primary, soft: colors.primaryFaint },
  success: { icon: CheckCircle2, color: colors.positive, soft: colors.positiveSoft },
  danger: { icon: AlertTriangle, color: colors.negative, soft: colors.negativeSoft ?? colors.primaryFaint },
};

export function DialogHost() {
  const t = useT();
  const [req, setReq] = useState<DialogRequest | null>(null);

  useEffect(() => {
    emit = setReq;
    return () => { emit = null; };
  }, []);

  if (!req) return null;

  const buttons: DialogButton[] = req.buttons && req.buttons.length > 0 ? req.buttons : [{ text: t('common.ok') }];
  const tone: DialogTone = req.tone ?? (buttons.some((b) => b.style === 'destructive') ? 'danger' : 'info');
  const { icon: Icon, color, soft } = TONE[tone];
  const stacked = buttons.length > 2;

  const press = (b: DialogButton) => { setReq(null); b.onPress?.(); };
  const variant = (b: DialogButton) => (b.style === 'destructive' ? 'danger' : b.style === 'cancel' ? 'ghost' : 'primary');

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => setReq(null)} statusBarTranslucent>
      <Pressable onPress={() => setReq(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={{ width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...elevation.floating }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: soft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
            <Icon size={22} color={color} strokeWidth={2} />
          </View>
          <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: '700', marginBottom: req.message ? spacing.xs : spacing.md }}>
            {req.title}
          </Text>
          {req.message ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.lg, lineHeight: 20 }}>
              {req.message}
            </Text>
          ) : null}

          <View style={{ flexDirection: stacked ? 'column' : 'row', gap: spacing.sm }}>
            {buttons.map((b, i) => (
              <Button
                key={i}
                title={b.text}
                variant={variant(b) as 'primary' | 'ghost' | 'danger'}
                onPress={() => press(b)}
                style={stacked ? undefined : { flex: 1 }}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
