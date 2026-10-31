import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, BackHandler, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { 
  AnalyticsPeriod, 
  PERIOD_LABELS, 
  formatLitres, 
  getBmcAnalyticsById 
} from '../../services/bmcAnalyticsService';
import { VerticalComparisonBarChart } from '../../components/analytics/VerticalComparisonBarChart';
import { useIsDesktop } from '../../hooks/useIsDesktop';

export default function BMCAnalyticsScreen() {
  const { bmcId } = useLocalSearchParams<{ bmcId: string }>();
  const { bmcs, booths, bmcDeliveries } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const handleBackToBmc = () => {
    router.replace('/(union)/bmc-monitoring' as any);
  };

  // Ensure Android hardware back button also returns to BMCs
  useEffect(() => {
    const onBackPress = () => {
      handleBackToBmc();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  // Selected time period for feeder societies comparison
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('daily');

  const activeBmcId = bmcId || bmcs[0]?.id;
  const bmcAnalytics = getBmcAnalyticsById(activeBmcId, bmcs, booths, bmcDeliveries);

  if (!bmcAnalytics) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <DemoHeader title="BMC Production Analytics" subtitle="Facility Not Found" showBack onBack={handleBackToBmc} />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[Typography.headline, { color: colors.text, marginTop: 12 }]}>
            Facility Not Found
          </Text>
          <Pressable onPress={handleBackToBmc} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>← Return to BMCs</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { metrics, societies } = bmcAnalytics;
  const todayReceived = metrics.daily.current;
  const capacityLitres = bmcAnalytics.capacityLitres;
  const utilization = Math.min((todayReceived / capacityLitres) * 100, 100);

  // Sort feeder societies by volume for the selected period
  const sortedSocieties = [...societies].sort(
    (a, b) => b.metrics[selectedPeriod].current - a.metrics[selectedPeriod].current
  );
  const maxSocietyVolume = sortedSocieties.length > 0 ? sortedSocieties[0].metrics[selectedPeriod].current : 1;

  const isDesktop = useIsDesktop();
  const periods: AnalyticsPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader
        title="BMC Production Analytics"
        subtitle={bmcAnalytics.bmcName}
        showBack
        onBack={handleBackToBmc}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && styles.desktopScrollContent]} showsVerticalScrollIndicator={false}>
        {/* 1. Facility Header & Capacity Utilization Card */}
        <Card style={styles.facilityCard}>
          <View style={styles.facilityHeaderRow}>
            <View style={[styles.iconFrame, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="snow" size={26} color={colors.primary} />
            </View>

            <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
              <View style={styles.codeRow}>
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '900', flex: 1 }]} numberOfLines={1}>
                  {bmcAnalytics.bmcName}
                </Text>
                <View style={[styles.codePill, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.codePillText, { color: colors.primary }]}>{bmcAnalytics.code}</Text>
                </View>
              </View>

              <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                {bmcAnalytics.location} • In-Charge: {bmcAnalytics.managerName}
              </Text>
            </View>
          </View>

          {/* Capacity Progress Track */}
          <View style={styles.capacitySection}>
            <View style={styles.capLabelRow}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Cooling Capacity Load: {formatLitres(todayReceived)} / {formatLitres(capacityLitres)}
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

        {/* 2. BMC Self-Historical Comparison Cards (Daily, Weekly, Monthly, Yearly) */}
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
            Facility Performance Trends
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10, marginTop: -4 }]}>
          Benchmark self-comparison against historical periods
        </Text>

        <View style={styles.trendsGrid}>
          {periods.map((periodKey) => {
            const comp = metrics[periodKey];
            const isPos = comp.deltaPercentage >= 0;
            const trendBg = isPos ? '#DCFCE7' : '#FEE2E2';
            const trendColor = isPos ? '#15803D' : '#DC2626';

            return (
              <Card key={periodKey} style={[styles.trendCard, isDesktop && styles.desktopTrendCard]}>
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

        {/* 3. Feeder Societies Breakdown Section */}
        <View style={[styles.sectionHeader, { marginTop: 14 }]}>
          <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
            Feeder Societies Production ({societies.length})
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10, marginTop: -4 }]}>
          Ranked comparison of feeder societies. Tap any society for dedicated analytics & member intake.
        </Text>

        {/* Period Selector Tabs */}
        <View style={[styles.periodTabsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {periods.map((periodKey) => {
            const isActive = selectedPeriod === periodKey;
            return (
              <Pressable
                key={periodKey}
                onPress={() => setSelectedPeriod(periodKey)}
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

        {/* Feeder Societies Vertical Comparison Bar Chart */}
        <VerticalComparisonBarChart
          items={sortedSocieties.map((society, idx) => ({
            id: society.societyId,
            rank: idx + 1,
            title: society.societyName,
            code: society.code,
            subtitle: `In-Charge: ${society.operatorName} ${society.phone ? `• ${society.phone}` : ''}`,
            comparison: society.metrics[selectedPeriod],
            onPress: () =>
              router.push({
                pathname: '/(union)/society-analytics' as any,
                params: { societyId: society.societyId, bmcId: activeBmcId },
              }),
          }))}
          maxVolume={maxSocietyVolume}
        />
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
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 20,
    paddingBottom: 110,
    paddingHorizontal: 24,
  },
  desktopTrendCard: {
    minWidth: '22%',
    flex: 1,
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
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
    flexShrink: 0,
  },
  codePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  capacitySection: {
    marginTop: 4,
  },
  capLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 4,
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
    marginBottom: 10,
  },
  trendCard: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    overflow: 'hidden',
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
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: 6,
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
  societiesList: {
    gap: 2,
  },
  societyItemContainer: {
    marginBottom: 4,
  },
  societyExpandedCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: -4,
    marginBottom: 10,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  miniLedgerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniLedgerItem: {
    flex: 1,
    minWidth: '47%',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});
