import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/ui/app-button';
import { AppCard } from '../components/ui/app-card';
import { FadeIn } from '../components/ui/fade-in';
import { AppInput } from '../components/ui/app-input';
import { AppScreen } from '../components/ui/app-screen';
import { ErrorBanner } from '../components/ui/error-banner';
import { ScreenHeader } from '../components/ui/screen-header';
import { StatusChip } from '../components/ui/status-chip';
import { Palette, Radius, Spacing, Type } from '../constants/design';
import { useAppState } from '../context/app-state';
const severities = ['low', 'medium', 'high'];
export default function FeedbackScreen() {
    const { assessment, busy, error, submitFeedback } = useAppState();
    const [reaction, setReaction] = useState('No reaction');
    const [severity, setSeverity] = useState('low');
    const [notes, setNotes] = useState('Comfortable after patch test.');
    const [sent, setSent] = useState(false);
    const onSubmit = async () => {
        const success = await submitFeedback(reaction.trim(), severity, notes.trim());
        setSent(success);
    };
    return (<AppScreen>
      <FadeIn>
        <ScreenHeader title="Post-Use Feedback" subtitle="Capture outcome to improve personalization quality over time."/>
      </FadeIn>

      {error ? (<FadeIn delay={40}>
          <ErrorBanner message={error}/>
        </FadeIn>) : null}

      <FadeIn delay={80}>
        <AppCard tone="accent">
          <StatusChip label={assessment ? `Assessment: ${assessment.assessmentId}` : 'No Assessment Context'} tone="warning"/>
          <AppInput label="Reaction" value={reaction} onChangeText={setReaction} placeholder="No reaction / mild redness"/>

          <Text style={styles.label}>Severity</Text>
          <View style={styles.row}>
            {severities.map((item) => {
            const active = severity === item;
            return (<Pressable key={item} onPress={() => setSeverity(item)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </Pressable>);
        })}
          </View>

          <AppInput label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Any symptoms, timing, and context"/>

          <AppButton label={busy.submittingFeedback ? 'Submitting...' : 'Submit Feedback'} onPress={onSubmit} disabled={!assessment || busy.submittingFeedback}/>
          <AppButton label="Back To Assessment" variant="secondary" onPress={() => router.back()}/>
        </AppCard>
      </FadeIn>

      {sent ? (<FadeIn delay={120}>
          <AppCard>
            <StatusChip label="Feedback Submitted" tone="success"/>
            <Text style={styles.body}>Thank you. This event can be used for future threshold recalibration.</Text>
          </AppCard>
        </FadeIn>) : null}
    </AppScreen>);
}
const styles = StyleSheet.create({
    label: {
        fontSize: Type.caption,
        color: Palette.textSecondary,
        fontWeight: '700',
    },
    body: {
        fontSize: Type.body,
        color: Palette.textSecondary,
        lineHeight: 22,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    chip: {
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Palette.border,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Palette.surface,
    },
    chipActive: {
        borderColor: Palette.primary,
        backgroundColor: Palette.primarySoft,
    },
    chipText: {
        color: Palette.textSecondary,
        fontSize: Type.caption,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    chipTextActive: {
        color: Palette.primaryStrong,
    },
});
