import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { FloatingAavinTabBar } from '../../components/navigation/FloatingAavinTabBar';
import { TAB_BAR_CONTENT_INSET } from '../../components/navigation/curvedNavPath';

export default function AdminLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingAavinTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShown: false,
        sceneStyle: { paddingBottom: TAB_BAR_CONTENT_INSET, backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'System Ops',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="verifications"
        options={{
          title: 'Verifications',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="demo-settings"
        options={{
          title: 'Settings',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />

      {/* Hidden legacy routes */}
      <Tabs.Screen name="safety-reviews" options={{ href: null }} />
      <Tabs.Screen name="reconciliation" options={{ href: null }} />
      <Tabs.Screen name="gm-report" options={{ href: null }} />
      <Tabs.Screen name="ai-settings" options={{ href: null }} />
    </Tabs>
  );
}
