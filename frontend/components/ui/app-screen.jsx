import { router, usePathname } from 'expo-router';
import { useMemo } from 'react';
import { PanResponder, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, Radius, Spacing } from '../../constants/design';

const TAB_ROUTES = ['/(tabs)/index', '/(tabs)/product', '/(tabs)/assessment', '/(tabs)/history', '/(tabs)/explore'];
const SWIPE_THRESHOLD = 60;

export function AppScreen({ children, scroll = true }) {
  const pathname = usePathname();

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const isTabRoute = TAB_ROUTES.includes(pathname);
          if (!isTabRoute) return false;
          return Math.abs(gestureState.dx) > 24 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3;
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentIndex = TAB_ROUTES.indexOf(pathname);
          if (currentIndex === -1) return;

          if (gestureState.dx < -SWIPE_THRESHOLD) {
            const next = TAB_ROUTES[currentIndex + 1];
            if (next) router.replace(next);
            return;
          }

          if (gestureState.dx > SWIPE_THRESHOLD) {
            const prev = TAB_ROUTES[currentIndex - 1];
            if (prev) router.replace(prev);
          }
        },
      }),
    [pathname]
  );

  const content = <View style={styles.inner}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea} {...panResponder.panHandlers}>
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
