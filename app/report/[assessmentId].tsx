import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { FadeIn } from '@/components/ui/fade-in';
import { AppScreen } from '@/components/ui/app-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/status-chip';
import { Palette, Type } from '@/constants/design';
import { useAppState } from '@/context/app-state';
import { buildReportJson } from '@/services/report/build-report';
import { exportReportAsPdf } from '@/services/report/export-pdf';

export default function ReportDetailsScreen() {
  const { assessmentId } = useLocalSearchParams<{ assessmentId: string }>();
  const { history, profile } = useAppState();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        <ScreenHeader
          title="Assessment Report"
          subtitle="Clinician-ready structured output with JSON and PDF export."
        />
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
          <Text style={styles.body}>Assessment ID: {item.assessment.assessmentId}</Text>
          <Text style={styles.body}>Suitability Score: {item.assessment.score}/100</Text>
          <Text style={styles.body}>Confidence: {item.assessment.confidence.toFixed(2)}</Text>
        </AppCard>
      </FadeIn>

      <FadeIn delay={120}>
        <AppCard>
          <Text style={styles.sectionTitle}>Flags</Text>
          {item.assessment.flags.map((flag) => (
            <Text style={styles.body} key={flag}>
              - {flag}
            </Text>
          ))}
        </AppCard>
      </FadeIn>

      <FadeIn delay={160}>
        <AppCard>
          <Text style={styles.sectionTitle}>JSON Preview</Text>
          <Text style={styles.mono}>{jsonReport}</Text>
          <AppButton label="Share JSON Report" onPress={onShareReport} />
          <AppButton
            label={exporting ? 'Exporting PDF...' : 'Export PDF Report'}
            onPress={onExportPdf}
            disabled={exporting}
          />
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
});
