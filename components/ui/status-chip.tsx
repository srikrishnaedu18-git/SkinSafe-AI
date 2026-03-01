import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Spacing, Type } from '@/constants/design';

type ChipTone = 'success' | 'warning' | 'danger' | 'neutral';

type StatusChipProps = {
  label: string;
  tone?: ChipTone;
};

const toneStyles = {
  success: { bg: Palette.successSoft, text: Palette.success },
  warning: { bg: Palette.warningSoft, text: Palette.warning },
  danger: { bg: Palette.dangerSoft, text: Palette.danger },
  neutral: { bg: Palette.primarySoft, text: Palette.primary },
};

export function StatusChip({ label, tone = 'neutral' }: StatusChipProps) {
  return (
    <View style={[styles.chip, { backgroundColor: toneStyles[tone].bg }]}>
      <Text style={[styles.text, { color: toneStyles[tone].text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  text: {
    fontSize: Type.caption,
    fontWeight: '600',
  },
});
