import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../constants/Typography';

export default function IndexScreen() {
  const { user, activeRole, isLoading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    // Initial entry point is the Login Screen as requested
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 50);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.centerContent}>
        <Image
          source={require('../assets/icon.png')}
          style={styles.iconCircle}
          resizeMode="cover"
        />
        <Text style={[Typography.largeTitle, styles.title]}>
          AAVIN
        </Text>
        <Text style={[Typography.title2, styles.subTitle]}>
          Smart Cattle Passport
        </Text>
        <Text style={[Typography.footnote, styles.twinBadge]}>
          MILK SAFETY TWIN • MADURAI UNION
        </Text>
        <Text style={[Typography.caption1, styles.demoBadge]}>
          ACADEMIC FRONTEND PROTOTYPE • LOCAL SIMULATION
        </Text>
        <ActivityIndicator color="#FFFFFF" size="large" style={styles.loader} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 2,
  },
  subTitle: {
    color: '#EAF5FC',
    marginTop: 4,
    fontWeight: '700',
  },
  twinBadge: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    letterSpacing: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  demoBadge: {
    color: '#FEF3C7',
    marginTop: 6,
    letterSpacing: 0.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  loader: {
    marginTop: 32,
  },
});
