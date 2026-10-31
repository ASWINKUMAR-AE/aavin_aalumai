import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';

interface SafetyDecisionRevealProps {
  decision: 'CLEAR' | 'REVIEW' | 'HOLD';
  primaryReason: string;
  evaluatedAt?: string;
}

export const SafetyDecisionReveal: React.FC<SafetyDecisionRevealProps> = ({
  decision,
  primaryReason,
  evaluatedAt,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    opacity.value = withSpring(1);

    if (decision === 'CLEAR') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (decision === 'REVIEW') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [decision]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getConfig = () => {
    switch (decision) {
      case 'CLEAR':
        return {
          bg: colors.clearBg,
          color: colors.clear,
          icon: 'checkmark-circle' as const,
          badgeTitle: 'MILK SAFETY VERIFIED — CLEAR',
          sub: 'Safe for pooling and direct consumer supply',
        };
      case 'REVIEW':
        return {
          bg: colors.reviewBg,
          color: colors.review,
          icon: 'alert-circle' as const,
          badgeTitle: 'OPERATOR ATTENTION — REVIEW',
          sub: 'Parameters within review boundary range',
        };
      case 'HOLD':
      default:
        return {
          bg: colors.holdBg,
          color: colors.hold,
          icon: 'hand-left' as const,
          badgeTitle: 'MANDATORY SAFETY HOLD — DO NOT POOL',
          sub: 'Active withdrawal or failed critical test standard',
        };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          borderColor: config.color,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: config.color }]}>
        <Ionicons name={config.icon} size={36} color="#FFFFFF" />
      </View>
      <Text style={[Typography.title2, { color: config.color, marginTop: 12, fontWeight: '800', textAlign: 'center' }]}>
        {config.badgeTitle}
      </Text>
      <Text style={[Typography.subhead, { color: colors.text, marginTop: 6, textAlign: 'center', fontWeight: '600' }]}>
        {primaryReason}
      </Text>
      <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
        {config.sub}
      </Text>
      {evaluatedAt && (
        <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 8 }]}>
          Evaluated at: {new Date(evaluatedAt).toLocaleTimeString('en-IN')}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
