import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Lock, Fingerprint } from 'lucide-react-native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import { colors, spacing, font } from '@/theme/theme';
import { useT } from '@/i18n';
import { hashPassword } from '@/utils/lock';
import { canUseBiometrics, authenticateBiometric } from '@/utils/biometrics';
import { getBiometricEnabled } from '@/data/repository';

// Full-screen lock shown on launch when an app password is set. Offers device
// biometrics (fingerprint / face) first, with the password as a fallback.
export default function LockScreen({ expectedHash, onUnlock }: { expectedHash: string; onUnlock: () => void }) {
  const t = useT();
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  const promptBiometric = async () => {
    if (await authenticateBiometric(t('lock.unlockPrompt'))) onUnlock();
  };

  useEffect(() => {
    (async () => {
      const on = (await getBiometricEnabled()) && (await canUseBiometrics());
      setBioAvailable(on);
      if (on) promptBiometric(); // auto-prompt on launch
    })();
  }, []);

  const tryUnlock = () => {
    if (hashPassword(pw) === expectedHash) onUnlock();
    else { setError(true); setPw(''); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryFaint, alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={26} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: '700', marginTop: spacing.md }}>FlexBudget</Text>
      </View>

      <Field
        label={t('lock.enter')}
        value={pw}
        onChangeText={(v) => { setPw(v); setError(false); }}
        placeholder="••••"
        secureTextEntry
      />
      {error && <Text style={{ color: colors.negative, fontSize: font.size.sm, marginBottom: spacing.sm }}>{t('lock.wrong')}</Text>}
      <Button title={t('lock.unlock')} onPress={tryUnlock} />

      {bioAvailable && (
        <Pressable onPress={promptBiometric} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.lg }}>
          <Fingerprint size={20} color={colors.primary} strokeWidth={2} />
          <Text style={{ color: colors.primary, fontSize: font.size.md, fontWeight: '600' }}>{t('lock.useFingerprint')}</Text>
        </Pressable>
      )}
    </View>
  );
}
