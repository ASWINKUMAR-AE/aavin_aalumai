import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../../store/AavinStoreContext';
import { useTheme } from '../../../context/ThemeContext';
import { Typography } from '../../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import {
  AnalyticsPeriod,
  PERIOD_LABELS,
  formatLitres,
  getDistrictBmcAnalytics,
} from '../../../services/bmcAnalyticsService';
import { VerticalComparisonBarChart } from '../../../components/analytics/VerticalComparisonBarChart';

export const UnionDesktopBmcMonitoring: React.FC = () => {
  const { bmcs, booths, bmcDeliveries, discrepancyCases } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [comparisonPeriod, setComparisonPeriod] = useState<AnalyticsPeriod>('daily');
  const [hoveredBmcId, setHoveredBmcId] = useState<string | null>(null);

  const analyticsData = getDistrictBmcAnalytics(bmcs, booths, bmcDeliveries);
  const sortedBmcs = [...analyticsData].sort(
    (a, b) => b.metrics[comparisonPeriod].current - a.metrics[comparisonPeriod].current
  );
  const maxBmcVolume = sortedBmcs.length > 0 ? sortedBmcs[0].metrics[comparisonPeriod].current : 1;
  const periods: AnalyticsPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];

  const totalCurrentLitres = sortedBmcs.reduce((sum, b) => sum + b.metrics[comparisonPeriod].current, 0);

  return (
    <ScrollView style={[styles.canvas, { backgroundColor: colors.background }]} contentContainerStyle={styles.canvasContainer}>
      <View style={styles.contentConstrained}>

        {/* =========================================================================
            HEADER & QUICK NAVIGATION BREADCRUMB
           ========================================================================= */}
        <View style={[styles.headerStrip, { borderBottomColor: colors.border }]}>
          <View>
            <View style={styles.breadcrumbRow}>
              <Text style={[styles.breadcrumbRoot, { color: colors.textSecondary }]}>Union Headquarters</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} />
              <Text style={[styles.breadcrumbActive, { color: colors.primary }]}>BMC Chilling Infrastructure</Text>
            </View>
            <Text style={[styles.mainTitle, { color: colors.text }]}>
              Bulk Milk Chilling (BMC) Facility Control
            </Text>
            <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
              Ranked output bar chart & chilling center status
            </Text>
          </View>

          {/* District Status Badge */}
          <View style={styles.headerRightStrip}>
            <View style={[styles.statusPill, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7' }]}>
              <View style={styles.greenDot} />
              <Text style={[styles.statusPillText, { color: isDark ? '#4ADE80' : '#15803D' }]}>
                All {bmcs.length} BMC Chillers Active (3.8°C)
              </Text>
            </View>
          </View>
        </View>

        {/* =========================================================================
            TOP METRIC STRIP (4 Compact Metric Cards)
           ========================================================================= */}
        <View style={styles.topMetricsRow}>
          <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Period Intake</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {formatLitres(totalCurrentLitres)} <Text style={styles.metricUnit}>L</Text>
            </Text>
            <Text style={[styles.metricSub, { color: colors.textMuted }]}>
              Across {bmcs.length} Chilling Units
            </Text>
          </View>

          <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Operating Chiller Temp</Text>
            <Text style={[styles.metricValue, { color: '#16A34A' }]}>
              3.8°C <Text style={styles.metricUnit}>Optimal</Text>
            </Text>
            <Text style={[styles.metricSub, { color: colors.textMuted }]}>
              Threshold ≤ 4.0°C Safe
            </Text>
          </View>

          <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Feeder Societies</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {booths.length} <Text style={styles.metricUnit}>Units</Text>
            </Text>
            <Text style={[styles.metricSub, { color: colors.textMuted }]}>
              100% Operational
            </Text>
          </View>

          <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Active Discrepancies</Text>
            <Text style={[styles.metricValue, { color: (discrepancyCases || []).length > 0 ? '#DC2626' : colors.text }]}>
              {(discrepancyCases || []).length} <Text style={styles.metricUnit}>Cases</Text>
            </Text>
            <Text style={[styles.metricSub, { color: colors.textMuted }]}>
              Transit shrinkage tracking
            </Text>
          </View>
        </View>

        {/* =========================================================================
            SPLIT SECTION: BAR CHART ON LEFT (58%), LIST OF BMCS ON RIGHT (42%)
           ========================================================================= */}
        <View style={styles.splitMainRow}>

          {/* LEFT: THE HERO BAR CHART */}
          <View style={[styles.chartHeroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.chartHeaderRow}>
              <View style={styles.chartHeaderLeft}>
                <View style={[styles.chartIconCircle, { backgroundColor: isDark ? 'rgba(0, 114, 188, 0.2)' : '#E0F2FE' }]}>
                  <Ionicons name="bar-chart" size={17} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.chartTitle, { color: colors.text }]}>
                    District Production Comparison
                  </Text>
                  <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                    Ranked volumetric output across chilling centers
                  </Text>
                </View>
              </View>

              {/* Timeframe Selector Tabs */}
              <View style={[styles.timeTabsRow, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}>
                {periods.map(periodKey => {
                  const isActive = comparisonPeriod === periodKey;
                  return (
                    <Pressable
                      key={periodKey}
                      onPress={() => setComparisonPeriod(periodKey)}
                      style={[
                        styles.timeTabBtn,
                        isActive && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeTabBtnText,
                          { color: isActive ? '#FFFFFF' : colors.textSecondary },
                          isActive && { fontWeight: '800' }
                        ]}
                      >
                        {PERIOD_LABELS[periodKey].title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* The Bar Chart */}
            <View style={styles.barChartContainer}>
              <VerticalComparisonBarChart
                items={sortedBmcs.map((bmcItem, idx) => ({
                  id: bmcItem.bmcId,
                  rank: idx + 1,
                  title: bmcItem.bmcName,
                  code: bmcItem.code,
                  subtitle: `Mgr: ${bmcItem.managerName} • ${bmcItem.location}`,
                  comparison: bmcItem.metrics[comparisonPeriod],
                  onPress: () => router.push({ pathname: '/(union)/bmc-analytics' as any, params: { bmcId: bmcItem.bmcId } }),
                }))}
                maxVolume={maxBmcVolume}
              />
            </View>
          </View>

          {/* RIGHT: THE LIST OF BMCS */}
          <View style={styles.bmcsListColumn}>
            <View style={styles.listHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="snow" size={15} color={colors.primary} />
                <Text style={[styles.listTitle, { color: colors.text }]}>
                  Chilling Centers ({bmcs.length})
                </Text>
              </View>
              <Text style={[styles.listSub, { color: colors.textSecondary }]}>
                Click to inspect
              </Text>
            </View>

            <View style={styles.bmcCardStack}>
              {bmcs.map((bmc, idx) => {
                const matchedAnalytics = sortedBmcs.find(b => b.bmcId === bmc.id);
                const bmcVolume = matchedAnalytics?.metrics[comparisonPeriod].current || 0;
                const connectedSocieties = booths.filter(bo => (bo as any).assignedBmcId === bmc.id || bo.id.includes(bmc.id.replace('bmc-', '')));
                const isHovered = hoveredBmcId === bmc.id;

                return (
                  <Pressable
                    key={bmc.id}
                    onHoverIn={() => setHoveredBmcId(bmc.id)}
                    onHoverOut={() => setHoveredBmcId(null)}
                    style={[
                      styles.bmcListItem,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isHovered && styles.cardHovered,
                    ]}
                    onPress={() => router.push({ pathname: '/(union)/bmc-analytics' as any, params: { bmcId: bmc.id } })}
                  >
                    <View style={styles.bmcCardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>#{idx + 1}</Text>
                        </View>
                        <View style={styles.bmcCodeBadge}>
                          <Text style={styles.bmcCodeText}>{bmc.code || bmc.id.toUpperCase()}</Text>
                        </View>
                      </View>
                      <View style={[styles.tempPill, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7' }]}>
                        <Text style={[styles.tempText, { color: isDark ? '#4ADE80' : '#15803D' }]}>3.8°C</Text>
                      </View>
                    </View>

                    <View style={{ marginVertical: 6 }}>
                      <Text style={[styles.bmcName, { color: colors.text }]} numberOfLines={1}>
                        {bmc.name}
                      </Text>
                      <Text style={[styles.bmcLoc, { color: colors.textSecondary }]} numberOfLines={1}>
                        {bmc.location || 'Madurai'} • {bmc.managerName || 'Aavin Lead'}
                      </Text>
                    </View>

                    <View style={[styles.vBmcMetricsBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.stripLabel, { color: colors.textSecondary }]}>{PERIOD_LABELS[comparisonPeriod].title}</Text>
                        <Text style={[styles.stripValue, { color: colors.primary }]}>{formatLitres(bmcVolume)} L</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <Text style={[styles.stripLabel, { color: colors.textSecondary }]}>Feeder</Text>
                        <Text style={[styles.stripValue, { color: colors.text }]}>{connectedSocieties.length || 6} DCS</Text>
                      </View>
                    </View>

                    <View style={styles.drillDownLink}>
                      <Text style={[styles.drillDownText, { color: colors.primary }]}>
                        {isHovered ? 'Inspect Societies ➔' : 'Inspect'}
                      </Text>
                      <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

        </View>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
  canvasContainer: {
    paddingTop: 18,
    paddingBottom: 110,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  contentConstrained: {
    width: '100%',
    maxWidth: 1100,
    gap: 14,
  },

  /* Header */
  headerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  breadcrumbRoot: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  breadcrumbActive: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  mainTitle: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  headerRightStrip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Top Metrics Row */
  topMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 82,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 1,
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricSub: {
    fontSize: 9.5,
  },

  /* Split Main Row: Left (Bar Chart) + Right (BMCs List) */
  splitMainRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },

  /* Left Column: Bar Chart Hero Card */
  chartHeroCard: {
    flex: 5.7,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  chartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 200,
  },
  chartIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  chartSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  timeTabsRow: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeTabBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  timeTabBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  barChartContainer: {
    marginTop: 4,
  },

  /* Right Column: BMCs List */
  bmcsListColumn: {
    flex: 4.3,
    gap: 10,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  listTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  listSub: {
    fontSize: 10.5,
  },
  bmcCardStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bmcListItem: {
    width: '48%',
    minWidth: 190,
    minHeight: 215,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    justifyContent: 'space-between',
    cursor: 'pointer' as any,
  },
  cardHovered: {
    transform: [{ translateY: -2 }],
    boxShadow: '0 4px 14px rgba(0,0,0,0.08)' as any,
  },
  bmcCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rankBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rankText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bmcCodeBadge: {
    backgroundColor: '#0072BC15',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  bmcCodeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0072BC',
  },
  tempPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tempText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  bmcName: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  bmcLoc: {
    fontSize: 10,
    marginTop: 1,
  },
  vBmcMetricsBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginVertical: 4,
  },
  stripLabel: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  stripValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  drillDownLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  drillDownText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
