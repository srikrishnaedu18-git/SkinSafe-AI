import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { AppButton } from '../../components/ui/app-button';
import { AppCard } from '../../components/ui/app-card';
import { FadeIn } from '../../components/ui/fade-in';
import { AppScreen } from '../../components/ui/app-screen';
import { ErrorBanner } from '../../components/ui/error-banner';
import { ScreenHeader } from '../../components/ui/screen-header';
import { StatusChip } from '../../components/ui/status-chip';
import { Palette, Type } from '../../constants/design';
import { useAppState } from '../../context/app-state';
export default function AssessmentScreen() {
    const { hydrated, profile, product, verification, assessment, busy, error, runAssessment } = useAppState();
    const prerequisitesReady = Boolean(product && verification?.verified);
    if (!hydrated) {
        return (<AppScreen>
        <AppCard>
          <StatusChip label="Loading" tone="neutral"/>
          <Text style={styles.body}>Restoring assessment context...</Text>
        </AppCard>
      </AppScreen>);
    }
    return (<AppScreen>
      <FadeIn>
        <ScreenHeader title="Assessment" subtitle="Suitability, risk flags, confidence, explainability, and guidance."/>
      </FadeIn>

      {error ? (<FadeIn delay={40}>
          <ErrorBanner message={error}/>
        </FadeIn>) : null}

      <FadeIn delay={80}>
        <AppCard tone="accent">
          <Text style={styles.sectionTitle}>Readiness Check</Text>
          <Text style={styles.body}>Profile: {profile ? 'Ready' : 'Auto-default if missing'}</Text>
          <Text style={styles.body}>Product: {product ? 'Resolved' : 'Missing'}</Text>
          <Text style={styles.body}>Verification: {verification?.verified ? 'Verified' : 'Pending/Failed'}</Text>
          <AppButton label={busy.runningAssessment ? 'Running Assessment...' : 'Run Assessment'} onPress={runAssessment} variant={prerequisitesReady ? 'primary' : 'secondary'} disabled={!prerequisitesReady || busy.runningAssessment}/>
        </AppCard>
      </FadeIn>

      <FadeIn delay={120}>
        <AppCard>
          <Text style={styles.sectionTitle}>Deferred Modules</Text>
          <Text style={styles.body}>Blockchain trust layer: deferred for next phase.</Text>
        </AppCard>
      </FadeIn>

      {assessment ? (<>
          <FadeIn delay={140}>
            <AppCard>
              <StatusChip label={`Suitability Score: ${assessment.suitabilityScore}/100`} tone={assessment.suitabilityScore >= 70 ? 'success' : 'warning'}/>
              <Text style={styles.body}>Confidence: {assessment.confidence.value.toFixed(2)}</Text>
              <Text style={styles.body}>Confidence reason: {assessment.confidence.reason}</Text>
              <Text style={styles.sectionTitle}>Risk Flags</Text>
              {assessment.riskFlags.length > 0 ? (assessment.riskFlags.map((flag, idx) => (<Text style={styles.body} key={`${flag.code}-${idx}`}>
                    - {flag.code} [{flag.severity}] {flag.ingredients.length ? `(${flag.ingredients.join(', ')})` : ''}
                  </Text>))) : (<Text style={styles.body}>- No risk flags returned by engine.</Text>)}
            </AppCard>
          </FadeIn>

          <FadeIn delay={170}>
            <AppCard>
              <Text style={styles.sectionTitle}>XAI Summary</Text>
              <Text style={styles.body}>{assessment.explanations.summary}</Text>
              <Text style={styles.sectionTitle}>Top Negative Drivers</Text>
              {assessment.explanations.topNegativeDrivers.length > 0 ? (assessment.explanations.topNegativeDrivers.map((item, idx) => (<Text style={styles.body} key={`${item.ingredient}-${idx}`}>
                    - {item.ingredient}: {item.reason} (penalty {item.penalty})
                  </Text>))) : (<Text style={styles.body}>- No strong negative drivers detected.</Text>)}
              <Text style={styles.sectionTitle}>Top Positive Drivers</Text>
              {assessment.explanations.topPositiveDrivers.length > 0 ? (assessment.explanations.topPositiveDrivers.map((item, idx) => (<Text style={styles.body} key={`${item.ingredient}-${idx}`}>
                    - {item.ingredient}: {item.reason} (boost {item.boost})
                  </Text>))) : (<Text style={styles.body}>- No strong positive drivers detected.</Text>)}
              <Text style={styles.sectionTitle}>Triggered Rules</Text>
              {assessment.explanations.triggeredRules.length > 0 ? (assessment.explanations.triggeredRules.map((rule, idx) => (<Text style={styles.body} key={`${rule.ruleId}-${idx}`}>
                    - {rule.ruleId}: {rule.description}
                  </Text>))) : (<Text style={styles.body}>- No explicit rules were triggered.</Text>)}
            </AppCard>
          </FadeIn>

          <FadeIn delay={200}>
            <AppCard>
              <Text style={styles.sectionTitle}>Guidance</Text>
              {assessment.guidance.patchTest.map((item, idx) => (<Text style={styles.body} key={`patch-${idx}`}>
                  - {item}
                </Text>))}
              {assessment.guidance.usage.map((item, idx) => (<Text style={styles.body} key={`usage-${idx}`}>
                  - {item}
                </Text>))}
              {assessment.guidance.avoidIf.map((item, idx) => (<Text style={styles.body} key={`avoid-${idx}`}>
                  - {item}
                </Text>))}

              <Text style={styles.sectionTitle}>Safer Alternatives</Text>
              {assessment.alternatives.map((alt) => (<Text style={styles.body} key={alt.productId}>
                  - {alt.name}: {alt.whyBetter}
                </Text>))}

              <AppButton label="Open Feedback Form" variant="secondary" onPress={() => router.push('/feedback')}/>
              <AppButton label="View History" onPress={() => router.push('/(tabs)/history')}/>
            </AppCard>
          </FadeIn>
        </>) : null}
    </AppScreen>);
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
