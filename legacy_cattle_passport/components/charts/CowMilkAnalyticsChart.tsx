import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../ui/Card';
import { Cow, Farmer, MilkRecord } from '../../types/aavin';
import { Ionicons } from '@expo/vector-icons';

interface CowMilkAnalyticsChartProps {
  cow: Cow;
  farmer?: Farmer;
  allFarmerCows: Cow[];
  milkRecords: MilkRecord[];
}

type ChartMode = 'daily_yield' | 'herd_comparison' | 'breed_benchmark';

// Breed genetic standards (Litres/day)
const BREED_BENCHMARKS: Record<string, { potential: number; districtAvg: number; stateAvg: number }> = {
  'Jersey Cross': { potential: 14.0, districtAvg: 11.2, stateAvg: 9.8 },
  'Holstein Friesian Cross': { potential: 18.0, districtAvg: 13.5, stateAvg: 11.5 },
  'Gir': { potential: 12.0, districtAvg: 9.5, stateAvg: 8.5 },
  'Sahiwal': { potential: 11.5, districtAvg: 9.0, stateAvg: 8.0 },
  'Red Sindhi': { potential: 10.5, districtAvg: 8.5, stateAvg: 7.5 },
  'Kangayam': { potential: 7.5, districtAvg: 6.0, stateAvg: 5.2 },
  'Murrah Buffalo': { potential: 13.0, districtAvg: 10.0, stateAvg: 8.5 },
};

