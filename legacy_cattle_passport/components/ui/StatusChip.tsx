import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';

export type StatusType = 'CLEAR' | 'REVIEW' | 'HOLD' | 'healthy' | 'under_treatment' | 'quarantine' | 'pending' | 'approved' | 'paid' | 'active' | 'in_transit' | 'delivered';

interface StatusChipProps {
  status: StatusType | string;
  label?: string;
  customText?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, label, customText, size = 'md', style }) => {
  const { colors } = useTheme();

  const getStatusConfig = () => {
    switch (status.toUpperCase()) {
      case 'CLEAR':
      case 'HEALTHY':
      case 'APPROVED':
      case 'PAID':
      case 'DELIVERED':
        return {
          bg: colors.clearBg,
          color: colors.clear,
          icon: 'checkmark-circle' as const,
          defaultLabel: 'CLEAR',
        };
      case 'REVIEW':
      case 'UNDER_TREATMENT':
      case 'PENDING':
      case 'IN_TRANSIT':
        return {
          bg: colors.reviewBg,
          color: colors.review,
          icon: 'alert-circle' as const,
          defaultLabel: status === 'under_treatment' ? 'Under Treatment' : 'REVIEW',
        };
      case 'HOLD':
      case 'QUARANTINE':
      case 'FAILED':
      case 'SUSPENDED':
        return {
          bg: colors.holdBg,
          color: colors.hold,
          icon: 'hand-left' as const,
          defaultLabel: status === 'quarantine' ? 'Quarantine Hold' : 'HOLD',
        };
      default:
        return {
          bg: colors.primaryLight,
          color: colors.primary,
          icon: 'information-circle' as const,
          defaultLabel: status,
        };
    }
  };

  const config = getStatusConfig();
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 14 : 12;
  const paddingV = size === 'sm' ? 3 : size === 'lg' ? 6 : 4;
  const paddingH = size === 'sm' ? 8 : size === 'lg' ? 14 : 10;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: config.bg,
          borderColor: config.color,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
        },
        style,
      ]}
    >
      <Ionicons name={config.icon} size={iconSize} color={config.color} style={styles.icon} />
      <Text style={[Typography.caption1, { color: config.color, fontSize, fontWeight: '700' }]}>
        {label || customText || config.defaultLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
});
