import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/design';

type AppCardProps = {
  children: ReactNode;
  tone?: 'default' | 'accent';
};

export function AppCard({ children, tone = 'default' }: AppCardProps) {
  return <View style={[styles.card, tone === 'accent' && styles.accent]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  accent: {
    borderColor: '#BDEFE5',
    borderWidth: 1.5,
    backgroundColor: '#FAFFFE',
  },
});
