import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { FloatingAavinTabBar } from '../../components/navigation/FloatingAavinTabBar';
import { TAB_BAR_CONTENT_INSET } from '../../components/navigation/curvedNavPath';

export default function BMCLayout() {
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
      {/* 1. Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />

      {/* 2. Deliveries */}
      <Tabs.Screen
        name="receive-milk"
        options={{
          title: 'Deliveries',
          headerShown: false,
        }}
      />

      {/* 3. Verify Milk */}
      <Tabs.Screen
        name="daily-summary"
        options={{
          title: 'Verify Milk',
          headerShown: false,
        }}
      />

      {/* 4. Alerts */}
      <Tabs.Screen
        name="investigations"
        options={{
          title: 'Alerts',
          headerShown: false,
        }}
      />

      {/* 5. Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />

      {/* Sub-routes (Hidden from floating tab bar) */}
      <Tabs.Screen
        name="society-details"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="societies/[societyId]"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="society-comparison"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="society-income"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="submit-union-report"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
