import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useAppData } from '../../context/ExpenseContext';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { authenticate } from '../../services/device/deviceAuth';
import { shouldRelock } from '../../services/device/appLock';

/** Hides the app behind the device's fingerprint/PIN prompt when the lock setting is on. */
export const AppLockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { settings, settingsLoaded } = useAppData();
  const lockEnabled = !!settings.appLockEnabled;

  const [unlocked, setUnlocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    const ok = await authenticate(t('lock.prompt'), t('common.cancel'));
    prompting.current = false;
    if (ok) setUnlocked(true);
  }, [t]);

  // Ask as soon as the settings are known and the lock is on.
  useEffect(() => {
    if (settingsLoaded && lockEnabled && !unlocked) void unlock();
  }, [settingsLoaded, lockEnabled, unlocked, unlock]);

  useEffect(() => {
    if (!lockEnabled) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') backgroundedAt.current = Date.now();
      else if (state === 'active') {
        if (shouldRelock(backgroundedAt.current, Date.now())) setUnlocked(false);
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, [lockEnabled]);

  if (!settingsLoaded) return <View style={styles.cover} />;
  if (!lockEnabled || unlocked) return <>{children}</>;

  return (
    <View style={styles.cover}>
      <Lock color={colors.white} size={48} />
      <Text style={styles.title}>{t('lock.title')}</Text>
      <TouchableOpacity style={styles.btn} onPress={unlock} activeOpacity={0.8}>
        <Text style={styles.btnText}>{t('lock.unlock')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  cover: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  btn: { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  btnText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
});
