import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/ui/app-button';
import { AppCard } from '../../components/ui/app-card';
import { FadeIn } from '../../components/ui/fade-in';
import { AppScreen } from '../../components/ui/app-screen';
import { ErrorBanner } from '../../components/ui/error-banner';
import { ScreenHeader } from '../../components/ui/screen-header';
import { StatusChip } from '../../components/ui/status-chip';
import { Palette, Type } from '../../constants/design';
import { useAppState } from '../../context/app-state';

const reasonGroups = ['IRRITATION', 'ACNE', 'OVERALL'];

function toneFromSeverity(severity) {
    const value = String(severity ?? '').toUpperCase();
    if (value === 'HIGH')
        return 'danger';
    if (value === 'MEDIUM')
        return 'warning';
    if (value === 'LOW')
        return 'success';
    return 'neutral';
}
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
              {assessment?.xai?.summary?.risk_level ? (<Text style={styles.body}>Risk Level: {assessment.xai.summary.risk_level}</Text>) : null}
              <Text style={styles.sectionTitle}>Top Reasons</Text>
              {assessment?.xai?.reasons?.length > 0 ? (<>
                  {reasonGroups.map((groupKey) => {
            const groupedReasons = assessment?.xai?.reason_groups?.[groupKey] ?? [];
            if (groupedReasons.length === 0)
                return null;
            return (<View key={groupKey} style={styles.groupWrap}>
                          <Text style={styles.groupTitle}>{groupKey}</Text>
                          {groupedReasons.map((reason) => (<View key={`${groupKey}-${reason.rank}-${reason.item}`} style={styles.reasonCard}>
                              <View style={styles.reasonHeader}>
                                <Text style={styles.reasonTitle}>{reason.title}</Text>
                                <StatusChip label={reason.severity ?? 'LOW'} tone={toneFromSeverity(reason.severity)}/>
                              </View>
                              <Text style={styles.body}>Why: {reason.why}</Text>
                              <Text style={styles.body}>Action: {reason.action}</Text>
                            </View>))}
                        </View>);
        })}
                </>) : (<Text style={styles.body}>- No enriched reasons available.</Text>)}
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
              {assessment?.xai?.alternatives?.constraints ? (<Text style={styles.body}>
                  Constraints: same category {assessment.xai.alternatives.constraints.same_category || 'N/A'}, avoid{' '}
                  {(assessment.xai.alternatives.constraints.avoid_ingredients || []).join(', ') || 'none'}
                </Text>) : null}
              {assessment.alternatives.length > 0 ? (assessment.alternatives.map((alt) => (<Text style={styles.body} key={alt.productId}>
                  - {alt.name}: {alt.whyBetter}
                </Text>))) : (<Text style={styles.body}>- No alternatives found for current constraints.</Text>)}

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
    groupWrap: {
        marginTop: 8,
        gap: 8,
    },
    groupTitle: {
        fontSize: Type.body,
        fontWeight: '700',
        color: Palette.primaryStrong,
    },
    reasonCard: {
        borderWidth: 1,
        borderColor: Palette.border,
        borderRadius: 12,
        padding: 10,
        gap: 4,
        backgroundColor: '#FBFDFC',
    },
    reasonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    reasonTitle: {
        flex: 1,
        fontSize: Type.body,
        fontWeight: '700',
        color: Palette.textPrimary,
    },
});
