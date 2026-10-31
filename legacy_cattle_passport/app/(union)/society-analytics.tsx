import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { 
  AnalyticsPeriod, 
  PERIOD_LABELS, 
  formatLitres, 
  getSocietyAnalyticsById,
  getFarmersAnalyticsBySocietyId,
} from '../../services/bmcAnalyticsService';
import { VerticalComparisonBarChart } from '../../components/analytics/VerticalComparisonBarChart';
import { useIsDesktop } from '../../hooks/useIsDesktop';

export default function SocietyAnalyticsScreen() {
  const isDesktop = useIsDesktop();
  const { societyId, bmcId } = useLocalSearchParams<{ societyId: string; bmcId?: string }>();
  const { bmcs, booths, bmcDeliveries, farmers, milkRecords, cows, discrepancyCases } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  // Active society fallback
  const activeSocietyId = societyId || booths[0]?.id;
  const societyData = getSocietyAnalyticsById(activeSocietyId, bmcs, booths, bmcDeliveries);

  const fallbackBmcId = bmcId || societyData?.society.assignedBmcId || bmcs[0]?.id;

  const handleBack = () => {
    if (fallbackBmcId) {
      router.replace({
        pathname: '/(union)/bmc-analytics' as any,
        params: { bmcId: fallbackBmcId },
      });
    } else {
      router.replace('/(union)/bmc-monitoring' as any);
    }
  };

  // Hardware Android back button
  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [fallbackBmcId]);

  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('daily');
  const [farmerPeriod, setFarmerPeriod] = useState<AnalyticsPeriod>('daily');

  if (!societyData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <DemoHeader
          title="Society Production Analytics"
          subtitle="Society Not Found"
          showBack
          onBack={handleBack}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[Typography.headline, { color: colors.text, marginTop: 12 }]}>
            Society Facility Not Found
          </Text>
          <Pressable onPress={handleBack} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>← Return to BMC Analytics</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { society, bmc } = societyData;
  const metrics = society.metrics;
  const todayReceived = metrics.daily.current;
  const capacityLitres = society.capacityLitres || 3000;
  const utilization = Math.min((todayReceived / capacityLitres) * 100, 100);

  // Affiliated registered farmers with complete metrics
  const farmerAnalyticsList = getFarmersAnalyticsBySocietyId(
    activeSocietyId,
    farmers,
    cows,
    milkRecords,
    booths,
    bmcs
  );

  const sortedFarmers = [...farmerAnalyticsList].sort(
    (a, b) => b.metrics[farmerPeriod].current - a.metrics[farmerPeriod].current
  );

  const maxFarmerVolume = sortedFarmers.length > 0 ? sortedFarmers[0].metrics[farmerPeriod].current : 1;

  // Society deliveries to BMC
  const societyDeliveries = bmcDeliveries.filter((d) => d.boothId === activeSocietyId);

  // Milk records registered directly at this booth
  const boothMilkRecords = milkRecords.filter((m) => m.boothId === activeSocietyId);
  const morningRecords = boothMilkRecords.filter((m) => m.session === 'morning');
  const eveningRecords = boothMilkRecords.filter((m) => m.session === 'evening');

  const morningVol = morningRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
  const eveningVol = eveningRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
  const totalSessionVol = morningVol + eveningVol;

  const morningPercent = totalSessionVol > 0 ? Math.round((morningVol / totalSessionVol) * 100) : 58;
  const eveningPercent = 100 - morningPercent;

  // Direct farmer vs vendor route volumes
  const directRecords = boothMilkRecords.filter((m) => m.route === 'direct');
  const vendorRecords = boothMilkRecords.filter((m) => m.route === 'vendor');
  const directVol = directRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
  const vendorVol = vendorRecords.reduce((sum, r) => sum + r.quantityLitres, 0);

  // Open discrepancies for this society
  const societyDiscrepancies = discrepancyCases.filter(
    (c) => c.boothId === activeSocietyId && (c.status === 'open' || c.status === 'under_investigation')
  );

  const periods: AnalyticsPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader
        title="Society Production Analytics"
        subtitle={society.societyName}
        showBack
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && styles.desktopScrollContent]} showsVerticalScrollIndicator={false}>
        {/* 1. Facility Header & Intake Load Card */}
        <Card style={styles.facilityCard}>
          <View style={styles.facilityHeaderRow}>
            <View style={[styles.iconFrame, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="business" size={26} color={colors.primary} />
            </View>

            <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
              <View style={styles.codeRow}>
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '900', flex: 1 }]} numberOfLines={1}>
                  {society.societyName}
                </Text>
                <View style={[styles.codePill, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.codePillText, { color: colors.primary }]}>{society.code}</Text>
                </View>
              </View>

              <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                {society.village}, {society.taluk} • In-Charge: {society.operatorName} {society.phone ? `(${society.phone})` : ''}
              </Text>
            </View>
          </View>

          {/* Linked BMC Quick Jump Banner */}
          <Pressable
            style={[styles.linkedBmcBanner, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() =>
              router.replace({
                pathname: '/(union)/bmc-analytics' as any,
                params: { bmcId: society.assignedBmcId },
              })
            }
          >
            <View style={styles.linkedBmcLeft}>
              <Ionicons name="snow" size={16} color={colors.primary} />
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700', marginLeft: 6 }]}>
                Linked BMC: <Text style={{ color: colors.primary, fontWeight: '800' }}>{society.bmcName}</Text>
              </Text>
            </View>
            <View style={styles.linkedBmcRight}>
              <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700', marginRight: 4 }]}>
                View BMC
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </View>
          </Pressable>

          {/* Capacity Progress Track */}
          <View style={styles.capacitySection}>
            <View style={styles.capLabelRow}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Daily Intake Load: {formatLitres(todayReceived)} / {formatLitres(capacityLitres)}
              </Text>
              <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
                {utilization.toFixed(1)}% Capacity
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
              <View style={[styles.barFill, { width: `${utilization}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
        </Card>

        {/* 2. Self-Historical Comparison Cards (Daily, Weekly, Monthly, Yearly) */}
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
            Society Performance Trends
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10, marginTop: -4 }]}>
          Benchmark self-comparison against historical collection periods
        </Text>

        <View style={styles.trendsGrid}>
          {periods.map((periodKey) => {
            const comp = metrics[periodKey];
            const isPos = comp.deltaPercentage >= 0;
            const trendBg = isPos ? '#DCFCE7' : '#FEE2E2';
            const trendColor = isPos ? '#15803D' : '#DC2626';

            return (
              <Card key={periodKey} style={styles.trendCard}>
                <View style={styles.trendCardTop}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, fontWeight: '800', textTransform: 'uppercase' }]}>
                    {PERIOD_LABELS[periodKey].title}
                  </Text>
                  <View style={[styles.trendPill, { backgroundColor: trendBg }]}>
                    <Ionicons
                      name={isPos ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={trendColor}
                      style={{ marginRight: 2 }}
                    />
                    <Text style={[styles.trendPillText, { color: trendColor }]}>
                      {isPos ? `+${comp.deltaPercentage}%` : `${comp.deltaPercentage}%`}
                    </Text>
                  </View>
                </View>

                <Text style={[Typography.title2, { color: colors.text, fontWeight: '900', marginTop: 8 }]}>
                  {formatLitres(comp.current)}
                </Text>
                <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
                  {comp.currentLabel}
                </Text>

                <View style={[styles.compDivider, { borderTopColor: colors.border }]} />

                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  Past: <Text style={{ fontWeight: '700', color: colors.text }}>{formatLitres(comp.previous)}</Text>
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  ({comp.periodLabel})
                </Text>

                <Text style={[Typography.caption2, { color: trendColor, fontWeight: '700', marginTop: 4 }]}>
                  Net: {comp.deltaLitres >= 0 ? `+${formatLitres(comp.deltaLitres)}` : `-${formatLitres(Math.abs(comp.deltaLitres))}`}
                </Text>
              </Card>
            );
          })}
        </View>

        {/* 3. Session & Quality Operational Breakdown */}
        <View style={[styles.sectionHeader, { marginTop: 14 }]}>
          <Ionicons name="git-branch-outline" size={18} color={colors.primary} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
            Session & Quality Breakdown
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10, marginTop: -4 }]}>
          Operational milk intake sessions and laboratory quality metrics
        </Text>

        <Card style={styles.breakdownCard}>
          {/* Morning vs Evening Session Split */}
          <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800', marginBottom: 8 }]}>
            Intake Session Distribution
          </Text>
          <View style={styles.sessionPillsRow}>
            <View style={styles.sessionPill}>
              <Ionicons name="sunny-outline" size={14} color="#D97706" />
              <Text style={[Typography.caption2, { color: colors.text, fontWeight: '700', marginLeft: 4 }]}>
                Morning: {morningPercent}% {totalSessionVol > 0 ? `(${formatLitres(morningVol)})` : ''}
              </Text>
            </View>
            <View style={styles.sessionPill}>
              <Ionicons name="moon-outline" size={14} color="#4F46E5" />
              <Text style={[Typography.caption2, { color: colors.text, fontWeight: '700', marginLeft: 4 }]}>
                Evening: {eveningPercent}% {totalSessionVol > 0 ? `(${formatLitres(eveningVol)})` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.splitTrack}>
            <View style={[styles.splitFillMorning, { width: `${morningPercent}%` }]} />
            <View style={[styles.splitFillEvening, { width: `${eveningPercent}%` }]} />
          </View>

          <View style={[styles.compDivider, { borderTopColor: colors.border, marginVertical: 12 }]} />

          {/* Quality Metrics Grid */}
          <View style={styles.qualityGrid}>
            <View style={[styles.qualityItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Avg Fat %</Text>
              <Text style={[Typography.headline, { color: colors.primary, fontWeight: '900', marginTop: 2 }]}>
                4.25%
              </Text>
              <Text style={[Typography.caption2, { color: '#16A34A', fontWeight: '700' }]}>✓ High Grade</Text>
            </View>

            <View style={[styles.qualityItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Avg SNF %</Text>
              <Text style={[Typography.headline, { color: colors.primary, fontWeight: '900', marginTop: 2 }]}>
                8.65%
              </Text>
              <Text style={[Typography.caption2, { color: '#16A34A', fontWeight: '700' }]}>✓ Meets Norms</Text>
            </View>

            <View style={[styles.qualityItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Water Ratio</Text>
              <Text style={[Typography.headline, { color: '#16A34A', fontWeight: '900', marginTop: 2 }]}>
                0.0%
              </Text>
              <Text style={[Typography.caption2, { color: '#16A34A', fontWeight: '700' }]}>✓ Pure Pure</Text>
            </View>
          </View>
        </Card>

        {/* 4. Registered Member Producers Comparison & Directory Section */}
        <View style={[styles.sectionHeader, { marginTop: 14 }]}>
          <Ionicons name="people-outline" size={18} color={colors.primary} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
            Registered Member Producers ({farmerAnalyticsList.length})
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10, marginTop: -4 }]}>
          Ranked volume comparison for registered dairy farmers. Tap to inspect; double-tap for full member analytics.
        </Text>

        {sortedFarmers.length > 0 ? (
          <>
            {/* Period Selector Tabs for Farmer Analytics */}
            <View style={[styles.periodTabsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {periods.map((periodKey) => {
                const isActive = farmerPeriod === periodKey;
                return (
                  <Pressable
                    key={periodKey}
                    onPress={() => setFarmerPeriod(periodKey)}
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

            {/* Vertical Comparison Bar Chart for Farmers */}
            <VerticalComparisonBarChart
              items={sortedFarmers.map((f, idx) => ({
                id: f.farmerId,
                rank: idx + 1,
                title: f.farmerName,
                code: f.farmerIdCode,
                subtitle: `${f.village} • ${f.numberOfCows} Cow(s) • ${f.verificationStatus === 'verified' ? 'Verified Member' : 'KYC Pending'}`,
                comparison: f.metrics[farmerPeriod],
                onPress: () =>
                  router.push({
                    pathname: '/(union)/farmer-analytics' as any,
                    params: {
                      farmerId: f.farmerId,
                      societyId: activeSocietyId,
                      bmcId: fallbackBmcId,
                    },
                  }),
              }))}
              maxVolume={maxFarmerVolume}
            />
          </>
        ) : null}

        {/* Member Directory List (Clickable Rows) */}
        <Card style={[styles.farmersCard, { marginTop: sortedFarmers.length > 0 ? 12 : 4 }]}>
          <View style={[styles.directoryHeaderRow, { borderBottomColor: colors.border }]}>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
              Society Member Register
            </Text>
            {sortedFarmers.length > 0 && (
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Tap row to view full analytics
              </Text>
            )}
          </View>
          {sortedFarmers.length === 0 ? (
            <View style={styles.emptyInlineBox}>
              <Ionicons name="people-circle-outline" size={34} color={colors.textSecondary} />
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginTop: 6 }]}>
                No Members Registered
              </Text>
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2, textAlign: 'center' }]}>
                No dairy farmers are currently assigned to this society in the system.
              </Text>
            </View>
          ) : (
            sortedFarmers.map((f, fIdx) => (
              <Pressable
                key={f.farmerId}
                onPress={() =>
                  router.push({
                    pathname: '/(union)/farmer-analytics' as any,
                    params: {
                      farmerId: f.farmerId,
                      societyId: activeSocietyId,
                      bmcId: fallbackBmcId,
                    },
                  })
                }
                style={[
                  styles.farmerRow,
                  fIdx < sortedFarmers.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                ]}
              >
                <View style={[styles.farmerAvatar, { backgroundColor: colors.primaryLight }]}>
                  <Text style={{ fontSize: 16 }}>👨‍🌾</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      {f.farmerName}
                    </Text>
                    <View style={[styles.rankMiniPill, { backgroundColor: isDark ? '#15273E' : colors.background }]}>
                      <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
                        #{fIdx + 1}
                      </Text>
                    </View>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {f.farmerIdCode} • {f.village} • {f.numberOfCows} Cow(s) • Fat {f.avgFat}%
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '900' }]}>
                    {formatLitres(f.metrics[farmerPeriod].current)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: f.verificationStatus === 'verified' ? '#DCFCE7' : '#FEF3C7' }]}>
                    <Text style={[styles.statusBadgeText, { color: f.verificationStatus === 'verified' ? '#15803D' : '#D97706' }]}>
                      {f.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </Card>

        {/* 5. Recent Dispatches to Linked BMC */}
        <View style={[styles.sectionHeader, { marginTop: 14 }]}>
          <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
            Recent Dispatches to BMC ({societyDeliveries.length})
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10, marginTop: -4 }]}>
          Declared milk batches dispatched from this society to {society.bmcName}
        </Text>

        <Card style={styles.dispatchesCard}>
          {societyDeliveries.length === 0 ? (
            <View style={styles.emptyInlineBox}>
              <Ionicons name="cube-outline" size={32} color={colors.textSecondary} />
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 4 }]}>
                No dispatches recorded today for this society
              </Text>
            </View>
          ) : (
            societyDeliveries.map((d, dIdx) => {
              const isMatched = d.status === 'matched';
              const isPending = d.status === 'pending_arrival';
              const badgeColor = isMatched ? '#15803D' : isPending ? '#0284C7' : '#DC2626';
              const badgeBg = isMatched ? '#DCFCE7' : isPending ? '#E0F2FE' : '#FEE2E2';
              const badgeText = isMatched ? 'Matched ✓' : isPending ? 'In-Transit' : 'Variance Flagged';

              return (
                <View
                  key={d.id}
                  style={[
                    styles.deliveryRow,
                    dIdx < societyDeliveries.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                  ]}
                >
                  <View style={[styles.deliveryIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="cube" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      Batch #{d.id} • Ref: {d.boothReceiptId}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Declared: {d.declaredDispatchQuantity.toFixed(1)} L • Measured: {d.measuredReceivedQuantity ? `${d.measuredReceivedQuantity.toFixed(1)} L` : 'Pending Intake'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                      {badgeText}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* 6. Quick Action Navigation Footer */}
        <View style={styles.footerActions}>
          <Button
            title={`← Return to ${society.bmcName} Analytics`}
            size="lg"
            variant="outline"
            onPress={handleBack}
          />
          <View style={{ height: 10 }} />
          <Button
            title="🏛️ Return to Union Headquarters Dashboard"
            size="lg"
            onPress={() => router.replace('/(union)' as any)}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  desktopScrollContent: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  facilityCard: {
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  facilityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconFrame: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  codePillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  linkedBmcBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  linkedBmcLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  linkedBmcRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  capacitySection: {
    marginTop: 2,
  },
  capLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  trendCard: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
  },
  trendCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  compDivider: {
    borderTopWidth: 1,
    marginVertical: 6,
  },
  breakdownCard: {
    padding: 14,
    marginBottom: 16,
  },
  sessionPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
  },
  splitFillMorning: {
    height: '100%',
    backgroundColor: '#D97706',
  },
  splitFillEvening: {
    height: '100%',
    backgroundColor: '#4F46E5',
  },
  qualityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityItem: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  farmersCard: {
    padding: 12,
    marginBottom: 16,
  },
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  farmerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dispatchesCard: {
    padding: 12,
    marginBottom: 20,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  deliveryIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInlineBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  footerActions: {
    marginTop: 10,
    marginBottom: 24,
  },
  periodTabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  periodTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  directoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  rankMiniPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
});
