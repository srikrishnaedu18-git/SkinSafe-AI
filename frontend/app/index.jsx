import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/ui/app-button';
import { AppCard } from '../components/ui/app-card';
import { FadeIn } from '../components/ui/fade-in';
import { AppInput } from '../components/ui/app-input';
import { AppScreen } from '../components/ui/app-screen';
import { ErrorBanner } from '../components/ui/error-banner';
import { ScreenHeader } from '../components/ui/screen-header';
import { StatusChip } from '../components/ui/status-chip';
import { Palette, Spacing, Type } from '../constants/design';
import { useAppState } from '../context/app-state';

function describeStorageMode(mode) {
  if (mode === 'local_fallback') return 'Local fallback';
  if (mode === 'mongodb') return 'MongoDB';
  return 'Unknown';
}

export default function AuthEntryScreen() {
  const {
    hydrated,
    auth,
    busy,
    error,
    authMessage,
    clearError,
    clearAuthMessage,
    register,
    login,
  } = useAppState();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLogoutFlash, setShowLogoutFlash] = useState(false);
  const logoutOpacity = useRef(new Animated.Value(1)).current;
  const storageModeLabel = auth?.storageMode ? describeStorageMode(auth.storageMode) : null;

  useEffect(() => {
    if (!hydrated || authMessage !== 'Logged out.') {
      return undefined;
    }

    setShowLogoutFlash(true);
    logoutOpacity.setValue(1);

    const fadeTimer = setTimeout(() => {
      Animated.timing(logoutOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }, 1750);

    const resetTimer = setTimeout(() => {
      setShowLogoutFlash(false);
      logoutOpacity.setValue(1);
      clearAuthMessage();
    }, 2000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(resetTimer);
    };
  }, [hydrated, authMessage, clearAuthMessage, logoutOpacity]);

  if (!hydrated) {
    return (
      <AppScreen>
        <AppCard>
          <StatusChip label="Loading" tone="neutral" />
          <Text style={styles.body}>Preparing SkinSafe AI...</Text>
        </AppCard>
      </AppScreen>
    );
  }

  const authMessageIsSuccess = authMessage?.toLowerCase().startsWith('success');

  const onRegister = async () => {
    const ok = await register({ username: username.trim(), password });
    if (ok) {
      setPassword('');
    }
  };

  const onLogin = async () => {
    const ok = await login({ username: username.trim(), password });
    if (ok) {
      setPassword('');
    }
  };

  return (
    <AppScreen>
      <FadeIn>
        <ScreenHeader
          title="SkinSafe AI"
          subtitle="Register or login first. After that, the full app opens with scanning, assessment, history, and reports."
        />
      </FadeIn>

      {error ? (
        <FadeIn delay={40}>
          <ErrorBanner message={error} />
        </FadeIn>
      ) : null}

      <FadeIn delay={80}>
        <AppCard tone="accent">
          <AppInput
            label="Username"
            value={username}
            onChangeText={(value) => {
              if (authMessage) clearAuthMessage();
              if (error) clearError();
              setUsername(value);
            }}
            placeholder="krishna_01"
            autoCapitalize="none"
          />
          <AppInput
            label="Password"
            value={password}
            onChangeText={(value) => {
              if (authMessage) clearAuthMessage();
              if (error) clearError();
              setPassword(value);
            }}
            placeholder="Enter password"
            secureTextEntry
            autoCapitalize="none"
          />

          <View style={styles.actionRow}>
            <AppButton
              label={busy.registering ? 'Registering...' : 'Register'}
              onPress={onRegister}
              variant="secondary"
              disabled={busy.registering || busy.loggingIn}
            />
            <Animated.View style={{ opacity: logoutOpacity }}>
              <AppButton
                label={showLogoutFlash ? 'Logged out' : busy.loggingIn ? 'Signing In...' : 'Login'}
                onPress={onLogin}
                variant={showLogoutFlash ? 'danger' : 'primary'}
                disabled={showLogoutFlash || busy.loggingIn || busy.registering}
              />
            </Animated.View>
          </View>

          {authMessage && authMessage !== 'Logged out.' ? (
            <Text style={[styles.authMessage, authMessageIsSuccess ? styles.authMessageSuccess : styles.authMessageError]}>
              {authMessage}
            </Text>
          ) : null}

          {storageModeLabel ? <Text style={styles.storageNote}>Storage mode: {storageModeLabel}</Text> : null}
        </AppCard>
      </FadeIn>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: Type.body,
    color: Palette.textSecondary,
    lineHeight: 22,
  },
  actionRow: {
    gap: Spacing.sm,
  },
  authMessage: {
    marginTop: Spacing.sm,
    fontSize: Type.caption,
    fontWeight: '600',
  },
  authMessageSuccess: {
    color: '#0f8a4b',
  },
  authMessageError: {
    color: '#b00020',
  },
  storageNote: {
    marginTop: Spacing.xs,
    fontSize: Type.caption,
    color: Palette.textSecondary,
  },
});
