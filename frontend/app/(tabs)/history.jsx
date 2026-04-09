import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { AppButton } from '../../components/ui/app-button';
import { AppCard } from '../../components/ui/app-card';
import { FadeIn } from '../../components/ui/fade-in';
import { AppScreen } from '../../components/ui/app-screen';
import { ScreenHeader } from '../../components/ui/screen-header';
import { StatusChip } from '../../components/ui/status-chip';
import { Palette, Type } from '../../constants/design';
import { useAppState } from '../../context/app-state';
import { formatScore } from '../../services/format/score';
export default function HistoryScreen() {
    const { hydrated, history, clearHistory, resetAllData } = useAppState();
    if (!hydrated) {
        return (<AppScreen>
        <AppCard>
          <StatusChip label="Loading" tone="neutral"/>
          <Text style={styles.body}>Restoring reports...</Text>
        </AppCard>
      </AppScreen>);
    }
    return (<AppScreen>
      <FadeIn>
        <ScreenHeader title="Assessment History" subtitle="Saved reports and export-ready summaries."/>
      </FadeIn>

      {history.length === 0 ? (<FadeIn delay={60}>
          <AppCard tone="accent">
            <StatusChip label="No Reports Yet" tone="warning"/>
            <Text style={styles.body}>Run at least one assessment to populate this history feed.</Text>
          </AppCard>
        </FadeIn>) : null}

      {history.map((item, idx) => (<FadeIn delay={70 + idx * 20} key={item.assessment.assessmentId}>
          <AppCard>
            <StatusChip label={new Date(item.createdAt).toLocaleString()} tone="neutral"/>
            <Text style={styles.sectionTitle}>{item.productName}</Text>
            <Text style={styles.body}>Score: {formatScore(item.assessment.suitabilityScore)}/100</Text>
            <Text style={styles.body}>Confidence: {formatScore(item.assessment.confidence.value)}%</Text>
            <Text style={styles.body}>Risk Level: {item.assessment?.xai?.summary?.risk_level ?? 'N/A'}</Text>
            {item.assessment?.xai?.reasons?.[0]?.title ? (<Text style={styles.body}>Top Reason: {item.assessment.xai.reasons[0].title}</Text>) : null}
            <Text style={styles.body}>
              Alternatives: {item.assessment?.xai?.alternatives?.results?.length ?? item.assessment.alternatives.length ?? 0}
            </Text>
            <Text style={styles.body}>
              Flags: {item.assessment.riskFlags.map((f) => `${f.code}[${f.severity}]`).join(' | ') || 'none'}
            </Text>
            <AppButton label="View Report" onPress={() => router.push({
                pathname: '/report/[assessmentId]',
                params: { assessmentId: item.assessment.assessmentId },
            })}/>
          </AppCard>
        </FadeIn>))}

      <FadeIn delay={120}>
        <AppCard>
          <Text style={styles.sectionTitle}>History Controls</Text>
          <Text style={styles.body}>Use report view for PDF export. You can clear or reset data here.</Text>
          <AppButton label="Clear History" variant="secondary" onPress={clearHistory} disabled={history.length === 0}/>
          <AppButton label="Reset Entire App Data" variant="secondary" onPress={resetAllData}/>
        </AppCard>
      </FadeIn>
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
