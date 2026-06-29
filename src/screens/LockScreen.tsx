import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Lock } from 'lucide-react-native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import { colors, spacing, font } from '@/theme/theme';
import { useT } from '@/i18n';
import { hashPassword } from '@/utils/lock';

// Full-screen lock shown on launch when an app password is set.
export default function LockScreen({ expectedHash, onUnlock }: { expectedHash: string; onUnlock: () => void }) {
  const t = useT();
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

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
        autoFocus
      />
      {error && <Text style={{ color: colors.negative, fontSize: font.size.sm, marginBottom: spacing.sm }}>{t('lock.wrong')}</Text>}
      <Button title={t('lock.unlock')} onPress={tryUnlock} />
    </View>
  );
}
