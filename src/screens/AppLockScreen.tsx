import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, Switch } from 'react-native';
import { showDialog } from '@/components/Dialog';
import { useNavigation } from '@react-navigation/native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import { colors, spacing, font, radius } from '@/theme/theme';
import { useT } from '@/i18n';
import { getAppLockHash, setAppLockHash, clearAppLock, getBiometricEnabled, setBiometricEnabled } from '@/data/repository';
import { hashPassword } from '@/utils/lock';
import { canUseBiometrics } from '@/utils/biometrics';

// Set, change, or remove the app password (reached from Settings → App lock).
export default function AppLockScreen() {
  const nav = useNavigation();
  const t = useT();
  const [hasLock, setHasLock] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(true);

  useEffect(() => {
    getAppLockHash().then((h) => setHasLock(!!h));
    canUseBiometrics().then(setBioAvailable);
    getBiometricEnabled().then(setBioEnabled);
  }, []);

  const toggleBio = async (v: boolean) => { setBioEnabled(v); await setBiometricEnabled(v); };

  const save = async () => {
    if (pw.trim().length < 4) return showDialog(t('lock.tooShort'));
    if (pw !== confirm) return showDialog(t('lock.mismatch'));
    await setAppLockHash(hashPassword(pw));
    showDialog(t('lock.saved'));
    nav.goBack();
  };

  const remove = async () => {
    await clearAppLock();
    showDialog(t('lock.removed'));
    nav.goBack();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.lg }}>
        {t('settings.appLock.on')}
      </Text>
      <Field label={t('lock.new')} value={pw} onChangeText={setPw} placeholder="••••" secureTextEntry />
      <Field label={t('lock.confirm')} value={confirm} onChangeText={setConfirm} placeholder="••••" secureTextEntry />

      {bioAvailable && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{t('lock.biometric')}</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{t('lock.biometricSub')}</Text>
          </View>
          <Switch value={bioEnabled} onValueChange={toggleBio} trackColor={{ true: colors.primary, false: colors.surfaceAlt }} />
        </View>
      )}

      <Button title={t('lock.save')} onPress={save} />
      {hasLock && <Button title={t('lock.remove')} onPress={remove} variant="danger" style={{ marginTop: spacing.sm }} />}
    </ScrollView>
  );
}
