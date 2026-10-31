import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, BackHandler, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { UnionDesktopBmcMonitoring } from '../../components/union/desktop/UnionDesktopBmcMonitoring';
import { 
  AnalyticsPeriod, 
  PERIOD_LABELS, 
  formatLitres, 
  getDistrictBmcAnalytics 
} from '../../services/bmcAnalyticsService';
import { VerticalComparisonBarChart } from '../../components/analytics/VerticalComparisonBarChart';
import { useIsDesktop } from '../../hooks/useIsDesktop';

export default function BMCMonitoringScreen() {
  const { bmcs, booths, bmcReceipts, discrepancyCases, bmcDeliveries } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const handleBackToHome = () => {
    router.replace('/(union)' as any);
  };

  // Ensure Android hardware back button also returns to Union Home
  useEffect(() => {
    const onBackPress = () => {
      handleBackToHome();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  const [comparisonPeriod, setComparisonPeriod] = useState<AnalyticsPeriod>('daily');

  const analyticsData = getDistrictBmcAnalytics(bmcs, booths, bmcDeliveries);
  const sortedBmcs = [...analyticsData].sort(
    (a, b) => b.metrics[comparisonPeriod].current - a.metrics[comparisonPeriod].current
  );
  const maxBmcVolume = sortedBmcs.length > 0 ? sortedBmcs[0].metrics[comparisonPeriod].current : 1;

  const periods: AnalyticsPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* 1. District BMC Production Comparison */}
      <Card style={[styles.comparisonCard, { borderColor: colors.border }]}>
        <View style={styles.bannerHeaderRow}>
          <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
            <Text style={[Typography.title2, { color: colors.text, fontWeight: '900' }]}>
              District Production Comparison
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
              Ranked milk volume comparison. Tap any BMC for society breakdown.
            </Text>
          </View>
          <View style={[styles.statsBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="bar-chart" size={18} color={colors.primary} />
          </View>
        </View>

        {/* Period Selector Tabs */}
        <View style={[styles.periodTabsRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {periods.map((periodKey) => {
            const isActive = comparisonPeriod === periodKey;
            return (
              <Pressable
                key={periodKey}
                onPress={() => setComparisonPeriod(periodKey)}
                style={[
                  styles.periodTabBtn,
                  isActive && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.periodTabBtnText,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {PERIOD_LABELS[periodKey].title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Vertical Comparison Bar Chart */}
        <VerticalComparisonBarChart
          items={sortedBmcs.map((bmcItem, idx) => ({
            id: bmcItem.bmcId,
            rank: idx + 1,
            title: bmcItem.bmcName,
            code: bmcItem.code,
            subtitle: `In-Charge: ${bmcItem.managerName} • ${bmcItem.location}`,
            comparison: bmcItem.metrics[comparisonPeriod],
            onPress: () => router.push({ pathname: '/(union)/bmc-analytics' as any, params: { bmcId: bmcItem.bmcId } }),
          }))}
          maxVolume={maxBmcVolume}
        />
      </Card>

      {/* Facilities Section Header */}
      <View style={styles.sectionDividerRow}>
        <Ionicons name="snow" size={18} color={colors.primary} />
        <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
          BMC Facility Infrastructure ({bmcs.length})
        </Text>
      </View>
    </View>
  );

  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <DemoHeader 
          title="BMC Facility Monitoring"
          subtitle="District Bulk Milk Cooling Infrastructure"
          showBack
          onBack={handleBackToHome}
        />
        <UnionDesktopBmcMonitoring />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="BMC Facility Monitoring"
        subtitle="District Bulk Milk Cooling Infrastructure"
        showBack
        onBack={handleBackToHome}
      />

      <FlatList
        data={bmcs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => {
          const bmcBooths = booths.filter(b => b.assignedBmcId === item.id);
          const deliveries = bmcDeliveries.filter(d => d.bmcId === item.id);
          const totalReceived = deliveries.reduce((sum, d) => sum + (d.measuredReceivedQuantity || 0), 0);
          const latestReceipt = bmcReceipts.find(r => r.bmcId === item.id);
          const openCases = discrepancyCases.filter(c => c.bmcId === item.id && (c.status === 'open' || c.status === 'under_investigation'));

          const utilization = Math.min((totalReceived / item.capacityLitres) * 100, 100);

          return (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconFrame, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="snow" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>
                    {item.name?.replace(/cooling booth/gi, 'Bulk Milk Cooling Centre').replace(/booth/gi, 'Society')}
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                    Code: {item.code} • {item.location} • In-Charge: {item.managerName}
                  </Text>
                </View>
              </View>

              {/* Capacity Bar */}
              <View style={styles.capacitySection}>
                <View style={styles.capLabelRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}>
                    Daily Cooling Load: {totalReceived.toFixed(1)} L / {item.capacityLitres.toLocaleString()} L
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', flexShrink: 0 }]}>
                    {utilization.toFixed(1)}% Capacity
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${utilization}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>

              {/* Feeder Societies Table */}
              <View style={[styles.boothSection, { borderTopColor: colors.border }]}>
                <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800', marginBottom: 8 }]}>
                  Feeder Societies ({bmcBooths.length})
                </Text>
                {bmcBooths.length === 0 ? (
                  <Text style={[Typography.caption2, { color: colors.textMuted, fontStyle: 'italic' }]}>
                    No linked feeder societies
                  </Text>
                ) : (
                  <View style={styles.boothList}>
                    {bmcBooths.map((b) => (
                      <Pressable
                        key={b.id}
                        style={[styles.boothItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() =>
                          router.push({
                            pathname: '/(union)/society-analytics' as any,
                            params: { societyId: b.id, bmcId: item.id },
                          })
                        }
                      >
                        <View style={styles.boothTopRow}>
                          <Text
                            style={[Typography.subhead, { color: colors.text, fontWeight: '700', flex: 1, minWidth: 0, marginRight: 8 }]}
                          >
                            • {b.name?.replace(/cooling booth/gi, 'Milk Collection Society').replace(/collection booth/gi, 'Milk Collection Society').replace(/booth/gi, 'Society')}
                          </Text>
                          <View style={[styles.codeBadge, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.codeBadgeText, { color: colors.primary }]}>
                              {b.code}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                        </View>
                        <View style={styles.boothMetaRow}>
                          <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
                          <Text style={[Typography.caption2, { color: colors.textSecondary, flex: 1, minWidth: 0, marginLeft: 4 }]}>
                            In-Charge: {b.operatorName} {b.phone ? `• ${b.phone}` : ''}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Status Footer */}
              <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
                <View style={[styles.statusPill, { backgroundColor: openCases.length > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                  <Text style={[styles.statusPillText, { color: openCases.length > 0 ? '#DC2626' : '#15803D' }]}>
                    {openCases.length > 0 ? `${openCases.length} Discrepancies Open` : 'Balanced'}
                  </Text>
                </View>

                <View style={styles.footerActions}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/(union)/bmc-analytics' as any, params: { bmcId: item.id } })}
                    style={[styles.analyticsLinkBtn, { backgroundColor: colors.primaryLight }]}
                  >
                    <Ionicons name="stats-chart" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
                      Analytics
                    </Text>
                  </Pressable>

                  <Pressable onPress={() => router.push('/(union)/receipt-review' as any)} hitSlop={8}>
                    <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                      Receipts →
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  capacitySection: {
    marginBottom: 12,
  },
  capLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  barTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  boothSection: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  boothList: {
    gap: 8,
  },
  boothItem: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  boothTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  codeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  boothMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyticsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  headerSection: {
    marginBottom: 10,
  },
  comparisonCard: {
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statsBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  periodTabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  },
  periodTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  periodTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  barsList: {
    gap: 2,
  },
  sectionDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
});
