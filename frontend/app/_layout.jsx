import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';
import { AppStateProvider, useAppState } from '../context/app-state';

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
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

function RootNavigator() {
  const { hydrated, auth } = useAppState();

  if (!hydrated) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={!auth}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={Boolean(auth)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="feedback" options={{ title: 'Feedback' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan Product' }} />
        <Stack.Screen name="report/[assessmentId]" options={{ title: 'Report' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={APP_THEME}>
      <AppStateProvider>
        <RootNavigator />
      </AppStateProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
