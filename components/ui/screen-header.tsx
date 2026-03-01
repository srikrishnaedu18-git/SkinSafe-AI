import { StyleSheet, Text, View } from 'react-native';

import { Palette, Spacing, Type } from '@/constants/design';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
};

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: Type.title,
    fontWeight: '700',
    color: Palette.textPrimary,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: Type.body,
    color: Palette.textSecondary,
    lineHeight: 22,
  },
});
