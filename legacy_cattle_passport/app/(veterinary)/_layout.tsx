import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { FloatingAavinTabBar } from '../../components/navigation/FloatingAavinTabBar';
import { TAB_BAR_CONTENT_INSET } from '../../components/navigation/curvedNavPath';

export default function VeterinaryLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingAavinTabBar {...props} />}
      backBehavior="history"
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

      {/* 2. Cattle */}
      <Tabs.Screen
        name="cattle-registry"
        options={{
          title: 'Cattle',
          headerShown: false,
        }}
      />

      {/* 3. Treatments */}
      <Tabs.Screen
        name="treatment-entry"
        options={{
          title: 'Treatments',
          headerShown: false,
        }}
      />

      {/* 4. Follow-ups */}
      <Tabs.Screen
        name="examination-entry"
        options={{
          title: 'Follow-ups',
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

      {/* Subroutes (Hidden from Bottom Bar) */}
      <Tabs.Screen
        name="cow-details"
        options={{
          href: null,
          title: 'Veterinary Passport',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
