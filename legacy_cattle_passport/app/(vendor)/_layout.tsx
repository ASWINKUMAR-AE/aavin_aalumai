import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function VendorLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderRadius: 50,
          borderWidth: 1,
          borderColor: colors.border,
          marginHorizontal: 16,
          marginBottom: Platform.OS === 'ios' ? 24 : 12,
          position: 'absolute',
          left: 0,
          right: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tanker Logistics',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="bus-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cow-details"
        options={{
          title: 'Cattle Verification',
          headerShown: false,
          href: null,
        }}
      />
    </Tabs>
  );
}
