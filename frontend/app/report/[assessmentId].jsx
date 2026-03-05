import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/ui/app-button';
import { AppCard } from '../../components/ui/app-card';
import { FadeIn } from '../../components/ui/fade-in';
import { AppScreen } from '../../components/ui/app-screen';
import { ScreenHeader } from '../../components/ui/screen-header';
import { StatusChip } from '../../components/ui/status-chip';
import { Palette, Type } from '../../constants/design';
import { useAppState } from '../../context/app-state';
import { buildReportJson } from '../../services/report/build-report';
import { exportReportAsPdf } from '../../services/report/export-pdf';

const reasonGroups = ['IRRITATION', 'ACNE', 'OVERALL'];

function toneFromSeverity(severity) {
  const value = String(severity ?? '').toUpperCase();
  if (value === 'HIGH') return 'danger';
  if (value === 'MEDIUM') return 'warning';
  if (value === 'LOW') return 'success';
  return 'neutral';
}

export default function ReportDetailsScreen() {
  const { assessmentId } = useLocalSearchParams();
  const { history, profile } = useAppState();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);

  const item = history.find((entry) => entry.assessment.assessmentId === assessmentId);

  if (!item) {
    return (
      <AppScreen>
        <AppCard>
          <StatusChip label="Report Not Found" tone="danger" />
          <Text style={styles.body}>The selected report is missing. Run an assessment and try again.</Text>
          <AppButton label="Back To History" onPress={() => router.replace('/(tabs)/history')} />
        </AppCard>
      </AppScreen>
    );
  }

  const productIngredients = item.productSnapshot?.ingredients ?? [];
  const userSkinType = item.userProfileSnapshot?.skinType ?? profile?.skinType ?? 'Not provided';
  const productCategory = item.productSnapshot?.category ?? 'Unknown';

  const jsonReport = buildReportJson(item, profile);

  const onShareReport = async () => {
    await Share.share({
      title: `Assessment Report - ${item.productName}`,
      message: jsonReport,
    });
  };

  const onExportPdf = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const uri = await exportReportAsPdf(item, profile);
      setMessage(`PDF generated at: ${uri}`);
    } catch {
      setMessage('Could not export PDF report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppScreen>
      <FadeIn>
        <ScreenHeader title="Assessment Report" subtitle="Clinician-ready structured output with JSON and PDF export." />
      </FadeIn>

      {message ? (
        <FadeIn delay={40}>
          <AppCard>
            <StatusChip label="Export Status" tone="neutral" />
            <Text style={styles.body}>{message}</Text>
          </AppCard>
        </FadeIn>
      ) : null}

      <FadeIn delay={80}>
        <AppCard tone="accent">
          <StatusChip label={new Date(item.createdAt).toLocaleString()} tone="neutral" />
          <Text style={styles.sectionTitle}>{item.productName}</Text>
          <Text style={styles.body}>Category: {productCategory}</Text>
          <Text style={styles.body}>Ingredients: {productIngredients.length ? productIngredients.join(', ') : 'Not available'}</Text>
          <Text style={styles.body}>User Skin Type: {userSkinType}</Text>
          <Text style={styles.body}>Assessment ID: {item.assessment.assessmentId}</Text>
          <Text style={styles.body}>Suitability Score: {Number(item.assessment.suitabilityScore).toFixed(2)}/100</Text>
          <Text style={styles.body}>Confidence: {item.assessment.confidence.value.toFixed(2)}%</Text>
          <Text style={styles.body}>Reason: {item.assessment.confidence.reason}</Text>
        </AppCard>
      </FadeIn>

      <FadeIn delay={120}>
        <AppCard>
          <Text style={styles.sectionTitle}>Flags</Text>
          {item.assessment.riskFlags.length > 0 ? (
            item.assessment.riskFlags.map((flag, idx) => (
              <Text style={styles.body} key={`${flag.code}-${idx}`}>
                - {flag.code} [{flag.severity}] {flag.ingredients.length ? `(${flag.ingredients.join(', ')})` : ''}
              </Text>
            ))
          ) : (
            <Text style={styles.body}>- No flags recorded.</Text>
          )}
        </AppCard>
      </FadeIn>

      <FadeIn delay={160}>
        <AppCard>
          <Text style={styles.sectionTitle}>XAI Summary</Text>
          <Text style={styles.body}>Risk Level: {item.assessment?.xai?.summary?.risk_level ?? 'N/A'}</Text>
          <Text style={styles.body}>{item.assessment?.xai?.summary?.headline ?? 'No headline available.'}</Text>
          <Text style={styles.sectionTitle}>Top Reasons</Text>
          {item.assessment?.xai?.reasons?.length > 0 ? (
            <>
              {reasonGroups.map((groupKey) => {
                const groupedReasons = item.assessment?.xai?.reason_groups?.[groupKey] ?? [];
                if (groupedReasons.length === 0) return null;
                return (
                  <View key={groupKey} style={styles.groupWrap}>
                    <Text style={styles.groupTitle}>{groupKey}</Text>
                    {groupedReasons.map((reason) => (
                      <View key={`${groupKey}-${reason.rank}-${reason.item}`} style={styles.reasonCard}>
                        <View style={styles.reasonHeader}>
                          <Text style={styles.reasonTitle}>{reason.title}</Text>
                          <StatusChip label={reason.severity ?? 'LOW'} tone={toneFromSeverity(reason.severity)} />
                        </View>
                        <Text style={styles.body}>Why: {reason.why}</Text>
                        <Text style={styles.body}>Action: {reason.action}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={styles.body}>- No enriched reasons available.</Text>
          )}

          <Text style={styles.sectionTitle}>Precautions</Text>
          {item.assessment?.xai?.precautions?.length > 0 ? (
            item.assessment.xai.precautions.map((precaution, idx) => (
              <Text style={styles.body} key={`${precaution.code}-${idx}`}>
                - {precaution.code}: {precaution.text}
              </Text>
            ))
          ) : (
            <Text style={styles.body}>- No precautions returned.</Text>
          )}

          <Text style={styles.sectionTitle}>Alternatives</Text>
          {item.assessment?.xai?.alternatives?.constraints ? (
            <Text style={styles.body}>
              Constraints: same category {item.assessment.xai.alternatives.constraints.same_category || 'N/A'}, avoid{' '}
              {(item.assessment.xai.alternatives.constraints.avoid_ingredients || []).join(', ') || 'none'}
            </Text>
          ) : null}
          {item.assessment?.xai?.alternatives?.results?.length > 0 ? (
            item.assessment.xai.alternatives.results.map((alt) => (
              <Text style={styles.body} key={alt.qr_id}>
                - {alt.product_name} ({alt.qr_id}) score {alt.suitability_score}/100
              </Text>
            ))
          ) : (
            <Text style={styles.body}>- No alternatives found.</Text>
          )}
        </AppCard>
      </FadeIn>

      <FadeIn delay={200}>
        <AppCard>
          <Text style={styles.sectionTitle}>JSON Preview</Text>
          <Text style={styles.mono}>{jsonReport}</Text>
          <AppButton label="Share JSON Report" onPress={onShareReport} />
          <AppButton label={exporting ? 'Exporting PDF...' : 'Export PDF Report'} onPress={onExportPdf} disabled={exporting} />
          <AppButton label="Back To History" variant="secondary" onPress={() => router.back()} />
        </AppCard>
      </FadeIn>
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
  mono: {
    fontSize: 12,
    color: Palette.textPrimary,
    lineHeight: 18,
    fontFamily: 'monospace',
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