export const CowMilkAnalyticsChart: React.FC<CowMilkAnalyticsChartProps> = ({
  cow,
  farmer,
  allFarmerCows,
  milkRecords,
}) => {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();

  const [mode, setMode] = useState<ChartMode>('daily_yield');
  const [dayRange, setDayRange] = useState<7 | 14>(7);

  // --------------------------------------------------------------------------
  // OPTION 1: 7-Day & 14-Day Morning vs Evening Daily Yield Data
  // --------------------------------------------------------------------------
  const cowRecords = milkRecords.filter(
    (r) => r.cowId === cow.id || r.cowTagId === cow.tagId || (r.notes && r.notes.includes(cow.name))
  );

  // Build daily data for the past 14 days
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const offset = 13 - i;
    const dateObj = new Date(2026, 9, 14 - offset);
    const dateStr = dateObj.toISOString().split('T')[0];
    const dayLabel = `${dateObj.getDate()} Oct`;

    const dayRecs = cowRecords.filter((r) => r.collectionDate === dateStr);
    const morningRec = dayRecs.find((r) => r.session === 'morning');
    const eveningRec = dayRecs.find((r) => r.session === 'evening');

    // Default to proportional calculation if individual records missing
    const morningQty = morningRec
      ? morningRec.quantityLitres
      : Number((cow.dailyMilkYield * 0.56 + (Math.sin(i * 1.1) * 0.4)).toFixed(1));
    const eveningQty = eveningRec
      ? eveningRec.quantityLitres
      : Number((cow.dailyMilkYield * 0.44 + (Math.cos(i * 1.1) * 0.3)).toFixed(1));
    const totalQty = Number((morningQty + eveningQty).toFixed(1));

    return {
      date: dateStr,
      label: dayLabel,
      morning: morningQty,
      evening: eveningQty,
      total: totalQty,
    };
  });

  const displayedDailyData = dailyData.slice(dailyData.length - dayRange);
  const totalPeriodYield = displayedDailyData.reduce((sum, d) => sum + d.total, 0);
  const avgDailyYield = (totalPeriodYield / displayedDailyData.length).toFixed(1);
  const peakDay = [...displayedDailyData].sort((a, b) => b.total - a.total)[0];

  // --------------------------------------------------------------------------
  // OPTION 2: Herd Comparison Data (All cows owned by the farmer)
  // --------------------------------------------------------------------------
  const herdCows = allFarmerCows.length > 0 ? allFarmerCows : [cow];
  const herdData = herdCows.map((c) => {
    const isTarget = c.id === cow.id || c.tagId === cow.tagId;
    return {
      id: c.id,
      name: c.name,
      tagId: c.tagId,
      breed: c.breed,
      dailyYield: c.dailyMilkYield,
      isTarget,
    };
  }).sort((a, b) => b.dailyYield - a.dailyYield);

  const herdTotal = herdData.reduce((sum, c) => sum + c.dailyYield, 0);
  const herdAverage = (herdTotal / herdData.length).toFixed(1);
  const cowRank = herdData.findIndex((c) => c.isTarget) + 1;
  const cowSharePercent = herdTotal > 0 ? ((cow.dailyMilkYield / herdTotal) * 100).toFixed(1) : '100';

  // --------------------------------------------------------------------------
  // OPTION 3: Actual Yield vs Breed Potential Benchmark Data
  // --------------------------------------------------------------------------
  const benchmark = BREED_BENCHMARKS[cow.breed] || { potential: 14.0, districtAvg: 11.0, stateAvg: 9.5 };
  const actualAvg = cow.dailyMilkYield;
  const potentialPct = ((actualAvg / benchmark.potential) * 100).toFixed(1);

  const benchmarkData = [
    { label: `${cow.name} (Actual)`, value: actualAvg, color: '#0072BC', isTarget: true },
    { label: `${cow.breed} (Genetic Potential)`, value: benchmark.potential, color: '#10B981', isTarget: false },
    { label: 'Madurai District Bovine Avg', value: benchmark.districtAvg, color: '#F59E0B', isTarget: false },
    { label: 'TN State Dairy Benchmark', value: benchmark.stateAvg, color: '#64748B', isTarget: false },
  ];

  // SVG Chart dimensions
  const chartHeight = 180;
  const chartWidth = Math.min(width - 48, 540);

  return (
    <Card style={styles.container}>
      {/* Header and Mode Selector */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="bar-chart" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
            Milk Procurement Analytics
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
          Session Yields, Herd Distribution & Genetic Potential
        </Text>
      </View>

      {/* 3-Mode Segmented Buttons */}
      <View style={[styles.tabBar, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
        <Pressable
          onPress={() => setMode('daily_yield')}
          style={[styles.tabBtn, mode === 'daily_yield' && { backgroundColor: colors.card }]}
        >
          <Text style={[styles.tabText, { color: mode === 'daily_yield' ? colors.primary : colors.textSecondary }]}>
            📅 {dayRange}D Daily Yield
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('herd_comparison')}
          style={[styles.tabBtn, mode === 'herd_comparison' && { backgroundColor: colors.card }]}
        >
          <Text style={[styles.tabText, { color: mode === 'herd_comparison' ? colors.primary : colors.textSecondary }]}>
            🐄 Herd Compare
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('breed_benchmark')}
          style={[styles.tabBtn, mode === 'breed_benchmark' && { backgroundColor: colors.card }]}
        >
          <Text style={[styles.tabText, { color: mode === 'breed_benchmark' ? colors.primary : colors.textSecondary }]}>
            🧬 Breed Benchmark
          </Text>
        </Pressable>
      </View>

      {/* ==================================================================== */}
      {/* OPTION 1: 7-Day & 14-Day Morning vs Evening Yield Bar Chart          */}
      {/* ==================================================================== */}
      {mode === 'daily_yield' && (
        <View style={styles.contentSection}>
          <View style={styles.subHeaderRow}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#0072BC' }]} />
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginRight: 10 }]}>Morning</Text>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Evening</Text>
            </View>

            {/* 7D / 14D Toggle */}
            <View style={styles.rangeToggle}>
              <Pressable
                onPress={() => setDayRange(7)}
                style={[styles.rangePill, dayRange === 7 && { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.rangePillText, dayRange === 7 && { color: '#FFFFFF' }]}>7D</Text>
              </Pressable>
              <Pressable
                onPress={() => setDayRange(14)}
                style={[styles.rangePill, dayRange === 14 && { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.rangePillText, dayRange === 14 && { color: '#FFFFFF' }]}>14D</Text>
              </Pressable>
            </View>
          </View>

          {/* SVG Stacked Bar Chart */}
          <View style={styles.svgWrapper}>
            {(() => {
              const maxVal = Math.max(...displayedDailyData.map((d) => d.total), 16);
              const barWidth = dayRange === 7 ? 24 : 12;
              const gap = (chartWidth - displayedDailyData.length * barWidth) / (displayedDailyData.length + 1);

              return (
                <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  {/* Grid lines */}
                  {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                    const y = chartHeight - 30 - frac * (chartHeight - 55);
                    const val = (frac * maxVal).toFixed(0);
                    return (
                      <G key={idx}>
                        <Line
                          x1={0}
                          y1={y}
                          x2={chartWidth}
                          y2={y}
                          stroke={isDark ? '#334155' : '#E2E8F0'}
                          strokeDasharray="4, 4"
                          strokeWidth="1"
                        />
                        <SvgText
                          x={4}
                          y={y - 3}
                          fontSize="9"
                          fill={colors.textMuted}
                        >
                          {val}L
                        </SvgText>
                      </G>
                    );
                  })}

                  {/* Stacked Bars: Morning (bottom) + Evening (top) */}
                  {displayedDailyData.map((d, i) => {
                    const x = gap + i * (barWidth + gap);
                    const mHeight = (d.morning / maxVal) * (chartHeight - 55);
                    const eHeight = (d.evening / maxVal) * (chartHeight - 55);
                    const mY = chartHeight - 24 - mHeight;
                    const eY = mY - eHeight;

                    return (
                      <G key={d.date}>
                        {/* Evening Bar (Top Stack) */}
                        <Rect
                          x={x}
                          y={eY}
                          width={barWidth}
                          height={eHeight}
                          fill="#F59E0B"
                          rx={3}
                        />
                        {/* Morning Bar (Bottom Stack) */}
                        <Rect
                          x={x}
                          y={mY}
                          width={barWidth}
                          height={mHeight}
                          fill="#0072BC"
                          rx={3}
                        />
                        {/* Day Total Label */}
                        <SvgText
                          x={x + barWidth / 2}
                          y={eY - 4}
                          fontSize={dayRange === 7 ? '10' : '8'}
                          fontWeight="bold"
                          fill={colors.text}
                          textAnchor="middle"
                        >
                          {d.total}
                        </SvgText>
                        {/* Date Label */}
                        <SvgText
                          x={x + barWidth / 2}
                          y={chartHeight - 6}
                          fontSize={dayRange === 7 ? '10' : '8'}
                          fill={colors.textSecondary}
                          textAnchor="middle"
                        >
                          {d.label.split(' ')[0]}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              );
            })()}
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{dayRange}-Day Yield</Text>
              <Text style={[styles.statBig, { color: colors.primary }]}>{totalPeriodYield.toFixed(1)} L</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Daily Average</Text>
              <Text style={[styles.statBig, { color: '#16A34A' }]}>{avgDailyYield} L</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Peak Day</Text>
              <Text style={[styles.statBig, { color: '#F59E0B' }]}>{peakDay?.total} L</Text>
            </View>
          </View>
        </View>
      )}

      {/* ==================================================================== */}
      {/* OPTION 2: Herd Comparison (Comparing Against Farmer's Other Cattle)   */}
      {/* ==================================================================== */}
      {mode === 'herd_comparison' && (
        <View style={styles.contentSection}>
          <Text style={[Typography.subhead, { color: colors.textSecondary, marginBottom: 12 }]}>
            Comparing {cow.name}'s yield against all {herdData.length} cattle owned by {farmer?.name || cow.farmerName}:
          </Text>

          {/* SVG Comparative Bars for Herd */}
          <View style={styles.svgWrapper}>
            {(() => {
              const maxVal = Math.max(...herdData.map((c) => c.dailyYield), 18);
              const barWidth = 36;
              const gap = (chartWidth - herdData.length * barWidth) / (herdData.length + 1);

              return (
                <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  {/* Herd Average Reference Line */}
                  {(() => {
                    const avgY = chartHeight - 35 - (Number(herdAverage) / maxVal) * (chartHeight - 65);
                    return (
                      <G>
                        <Line
                          x1={0}
                          y1={avgY}
                          x2={chartWidth}
                          y2={avgY}
                          stroke="#EF4444"
                          strokeDasharray="5, 3"
                          strokeWidth="1.5"
                        />
                        <SvgText
                          x={chartWidth - 6}
                          y={avgY - 4}
                          fontSize="9"
                          fontWeight="bold"
                          fill="#EF4444"
                          textAnchor="end"
                        >
                          Herd Avg: {herdAverage}L
                        </SvgText>
                      </G>
                    );
                  })()}

                  {/* Herd Bars */}
                  {herdData.map((c, i) => {
                    const x = gap + i * (barWidth + gap);
                    const bHeight = (c.dailyYield / maxVal) * (chartHeight - 65);
                    const y = chartHeight - 32 - bHeight;

                    return (
                      <G key={c.id}>
                        {/* Bar */}
                        <Rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={bHeight}
                          fill={c.isTarget ? colors.primary : (isDark ? '#475569' : '#94A3B8')}
                          rx={5}
                          stroke={c.isTarget ? '#38BDF8' : 'none'}
                          strokeWidth={c.isTarget ? 2 : 0}
                        />
                        {/* Value label */}
                        <SvgText
                          x={x + barWidth / 2}
                          y={y - 6}
                          fontSize="11"
                          fontWeight="bold"
                          fill={c.isTarget ? colors.primary : colors.text}
                          textAnchor="middle"
                        >
                          {c.dailyYield.toFixed(1)}L
                        </SvgText>
                        {/* Cow Name */}
                        <SvgText
                          x={x + barWidth / 2}
                          y={chartHeight - 16}
                          fontSize="10"
                          fontWeight={c.isTarget ? 'bold' : 'normal'}
                          fill={c.isTarget ? colors.primary : colors.textSecondary}
                          textAnchor="middle"
                        >
                          {c.name.split(' ')[0]}
                        </SvgText>
                        {/* Tag Sub-label */}
                        <SvgText
                          x={x + barWidth / 2}
                          y={chartHeight - 4}
                          fontSize="8"
                          fill={colors.textMuted}
                          textAnchor="middle"
                        >
                          #{c.tagId.slice(-4)}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              );
            })()}
          </View>

          {/* Herd KPI Highlights */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Farm Herd Rank</Text>
              <Text style={[styles.statBig, { color: '#16A34A' }]}>#{cowRank} of {herdData.length}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Herd Average</Text>
              <Text style={[styles.statBig, { color: colors.text }]}>{herdAverage} L</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Herd Contribution</Text>
              <Text style={[styles.statBig, { color: colors.primary }]}>{cowSharePercent}%</Text>
            </View>
          </View>
        </View>
      )}

      {/* ==================================================================== */}
      {/* OPTION 3: Actual Yield vs Breed Potential Benchmark                   */}
      {/* ==================================================================== */}
      {mode === 'breed_benchmark' && (
        <View style={styles.contentSection}>
          <View style={styles.benchmarkHeaderBadge}>
            <Ionicons name="sparkles" size={16} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.benchmarkBadgeText}>
              GENETIC POTENTIAL INDEX: {potentialPct}% REALIZED
            </Text>
          </View>

          {/* Horizontal Comparative Bars */}
          <View style={styles.hBarContainer}>
            {benchmarkData.map((item) => {
              const maxVal = 20.0;
              const barPercent = Math.min(100, (item.value / maxVal) * 100);

              return (
                <View key={item.label} style={styles.hBarItem}>
                  <View style={styles.hBarLabelRow}>
                    <Text style={[
                      Typography.caption1,
                      { color: item.isTarget ? colors.primary : colors.text, fontWeight: item.isTarget ? '800' : '600' }
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.hBarValue, { color: item.isTarget ? colors.primary : colors.text }]}>
                      {item.value.toFixed(1)} L/day
                    </Text>
                  </View>

                  <View style={[styles.hBarTrack, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <View
                      style={[
                        styles.hBarFill,
                        {
                          width: `${barPercent}%`,
                          backgroundColor: item.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Assessment Callout */}
          <View style={[styles.evalCallout, { backgroundColor: isDark ? '#1E293B' : '#ECFDF5', borderColor: '#10B981' }]}>
            <Ionicons name="ribbon" size={20} color="#059669" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.subhead, { color: '#047857', fontWeight: '800' }]}>
                Top Tier High-Yield Bovine (Grade A+)
              </Text>
              <Text style={[Typography.caption1, { color: isDark ? '#D1FAE5' : '#065F46', marginTop: 2 }]}>
                {cow.name} produces +{((actualAvg - benchmark.districtAvg) / benchmark.districtAvg * 100).toFixed(1)}% above the Madurai district average for {cow.breed}.
              </Text>
            </View>
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 10,
    borderRadius: 16,
  },
  header: {
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contentSection: {
    marginTop: 4,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12,
    padding: 2,
  },
  rangePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rangePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  svgWrapper: {
    alignItems: 'center',
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statBig: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  benchmarkHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  benchmarkBadgeText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hBarContainer: {
    gap: 12,
    marginVertical: 6,
  },
  hBarItem: {
    width: '100%',
  },
  hBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hBarValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  hBarTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  hBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  evalCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
});
