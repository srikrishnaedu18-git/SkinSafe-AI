import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { FadeIn } from '@/components/ui/fade-in';
import { AppScreen } from '@/components/ui/app-screen';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/status-chip';
import { Palette, Type } from '@/constants/design';
import { useAppState } from '@/context/app-state';

export default function AssessmentScreen() {
  const { hydrated, profile, product, verification, assessment, busy, error, runAssessment } = useAppState();

  const prerequisitesReady = Boolean(profile && product && verification?.verified);

  if (!hydrated) {
    return (
      <AppScreen>
        <AppCard>
          <StatusChip label="Loading" tone="neutral" />
          <Text style={styles.body}>Restoring assessment context...</Text>
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <FadeIn>
        <ScreenHeader
          title="Assessment"
          subtitle="Suitability, risk flags, confidence, explainability, and guidance."
        />
      </FadeIn>

      {error ? (
        <FadeIn delay={40}>
          <ErrorBanner message={error} />
        </FadeIn>
      ) : null}

      <FadeIn delay={80}>
        <AppCard tone="accent">
          <Text style={styles.sectionTitle}>Readiness Check</Text>
          <Text style={styles.body}>Profile: {profile ? 'Ready' : 'Missing'}</Text>
          <Text style={styles.body}>Product: {product ? 'Resolved' : 'Missing'}</Text>
          <Text style={styles.body}>Verification: {verification?.verified ? 'Verified' : 'Pending/Failed'}</Text>
          <AppButton
            label={busy.runningAssessment ? 'Running Assessment...' : 'Run Assessment'}
            onPress={runAssessment}
            variant={prerequisitesReady ? 'primary' : 'secondary'}
            disabled={!prerequisitesReady || busy.runningAssessment}
          />
        </AppCard>
      </FadeIn>

      <FadeIn delay={120}>
        <AppCard>
          <Text style={styles.sectionTitle}>Deferred Modules</Text>
          <Text style={styles.body}>Blockchain trust layer: deferred for next phase.</Text>
          <Text style={styles.body}>AI model layer: deferred for next phase.</Text>
          <Text style={styles.body}>XAI trace engine: deferred for next phase.</Text>
        </AppCard>
      </FadeIn>

      {assessment ? (
        <>
          <FadeIn delay={140}>
            <AppCard>
              <StatusChip
                label={`Suitability Score: ${assessment.score}/100`}
                tone={assessment.score >= 70 ? 'success' : 'warning'}
              />
              <Text style={styles.body}>Confidence: {assessment.confidence.toFixed(2)}</Text>
              <Text style={styles.sectionTitle}>Risk Flags</Text>
              {assessment.flags.map((flag) => (
                <Text style={styles.body} key={flag}>
                  - {flag}
                </Text>
              ))}
            </AppCard>
          </FadeIn>

          <FadeIn delay={170}>
            <AppCard>
              <Text style={styles.sectionTitle}>Explainable Reasons</Text>
              {assessment.reasons.map((reason) => (
                <Text style={styles.body} key={reason}>
                  - {reason}
                </Text>
              ))}
            </AppCard>
          </FadeIn>

          <FadeIn delay={200}>
            <AppCard>
              <Text style={styles.sectionTitle}>Precautions</Text>
              {assessment.precautions.map((item) => (
                <Text style={styles.body} key={item}>
                  - {item}
                </Text>
              ))}
              <Text style={styles.sectionTitle}>Safer Alternatives</Text>
              {assessment.alternatives.map((alt) => (
                <Text style={styles.body} key={alt}>
                  - {alt}
                </Text>
              ))}
              <AppButton label="Open Feedback Form" variant="secondary" onPress={() => router.push('/feedback')} />
              <AppButton label="View History" onPress={() => router.push('/(tabs)/history')} />
            </AppCard>
          </FadeIn>
        </>
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
});
