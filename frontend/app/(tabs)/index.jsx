import React from 'react';
import { router } from 'expo-router';
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

function describeStorageMode(mode) {
  if (mode === 'local_fallback') return 'Local fallback';
  if (mode === 'mongodb') return 'MongoDB';
  return 'Unknown';
}

function toList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function ProfileEditor({
  username,
  initialSkinType,
  initialAllergies,
  initialConditions,
  initialPreferences,
  busy,
  onSave,
  onLogout,
  storageMode,
}) {
  const [currentSkinType, setCurrentSkinType] = React.useState(initialSkinType);
  const [currentAllergies, setCurrentAllergies] = React.useState(initialAllergies);
  const [currentConditions, setCurrentConditions] = React.useState(initialConditions);
  const [currentPreferences, setCurrentPreferences] = React.useState(initialPreferences);

  React.useEffect(() => {
    setCurrentSkinType(initialSkinType);
    setCurrentAllergies(initialAllergies);
    setCurrentConditions(initialConditions);
    setCurrentPreferences(initialPreferences);
  }, [initialSkinType, initialAllergies, initialConditions, initialPreferences]);

  return (
    <AppCard tone="accent">
      <Text style={styles.sectionTitle}>Account</Text>
      <Text style={styles.body}>Logged in as `{username}`</Text>
      <Text style={styles.meta}>Storage mode: {describeStorageMode(storageMode)}</Text>
      <AppButton label="Logout" variant="secondary" onPress={onLogout} />

      <Text style={styles.sectionTitle}>Skin Type</Text>
      <View style={styles.skinRow}>
        {skinTypes.map((type) => {
          const active = currentSkinType === type;
          return (
            <Pressable
              key={type}
              onPress={() => setCurrentSkinType(type)}
              style={[styles.skinChip, active && styles.skinChipActive]}
            >
              <Text style={[styles.skinChipText, active && styles.skinChipTextActive]}>{type}</Text>
            </Pressable>
          );
        })}
      </View>

      <AppInput
        label="Allergies (comma separated)"
        value={currentAllergies}
        onChangeText={setCurrentAllergies}
        placeholder="fragrance, parabens"
      />
      <AppInput
        label="Conditions (comma separated)"
        value={currentConditions}
        onChangeText={setCurrentConditions}
        placeholder="acne-prone, eczema"
      />
      <AppInput
        label="Preferences (comma separated)"
        value={currentPreferences}
        onChangeText={setCurrentPreferences}
        placeholder="fragrance-free, low-comedogenic"
      />

      <AppButton
        label={busy ? 'Saving Profile...' : 'Save Profile'}
        onPress={() =>
          onSave({
            skinType: currentSkinType,
            allergies: currentAllergies,
            conditions: currentConditions,
            preferences: currentPreferences,
          })
        }
        variant="primary"
        disabled={busy}
      />
    </AppCard>
  );
}

export default function ProfileScreen() {
  const { hydrated, auth, profile, busy, error, saveProfile, logout, resetAllData } = useAppState();

  const skinType = profile?.skinType ?? 'sensitive';
  const allergies = profile?.allergies.join(', ') ?? '';
  const conditions = profile?.conditions.join(', ') ?? '';
  const preferences = profile?.preferences.join(', ') ?? '';

  const handleSave = async (nextProfile) => {
    await saveProfile({
      skinType: nextProfile.skinType,
      allergies: toList(nextProfile.allergies),
      conditions: toList(nextProfile.conditions),
      preferences: toList(nextProfile.preferences),
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

  return (
    <AppScreen>
      <FadeIn>
        <ScreenHeader title="Profile Setup" subtitle="Create or update your skin profile for personalized compatibility checks." />
      </FadeIn>

      {error ? (
        <FadeIn delay={40}>
          <ErrorBanner message={error} />
        </FadeIn>
      ) : null}

      <FadeIn delay={80}>
        <ProfileEditor
          username={auth?.username ?? 'Unknown'}
          initialSkinType={skinType}
          initialAllergies={allergies}
          initialConditions={conditions}
          initialPreferences={preferences}
          busy={busy.savingProfile}
          onSave={handleSave}
          storageMode={auth?.storageMode ?? null}
          onLogout={logout}
        />
      </FadeIn>

      {profile ? (
        <FadeIn delay={120}>
          <AppCard>
            <StatusChip label="Profile Saved" tone="success" />
            <Text style={styles.body}>Username: {auth?.username}</Text>
            <Text style={styles.body}>Skin Type: {profile.skinType}</Text>
            <Text style={styles.body}>Allergies: {profile.allergies.join(', ') || 'None'}</Text>
            <Text style={styles.body}>Conditions: {profile.conditions.join(', ') || 'None'}</Text>
            <Text style={styles.body}>Preferences: {profile.preferences.join(', ') || 'None'}</Text>
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
  body: {
    fontSize: Type.body,
    color: Palette.textSecondary,
    lineHeight: 22,
  },
  meta: {
    fontSize: Type.caption,
    color: Palette.muted,
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
