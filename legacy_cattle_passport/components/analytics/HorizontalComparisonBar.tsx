import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { PeriodComparison, formatLitres } from '../../services/bmcAnalyticsService';

interface HorizontalComparisonBarProps {
  rank: number;
  title: string;
  code: string;
  comparison: PeriodComparison;
  maxVolume: number;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

export const HorizontalComparisonBar: React.FC<HorizontalComparisonBarProps> = ({
  rank,
  title,
  code,
  comparison,
  maxVolume,
  subtitle,
  onPress,
  showChevron = true,
}) => {
  const { colors } = useTheme();

  const percentageWidth = maxVolume > 0
    ? Math.max(Math.min((comparison.current / maxVolume) * 100, 100), 10)
    : 15;

  const isPositive = comparison.deltaPercentage >= 0;
  const trendBg = isPositive ? '#DCFCE7' : '#FEE2E2';
  const trendColor = isPositive ? '#15803D' : '#DC2626';

  const getRankBadge = (r: number) => {
    if (r === 1) return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
    if (r === 2) return { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
    if (r === 3) return { bg: '#FFEDD5', color: '#C2410C', border: '#FED7AA' };
    return { bg: colors.background, color: colors.textSecondary, border: colors.border };
  };

  const rankStyle = getRankBadge(rank);

  const content = (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Top Header: Rank + Title + Code + Trend Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={[styles.rankBadge, { backgroundColor: rankStyle.bg, borderColor: rankStyle.border }]}>
            <Text style={[styles.rankText, { color: rankStyle.color }]}>#{rank}</Text>
          </View>

          <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 1 }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.codeBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.codeBadgeText, { color: colors.primary }]}>{code}</Text>
          </View>

          <View style={[styles.trendBadge, { backgroundColor: trendBg }]}>
            <Ionicons
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={12}
              color={trendColor}
              style={{ marginRight: 3 }}
            />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {isPositive ? `+${comparison.deltaPercentage}%` : `${comparison.deltaPercentage}%`}
            </Text>
          </View>

          {showChevron && onPress ? (
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
          ) : null}
        </View>
      </View>

      {/* Production Volume & Comparison Subtitle */}
      <View style={styles.metricsRow}>
        <View style={styles.volumeBlock}>
          <Text style={[Typography.title2, { color: colors.text, fontWeight: '900' }]}>
            {formatLitres(comparison.current)}
          </Text>
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 6 }]}>
            {comparison.currentLabel}
          </Text>
        </View>

        <Text style={[Typography.caption2, { color: colors.textSecondary, textAlign: 'right' }]}>
          vs {formatLitres(comparison.previous)} ({comparison.periodLabel})
        </Text>
      </View>

      {/* Comparative Progress Bar Track */}
      <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${percentageWidth}%`,
              backgroundColor: isPositive ? colors.primary : '#F59E0B',
            },
          ]}
        />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1.0 }]}>
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 8,
    flexShrink: 0,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '900',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 4,
  },
  volumeBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
});
