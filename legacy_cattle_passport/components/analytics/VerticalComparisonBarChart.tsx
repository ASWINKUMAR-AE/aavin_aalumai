import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { PeriodComparison, formatLitres } from '../../services/bmcAnalyticsService';

export interface VerticalBarChartItem {
  id: string;
  title: string;
  code: string;
  comparison: PeriodComparison;
  rank?: number;
  subtitle?: string;
  onPress?: () => void;
}

interface VerticalComparisonBarChartProps {
  items: VerticalBarChartItem[];
  maxVolume: number;
  height?: number;
  chartTitle?: string;
}

export const VerticalComparisonBarChart: React.FC<VerticalComparisonBarChartProps> = ({
  items,
  maxVolume,
  height = 180,
  chartTitle,
}) => {
  const { colors } = useTheme();

  // Selected or hovered item ID (defaults to first/top-ranked item)
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Double-tap tracker
  const lastTapRef = useRef<number>(0);
  const lastTapIdRef = useRef<string | null>(null);

  const activeId = hoveredId || selectedId || (items.length > 0 ? items[0].id : null);
  const activeItem = items.find((it) => it.id === activeId) || items[0];

  const effectiveMax = maxVolume > 0 ? maxVolume : 1;
  const barSlotHeight = Math.max(height - 40, 100);

  const handleBarPress = (item: VerticalBarChartItem) => {
    const now = Date.now();
    const DOUBLE_TAP_WINDOW = 350; // ms

    if (lastTapIdRef.current === item.id && now - lastTapRef.current < DOUBLE_TAP_WINDOW) {
      // Double Tap Detected: Navigate to details!
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      lastTapRef.current = 0;
      lastTapIdRef.current = null;
      if (item.onPress) {
        item.onPress();
      }
    } else {
      // Single Tap Detected: Select & display full details in inspector
      lastTapRef.current = now;
      lastTapIdRef.current = item.id;
      setSelectedId(item.id);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleBarLongPress = (item: VerticalBarChartItem) => {
    setSelectedId(item.id);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  const getRankBadge = (r?: number) => {
    if (r === 1) return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
    if (r === 2) return { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
    if (r === 3) return { bg: '#FFEDD5', color: '#C2410C', border: '#FED7AA' };
    return { bg: colors.background, color: colors.textSecondary, border: colors.border };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* 1. Live Interactive Inspector Card on Tap / Double-Tap / Hover */}
      {activeItem && (
        <View style={[styles.inspectorCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header Row: Rank Badge + Full Title + Code */}
          <View style={styles.inspectorHeaderRow}>
            <View style={styles.inspectorTitleWrap}>
              {activeItem.rank ? (
                <View
                  style={[
                    styles.rankPill,
                    {
                      backgroundColor: getRankBadge(activeItem.rank).bg,
                      borderColor: getRankBadge(activeItem.rank).border,
                    },
                  ]}
                >
                  <Text style={[styles.rankPillText, { color: getRankBadge(activeItem.rank).color }]}>
                    #{activeItem.rank}
                  </Text>
                </View>
              ) : null}
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '900', flex: 1 }]} numberOfLines={1}>
                {activeItem.title}
              </Text>
            </View>

            <View style={[styles.codeBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.codeBadgeText, { color: colors.primary }]}>{activeItem.code}</Text>
            </View>
          </View>

          {activeItem.subtitle ? (
            <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 3 }]} numberOfLines={1}>
              {activeItem.subtitle}
            </Text>
          ) : null}

          {/* Metrics Row: Volume, Past comparison, Trend Pill, and Open Button */}
          <View style={[styles.inspectorMetricsRow, { borderTopColor: colors.border }]}>
            <View style={styles.volumeBlock}>
              <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900' }]}>
                {formatLitres(activeItem.comparison.current)}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 6 }]}>
                {activeItem.comparison.currentLabel}
              </Text>
            </View>

            <View style={styles.inspectorRightMetrics}>
              <View
                style={[
                  styles.trendBadge,
                  { backgroundColor: activeItem.comparison.deltaPercentage >= 0 ? '#DCFCE7' : '#FEE2E2' },
                ]}
              >
                <Ionicons
                  name={activeItem.comparison.deltaPercentage >= 0 ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={activeItem.comparison.deltaPercentage >= 0 ? '#15803D' : '#DC2626'}
                  style={{ marginRight: 2 }}
                />
                <Text
                  style={[
                    styles.trendBadgeText,
                    { color: activeItem.comparison.deltaPercentage >= 0 ? '#15803D' : '#DC2626' },
                  ]}
                >
                  {activeItem.comparison.deltaPercentage >= 0
                    ? `+${activeItem.comparison.deltaPercentage}%`
                    : `${activeItem.comparison.deltaPercentage}%`}
                </Text>
              </View>

              {activeItem.onPress && (
                <Pressable
                  onPress={activeItem.onPress}
                  style={[styles.openBtn, { backgroundColor: colors.primary }]}
                  accessibilityLabel={`Open details for ${activeItem.title}`}
                >
                  <Text style={styles.openBtnText}>Open</Text>
                  <Ionicons name="arrow-forward" size={12} color="#FFFFFF" style={{ marginLeft: 2 }} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Guide Note with Gesture Instructions */}
      <View style={styles.chartLegendRow}>
        <View style={styles.legendLeft}>
          <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 4 }]}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Single tap:</Text> Details • <Text style={{ fontWeight: '700', color: colors.primary }}>Double tap:</Text> Open
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
          Peak: {formatLitres(maxVolume)}
        </Text>
      </View>

      {/* 2. Vertical Bars Chart Area */}
      <View style={[styles.chartAreaWrapper, { height: barSlotHeight + 52 }]}>
        {/* Left Y-Axis Rail with Guidelines */}
        <View style={[styles.yAxisRail, { height: barSlotHeight }]}>
          <Text style={[styles.yAxisLabel, { color: colors.textMuted }]}>
            {formatLitres(maxVolume).replace(' L', 'L')}
          </Text>
          <Text style={[styles.yAxisLabel, { color: colors.textMuted }]}>
            {formatLitres(Math.round(maxVolume * 0.5)).replace(' L', 'L')}
          </Text>
          <Text style={[styles.yAxisLabel, { color: colors.textMuted }]}>
            0L
          </Text>
        </View>

        {/* Scrollable Bars Area */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollableBarsContent}
        >
          {/* Aligned Gridlines across the chart */}
          <View style={[styles.gridLine, { top: 0, borderColor: colors.border }]} />
          <View style={[styles.gridLine, { top: Math.round(barSlotHeight / 2), borderColor: colors.border }]} />
          <View style={[styles.gridLine, { top: barSlotHeight - 1, borderColor: colors.border }]} />

          {items.map((item, idx) => {
            const isHovered = item.id === hoveredId;
            const isSelected = item.id === activeId;

            // Bar fill height (proportional to max volume, with min 14px and max barSlotHeight - 24px)
            const ratio = item.comparison.current / effectiveMax;
            const availableFillHeight = Math.max(barSlotHeight - 26, 40);
            const barFillHeight = Math.max(Math.min(ratio * availableFillHeight, availableFillHeight), 14);

            // First Character Label
            const firstChar = item.title.trim().charAt(0).toUpperCase() || `${idx + 1}`;

            return (
              <Pressable
                key={item.id}
                onPress={() => handleBarPress(item)}
                onLongPress={() => handleBarLongPress(item)}
                onHoverIn={() => setHoveredId(item.id)}
                onHoverOut={() => setHoveredId(null)}
                style={[
                  styles.barColumn,
                  isSelected && styles.barColumnSelected,
                ]}
                accessibilityLabel={`${item.title}: ${formatLitres(item.comparison.current)}`}
              >
                {/* Floating Tooltip Bubble when active */}
                {isSelected && (
                  <View style={[styles.floatingMiniBadge, { backgroundColor: colors.text }]}>
                    <Text style={styles.floatingMiniBadgeText} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                )}

                {/* Vertical Bar Slot: Volume Number sits DIRECTLY on top of the filled bar */}
                <View style={[styles.verticalBarSlot, { height: barSlotHeight }]}>
                  <View style={[styles.barAndLabelContainer, { height: barFillHeight + 20 }]}>
                    {/* Aligned Volume Text directly over the bar top */}
                    <Text
                      style={[
                        styles.barTopVolumeText,
                        { color: isSelected ? colors.primary : colors.textSecondary },
                        isSelected && { fontWeight: '900' },
                      ]}
                      numberOfLines={1}
                    >
                      {formatLitres(item.comparison.current).replace(' L', 'L')}
                    </Text>

                    {/* Filled Bar */}
                    <View
                      style={[
                        styles.verticalBarFill,
                        {
                          height: barFillHeight,
                          backgroundColor: isSelected ? colors.primary : colors.primaryLight,
                          borderColor: isSelected ? colors.primaryDark : colors.primary,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                    >
                      <View style={styles.barGlossHighlight} />
                    </View>
                  </View>
                </View>

                {/* X-Axis: Perfectly Centered First-Character Avatar */}
                <View
                  style={[
                    styles.firstCharBadge,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.firstCharText,
                      { color: isSelected ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {firstChar}
                  </Text>
                </View>

                {/* Rank Tag below First Character */}
                <Text style={[styles.rankSubText, { color: isSelected ? colors.primary : colors.textMuted }]}>
                  #{item.rank || idx + 1}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    overflow: 'visible',
  },
  inspectorCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  inspectorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inspectorTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  rankPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  rankPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inspectorMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  volumeBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
    minWidth: 0,
  },
  inspectorRightMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  openBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  chartLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chartAreaWrapper: {
    flexDirection: 'row',
    position: 'relative',
    alignItems: 'flex-start',
  },
  yAxisRail: {
    width: 48,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    zIndex: 2,
  },
  yAxisLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
  },
  scrollableBarsContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 24,
    minWidth: '100%',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.3,
    zIndex: 1,
  },
  barColumn: {
    width: 64,
    alignItems: 'center',
    marginHorizontal: 4,
    position: 'relative',
    zIndex: 3,
  },
  barColumnSelected: {
    transform: [{ scale: 1.03 }],
  },
  floatingMiniBadge: {
    position: 'absolute',
    top: -24,
    zIndex: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingMiniBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  verticalBarSlot: {
    width: 44,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barAndLabelContainer: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barTopVolumeText: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  verticalBarFill: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  barGlossHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  firstCharBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  firstCharText: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 16,
  },
  rankSubText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
});
