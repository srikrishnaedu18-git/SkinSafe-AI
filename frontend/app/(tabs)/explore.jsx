import { StyleSheet, Text } from 'react-native';
import { AppCard } from '../../components/ui/app-card';
import { FadeIn } from '../../components/ui/fade-in';
import { AppScreen } from '../../components/ui/app-screen';
import { ScreenHeader } from '../../components/ui/screen-header';
import { StatusChip } from '../../components/ui/status-chip';
import { Palette, Type } from '../../constants/design';
export default function ExploreScreen() {
    return (<AppScreen>
      <FadeIn>
        <ScreenHeader title="Explore" subtitle="Quick reference for your compatibility workflow and interpretation."/>
      </FadeIn>

      <FadeIn delay={50}>
        <AppCard tone="accent">
          <StatusChip label="How To Use" tone="neutral"/>
          <Text style={styles.body}>1. Save profile</Text>
          <Text style={styles.body}>2. Scan/enter QR and resolve product</Text>
          <Text style={styles.body}>3. Verify record</Text>
          <Text style={styles.body}>4. Run assessment</Text>
          <Text style={styles.body}>5. Review XAI explanations and guidance</Text>
        </AppCard>
      </FadeIn>

      <FadeIn delay={90}>
        <AppCard>
          <StatusChip label="Interpretation" tone="warning"/>
          <Text style={styles.body}>- Higher score means better profile compatibility.</Text>
          <Text style={styles.body}>- High severity flags need caution before use.</Text>
          <Text style={styles.body}>- Triggered rules explain exactly why risk/benefit changed.</Text>
          <Text style={styles.body}>- Confidence reason tells you if data is incomplete.</Text>
        </AppCard>
      </FadeIn>
    </AppScreen>);
}
const styles = StyleSheet.create({
    body: {
        fontSize: Type.body,
        color: Palette.textSecondary,
        lineHeight: 22,
    },
});
