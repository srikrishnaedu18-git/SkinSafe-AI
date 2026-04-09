import React from 'react';
import { Tabs, router } from 'expo-router';
import { HapticTab } from '../../components/haptic-tab';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { Palette } from '../../constants/design';
import { useAppState } from '../../context/app-state';

export default function TabLayout() {
  const { hydrated, auth } = useAppState();

  React.useEffect(() => {
    if (!hydrated || auth) return;
    router.replace('/');
  }, [hydrated, auth]);

  if (!hydrated) {
    return null;
  }

  if (!auth) {
    return null;
  }

  return (
    <Tabs
      initialRouteName="product"
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        animation: 'none',
        tabBarActiveTintColor: Palette.primaryStrong,
        tabBarInactiveTintColor: Palette.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          paddingBottom: 3,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
        },
        tabBarStyle: {
          height: 70,
          paddingTop: 6,
          borderTopColor: '#CDE5DE',
          borderTopWidth: 1,
          backgroundColor: '#FAFFFD',
        },
      }}
    >
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
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="safari.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
