import React from 'react';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/design';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Palette.primaryStrong,
        tabBarInactiveTintColor: Palette.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          paddingBottom: 2,
        },
        tabBarStyle: {
          height: 70,
          paddingTop: 8,
          borderTopColor: '#CDE5DE',
          borderTopWidth: 1,
          backgroundColor: '#FAFFFD',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="product"
        options={{
          title: 'Product',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="barcode.viewfinder" color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessment"
        options={{
          title: 'Assessment',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.xaxis" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="clock.arrow.circlepath" color={color} />,
        }}
      />
    </Tabs>
  );
}
