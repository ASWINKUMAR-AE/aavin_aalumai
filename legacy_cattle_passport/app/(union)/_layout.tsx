import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { FloatingAavinTabBar } from '../../components/navigation/FloatingAavinTabBar';
import { TAB_BAR_CONTENT_INSET } from '../../components/navigation/curvedNavPath';

export default function UnionLayout() {
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

      {/* 2. BMCs */}
      <Tabs.Screen
        name="bmc-monitoring"
        options={{
          title: 'BMCs',
          headerShown: false,
        }}
      />

      {/* 3. Reports */}
      <Tabs.Screen
        name="receipt-review"
        options={{
          title: 'Reports',
          headerShown: false,
        }}
      />

      {/* 4. Alerts */}
      <Tabs.Screen
        name="discrepancies"
        options={{
          title: 'Alerts',
          headerShown: false,
        }}
      />

      {/* 5. Profile */}
      <Tabs.Screen
        name="union-profile"
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />

      {/* Subroutes (Hidden from Bottom Floating Tab Bar) */}
      <Tabs.Screen
        name="bmc-analytics"
        options={{
          href: null,
          title: 'BMC Production Analytics',
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="society-analytics"
        options={{
          href: null,
          title: 'Society Production Analytics',
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="farmer-analytics"
        options={{
          href: null,
          title: 'Farmer Production Analytics',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
