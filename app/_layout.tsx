import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppStateProvider } from '@/context/app-state';

const APP_THEME = {
  dark: false,
  colors: {
    primary: '#0F766E',
    background: '#F5F7FA',
    card: '#FFFFFF',
    text: '#111827',
    border: '#E5E7EB',
    notification: '#B91C1C',
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={APP_THEME}>
      <AppStateProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="feedback" options={{ title: 'Feedback' }} />
          <Stack.Screen name="scan" options={{ title: 'Scan Product' }} />
          <Stack.Screen name="report/[assessmentId]" options={{ title: 'Report' }} />
        </Stack>
      </AppStateProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
