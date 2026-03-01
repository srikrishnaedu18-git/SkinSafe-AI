import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette, Radius, Spacing } from '@/constants/design';

type AppScreenProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function AppScreen({ children, scroll = true }: AppScreenProps) {
  const content = <View style={styles.inner}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.bgBlobTop} />
      <View style={styles.bgBlobBottom} />
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  bgBlobTop: {
    position: 'absolute',
    top: -70,
    right: -60,
    width: 220,
    height: 220,
    backgroundColor: '#DBF8F2',
    borderRadius: Radius.xl * 8,
    opacity: 0.8,
  },
  bgBlobBottom: {
    position: 'absolute',
    bottom: -90,
    left: -60,
    width: 240,
    height: 240,
    backgroundColor: '#E6F7FF',
    borderRadius: Radius.xl * 8,
    opacity: 0.6,
  },
  scroll: {
    paddingBottom: Spacing.xxl,
  },
  inner: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
});
