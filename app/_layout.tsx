import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(worker)" />
          <Stack.Screen name="(supervisor)" />
          <Stack.Screen name="(official)" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
