import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from './Card';
import { Ionicons } from '@expo/vector-icons';

interface StatTileProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onPress?: () => void;
  style?: ViewStyle;
}

export const StatTile: React.FC<StatTileProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  iconColor,
  iconBg,
  trend,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <Card onPress={onPress} style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={[Typography.footnote, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
          {title}
        </Text>
        {icon && (
          <View style={[styles.iconBox, { backgroundColor: iconBg || colors.primaryLight }]}>
            <Ionicons name={icon} size={16} color={iconColor || colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.valueRow}>
        <Text style={[Typography.title1, { color: colors.text, fontWeight: '800' }]}>
          {value}
        </Text>
        {unit && (
          <Text style={[Typography.callout, { color: colors.textSecondary, marginLeft: 4, alignSelf: 'flex-end', marginBottom: 3 }]}>
            {unit}
          </Text>
        )}
      </View>

      <View style={styles.footerRow}>
        {trend && (
          <View
            style={[
              styles.trendBadge,
              { backgroundColor: trend.isPositive ? colors.clearBg : colors.holdBg },
            ]}
          >
            <Ionicons
              name={trend.isPositive ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={trend.isPositive ? colors.clear : colors.hold}
            />
            <Text
              style={[
                Typography.caption2,
                { color: trend.isPositive ? colors.clear : colors.hold, marginLeft: 2 },
              ]}
            >
              {trend.value}
            </Text>
          </View>
        )}
        {subtitle && (
          <Text style={[Typography.caption1, { color: colors.textMuted, marginLeft: trend ? 6 : 0 }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    marginHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
