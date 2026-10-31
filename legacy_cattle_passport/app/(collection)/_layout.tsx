import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function CollectionLayout() {
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
          title: 'Centre Desk',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contribution-workflow"
        options={{
          title: 'Intermediary Intake',
          headerTitle: 'Intermediary & Farmer Intake',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="booth-ledger"
        options={{
          title: 'Society Ledger',
          headerTitle: 'Village Society Digital Ledger',
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plant-dispatch"
        options={{
          title: 'Plant Dispatch',
          headerTitle: 'Dispatch & Plant Reconciliation',
          tabBarIcon: ({ color, size }) => <Ionicons name="git-network-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="intermediaries"
        options={{
          title: 'Karai-Pathu',
          headerTitle: 'Intermediaries Directory',
          tabBarIcon: ({ color, size }) => <Ionicons name="bicycle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="new-collection"
        options={{
          title: 'Cow Intake',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="receipt"
        options={{
          href: null,
          title: 'Intake Receipt',
        }}
      />
    </Tabs>
  );
}
