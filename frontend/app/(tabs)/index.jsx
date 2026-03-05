import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/ui/app-button';
import { AppCard } from '../../components/ui/app-card';
import { FadeIn } from '../../components/ui/fade-in';
import { AppInput } from '../../components/ui/app-input';
import { AppScreen } from '../../components/ui/app-screen';
import { ErrorBanner } from '../../components/ui/error-banner';
import { ScreenHeader } from '../../components/ui/screen-header';
import { StatusChip } from '../../components/ui/status-chip';
import { Palette, Radius, Spacing, Type } from '../../constants/design';
import { useAppState } from '../../context/app-state';

const skinTypes = ['sensitive', 'normal', 'oily', 'dry', 'combination'];

function toList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProfileScreen() {
  const {
    hydrated,
    auth,
    profile,
    busy,
    error,
    authMessage,
    clearError,
    clearAuthMessage,
    register,
    login,
    logout,
    saveProfile,
    resetAllData,
  } = useAppState();

  const autoRedirectDoneRef = useRef(false);

  const [username, setUsername] = useState(auth?.username ?? '');
  const [password, setPassword] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(!profile);

  const [skinType, setSkinType] = useState(profile?.skinType ?? 'sensitive');
  const [allergies, setAllergies] = useState(profile?.allergies.join(', ') ?? '');
  const [conditions, setConditions] = useState(profile?.conditions.join(', ') ?? '');
  const [preferences, setPreferences] = useState(profile?.preferences.join(', ') ?? '');

  useEffect(() => {
    setUsername(auth?.username ?? '');
  }, [auth?.username]);

  useEffect(() => {
    if (profile) {
      setSkinType(profile.skinType ?? 'sensitive');
      setAllergies((profile.allergies ?? []).join(', '));
      setConditions((profile.conditions ?? []).join(', '));
      setPreferences((profile.preferences ?? []).join(', '));
      setIsEditingProfile(false);
      return;
    }

    if (auth) {
      setSkinType('sensitive');
      setAllergies('');
      setConditions('');
      setPreferences('');
      setIsEditingProfile(true);
    }
  }, [auth, profile]);

  useEffect(() => {
    if (!auth) {
      autoRedirectDoneRef.current = false;
      return;
    }

    if (!hydrated || autoRedirectDoneRef.current) return;

    autoRedirectDoneRef.current = true;
    router.replace('/(tabs)/product');
  }, [hydrated, auth]);

  const onRegister = async () => {
    const ok = await register({ username: username.trim(), password });
    if (ok) {
      setPassword('');
      setSkinType('sensitive');
      setAllergies('');
      setConditions('');
      setPreferences('');
      setIsEditingProfile(true);
    }
  };

  const onLogin = async () => {
    const ok = await login({ username: username.trim(), password });
    if (ok) {
      setPassword('');
    }
  };

  const onSave = async () => {
    await saveProfile({
      skinType,
      allergies: toList(allergies),
      conditions: toList(conditions),
      preferences: toList(preferences),
    });
  };

  if (!hydrated) {
    return (
      <AppScreen>
        <AppCard>
          <StatusChip label="Loading" tone="neutral" />
          <Text style={styles.body}>Restoring saved app state...</Text>
        </AppCard>
      </AppScreen>
    );
  }

  const authMessageIsSuccess = authMessage?.toLowerCase().startsWith('success') || authMessage === 'Logged out.';

  return (
    <AppScreen>
      <FadeIn>
        <ScreenHeader title="Profile Setup" subtitle="Register/login with username and password." />
      </FadeIn>

      {error ? (
        <FadeIn delay={40}>
          <ErrorBanner message={error} />
        </FadeIn>
      ) : null}

      <FadeIn delay={70}>
        <AppCard tone="accent">
          <Text style={styles.sectionTitle}>User Credentials</Text>
          <AppInput
            label="Username (unique)"
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

          {!auth ? (
            <View style={styles.authActionRow}>
              <AppButton
                label={busy.registering ? 'Registering...' : 'Register'}
                onPress={onRegister}
                variant="secondary"
                disabled={busy.registering || busy.loggingIn}
              />
              <AppButton
                label={busy.loggingIn ? 'Signing In...' : 'Login'}
                onPress={onLogin}
                disabled={busy.loggingIn || busy.registering}
              />
            </View>
          ) : (
            <View style={styles.loggedInBox}>
              <StatusChip label="Logged In" tone="success" />
              <Text style={styles.body}>Username: {auth.username}</Text>
              <Text style={styles.hint}>You will open directly on Product scan while logged in.</Text>
              <AppButton label="Logout" variant="secondary" onPress={logout} />
            </View>
          )}

          {authMessage ? (
            <Text style={[styles.authMessage, authMessageIsSuccess ? styles.authMessageSuccess : styles.authMessageError]}>
              {authMessage}
            </Text>
          ) : null}
        </AppCard>
      </FadeIn>

      {auth ? (
        <FadeIn delay={100}>
          <AppCard tone="accent">
            {!isEditingProfile && profile ? (
              <>
                <View style={styles.profileHeaderRow}>
                  <Text style={styles.sectionTitle}>Saved Skin Profile</Text>
                  <Pressable style={styles.settingsButton} onPress={() => setIsEditingProfile(true)}>
                    <Text style={styles.settingsButtonText}>Settings</Text>
                  </Pressable>
                </View>

                <Text style={styles.body}>Skin Type: {profile.skinType}</Text>
                <Text style={styles.body}>Allergies: {profile.allergies.join(', ') || 'None'}</Text>
                <Text style={styles.body}>Conditions: {profile.conditions.join(', ') || 'None'}</Text>
                <Text style={styles.body}>Preferences: {profile.preferences.join(', ') || 'None'}</Text>

                <AppButton label="Go To Product Scanning" onPress={() => router.push('/(tabs)/product')} />
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Enter Skin Details To Get Started</Text>
                <Text style={styles.hint}>Fill these once. On next login, these will auto-load for you.</Text>

                <Text style={styles.sectionLabel}>Skin Type</Text>
                <View style={styles.skinRow}>
                  {skinTypes.map((type) => {
                    const active = skinType === type;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => {
                          if (error) clearError();
                          setSkinType(type);
                        }}
                        style={[styles.skinChip, active && styles.skinChipActive]}
                      >
                        <Text style={[styles.skinChipText, active && styles.skinChipTextActive]}>{type}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <AppInput
                  label="Allergies (comma separated)"
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="fragrance, parabens"
                />
                <AppInput
                  label="Conditions (comma separated)"
                  value={conditions}
                  onChangeText={setConditions}
                  placeholder="acne-prone, eczema"
                />
                <AppInput
                  label="Preferences (comma separated)"
                  value={preferences}
                  onChangeText={setPreferences}
                  placeholder="fragrance-free, low-comedogenic"
                />

                <AppButton
                  label={busy.savingProfile ? 'Saving Profile...' : 'Save Profile'}
                  onPress={onSave}
                  variant="primary"
                  disabled={busy.savingProfile}
                />

                {profile ? (
                  <AppButton label="Cancel Editing" variant="secondary" onPress={() => setIsEditingProfile(false)} />
                ) : null}
              </>
            )}
          </AppCard>
        </FadeIn>
      ) : null}

      {profile ? (
        <FadeIn delay={120}>
          <AppCard>
            <StatusChip label="Profile Saved" tone="success" />
            <Text style={styles.body}>Your profile is linked to username `{auth?.username}`.</Text>
            <AppButton label="Continue To Product" onPress={() => router.push('/(tabs)/product')} />
            <AppButton label="Reset All Data" variant="secondary" onPress={resetAllData} />
          </AppCard>
        </FadeIn>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: Type.heading,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  sectionLabel: {
    fontSize: Type.caption,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  body: {
    fontSize: Type.body,
    color: Palette.textSecondary,
    lineHeight: 22,
  },
  hint: {
    fontSize: Type.caption,
    color: Palette.muted,
  },
  authActionRow: {
    gap: Spacing.sm,
  },
  loggedInBox: {
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
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  settingsButtonText: {
    fontSize: Type.caption,
    color: Palette.textSecondary,
    fontWeight: '700',
  },
  skinRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  skinChip: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Palette.surface,
  },
  skinChipActive: {
    borderColor: Palette.primary,
    backgroundColor: Palette.primarySoft,
  },
  skinChipText: {
    color: Palette.textSecondary,
    fontSize: Type.caption,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  skinChipTextActive: {
    color: Palette.primaryStrong,
  },
});
