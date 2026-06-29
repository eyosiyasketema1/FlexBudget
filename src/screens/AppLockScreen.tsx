import React, { useEffect, useState } from 'react';
import { ScrollView, Alert, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Field from '@/components/Field';
import Button from '@/components/Button';
import { colors, spacing, font } from '@/theme/theme';
import { useT } from '@/i18n';
import { getAppLockHash, setAppLockHash, clearAppLock } from '@/data/repository';
import { hashPassword } from '@/utils/lock';

// Set, change, or remove the app password (reached from Settings → App lock).
export default function AppLockScreen() {
  const nav = useNavigation();
  const t = useT();
  const [hasLock, setHasLock] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => { getAppLockHash().then((h) => setHasLock(!!h)); }, []);

  const save = async () => {
    if (pw.trim().length < 4) return Alert.alert(t('lock.tooShort'));
    if (pw !== confirm) return Alert.alert(t('lock.mismatch'));
    await setAppLockHash(hashPassword(pw));
    Alert.alert(t('lock.saved'));
    nav.goBack();
  };

  const remove = async () => {
    await clearAppLock();
    Alert.alert(t('lock.removed'));
    nav.goBack();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.lg }}>
        {t('settings.appLock.on')}
      </Text>
      <Field label={t('lock.new')} value={pw} onChangeText={setPw} placeholder="••••" secureTextEntry />
      <Field label={t('lock.confirm')} value={confirm} onChangeText={setConfirm} placeholder="••••" secureTextEntry />
      <Button title={t('lock.save')} onPress={save} />
      {hasLock && <Button title={t('lock.remove')} onPress={remove} variant="danger" style={{ marginTop: spacing.sm }} />}
    </ScrollView>
  );
}
