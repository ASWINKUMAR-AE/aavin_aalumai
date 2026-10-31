import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function VendorCowDetailsRedirect() {
  const params = useLocalSearchParams<{ cowId?: string; id?: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    const cowId = params.cowId || params.id;
    if (cowId) {
      router.replace(`/(farmer)/cow-details?cowId=${cowId}` as any);
    } else {
      router.replace('/(farmer)/cows' as any);
    }
  }, [params, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
