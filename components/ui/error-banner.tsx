import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Spacing, Type } from '@/constants/design';

type ErrorBannerProps = {
  message: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.dangerSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: Spacing.md,
  },
  text: {
    color: Palette.danger,
    fontSize: Type.caption,
    fontWeight: '600',
  },
});
