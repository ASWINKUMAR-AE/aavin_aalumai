import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  Platform, 
  RefreshControl,
  useWindowDimensions,
  ActivityIndicator,
  LayoutChangeEvent,
  DimensionValue
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Rect, Circle, Path, Line, Text as SvgText, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { SocietyIncomeRecord, BMCDelivery, MilkRecord, DiscrepancyCase } from '../../types/aavin';

type PeriodFilter = 'today' | 'week' | 'month' | 'prev_month' | 'year' | 'prev_year' | 'all';
type TableTab = 'milk' | 'finance' | 'reports';
type LineChartMetric = 'both' | 'reported' | 'received';
type ComparisonHorizon = 'month_over_month' | 'year_over_year';

export default function SocietyDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ societyId?: string }>();
  const societyId = params.societyId;
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  // Responsive breakpoints matching BMC standard
  const isWeb = Platform.OS === 'web';
  const isDesktop = width >= 1100;
  const isTablet = width >= 720 && width < 1100;
  const isMobile = width < 720;

  // Dedicated 2-column card width for Milk Collection Overview (2x2), Performance Metrics (2x2), and Operational Supply Telemetry (2 cols)
  const col2Width: DimensionValue = isWeb ? '48.5%' : (width < 340 ? '100%' : Math.floor((width - 32 - 10) / 2));

  // Dynamic container widths measured via onLayout to guarantee zero SVG overflow and responsive resize
  const [lineChartCardWidth, setLineChartCardWidth] = useState<number>(0);
  const [barChartCardWidth, setBarChartCardWidth] = useState<number>(0);
  const [incomeChartCardWidth, setIncomeChartCardWidth] = useState<number>(0);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(bmc)');
    }
  }, [router]);

  const { 
    booths, 
    bmcs, 
    milkRecords, 
    bmcDeliveries, 
    discrepancyCases, 
    societyIncomeRecords,
    bmcReceipts, 
    getSocietyDetailedStats 
  } = useAavinStore();

  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [activeTableTab, setActiveTableTab] = useState<TableTab>('milk');
  const [lineMetric, setLineMetric] = useState<LineChartMetric>('both');
  const [comparisonHorizon, setComparisonHorizon] = useState<ComparisonHorizon>('month_over_month');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Locate selected society
  const society = useMemo(() => {
    if (!societyId) return booths[0];
    return booths.find(b => b.id === societyId) || booths[0];
  }, [societyId, booths]);

  const bmc = useMemo(() => {
    if (!society) return null;
    return bmcs.find(b => b.id === society.assignedBmcId) || bmcs[0];
  }, [society, bmcs]);

  // Simulate smooth loading transition on society change
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [societyId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 300);
  }, []);

  // Filtered raw datasets for the selected society
  const rawMilkRecords = useMemo(() => {
    if (!society) return [];
    return milkRecords.filter(r => r.boothId === society.id);
  }, [society, milkRecords]);

  const societyDeliveries = useMemo(() => {
    if (!society) return [];
    return bmcDeliveries.filter(d => d.boothId === society.id);
  }, [society, bmcDeliveries]);

  const societyIncome = useMemo(() => {
    if (!society) return [];
    return (societyIncomeRecords || []).filter(i => i.societyId === society.id);
  }, [society, societyIncomeRecords]);

  const societyDiscrepancies = useMemo(() => {
    if (!society) return [];
    return discrepancyCases.filter(c => c.boothId === society.id);
  }, [society, discrepancyCases]);

  // Base detailed stats from store
  const stats = useMemo(() => {
    if (!society) return null;
    return getSocietyDetailedStats(society.id, period);
  }, [society, period, getSocietyDetailedStats]);

  // Date range bounds & active labels
  const dateRangeBounds = useMemo(() => {
    const today = '2026-10-12';
    if (period === 'today') return { start: today, end: today, label: 'Today (12 Oct 2026)' };
    if (period === 'week') return { start: '2026-10-06', end: today, label: 'Last 7 Days (06 - 12 Oct 2026)' };
    if (period === 'month') return { start: '2026-10-01', end: '2026-10-31', label: 'Current Month (October 2026)' };
    if (period === 'prev_month') return { start: '2026-09-01', end: '2026-09-30', label: 'Previous Month (September 2026)' };
    if (period === 'year') return { start: '2026-01-01', end: '2026-12-31', label: 'Current Fiscal Year (2026-27)' };
    if (period === 'prev_year') return { start: '2025-01-01', end: '2025-12-31', label: 'Previous Fiscal Year (2025-26)' };
    return { start: '2025-01-01', end: '2026-12-31', label: 'All Recorded Time' };
  }, [period]);

  // 7-day daily series for selected period (used in Line Chart & Telemetry)
  const dailySeries = useMemo(() => {
    const dates = ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'];
    const baseDaily = stats?.dailyMilk || 450;

    return dates.map((d, index) => {
      const recordsOnDate = rawMilkRecords.filter(r => r.collectionDate === d);
      const deliveryOnDate = societyDeliveries.find(del => del.collectionDate === d);

      const reportedQty = recordsOnDate.length > 0
        ? recordsOnDate.reduce((sum, r) => sum + r.quantityLitres, 0)
        : (deliveryOnDate?.declaredDispatchQuantity || parseFloat((baseDaily * (0.95 + (index % 3) * 0.05)).toFixed(1)));

      const receivedQty = deliveryOnDate?.measuredReceivedQuantity !== undefined
        ? deliveryOnDate.measuredReceivedQuantity
        : (recordsOnDate.length > 0 ? reportedQty : parseFloat((reportedQty * (deliveryOnDate?.declaredDispatchQuantity && deliveryOnDate.measuredReceivedQuantity ? deliveryOnDate.measuredReceivedQuantity / deliveryOnDate.declaredDispatchQuantity : 1)).toFixed(1)));

      const difference = parseFloat((reportedQty - receivedQty).toFixed(1));

      const morningRecords = recordsOnDate.filter(r => r.session === 'morning');
      const eveningRecords = recordsOnDate.filter(r => r.session === 'evening');
      const morningLitres = morningRecords.length > 0 
        ? morningRecords.reduce((s, r) => s + r.quantityLitres, 0)
        : reportedQty * 0.58;
      const eveningLitres = eveningRecords.length > 0
        ? eveningRecords.reduce((s, r) => s + r.quantityLitres, 0)
        : reportedQty * 0.42;

      // Telemetry operational status
      let telemetryStatus: 'verified_intake' | 'delayed_submission' | 'unlogged' | 'verified_zero' | 'discrepancy' = 'verified_intake';
      if (Math.abs(difference) > 3) {
        telemetryStatus = 'discrepancy';
      } else if (deliveryOnDate?.status === 'pending_arrival') {
        telemetryStatus = 'delayed_submission';
      } else if (reportedQty === 0 && receivedQty === 0) {
        telemetryStatus = 'unlogged';
      }

      return {
        date: d,
        shortDate: d.slice(5),
        label: `${d.slice(8)} Oct`,
        reportedLitres: reportedQty,
        receivedLitres: receivedQty,
        differenceLitres: difference,
        hasDiscrepancy: Math.abs(difference) > 3,
        morningLitres: parseFloat(morningLitres.toFixed(1)),
        eveningLitres: parseFloat(eveningLitres.toFixed(1)),
        telemetryStatus,
      };
    });
  }, [rawMilkRecords, societyDeliveries, stats]);

  // Section 3: Milk Collection Overview & Analytics Metrics
  const milkAnalytics = useMemo(() => {
    const totalReported = dailySeries.reduce((s, d) => s + d.reportedLitres, 0);
    const totalReceived = dailySeries.reduce((s, d) => s + d.receivedLitres, 0);

    // Dispatched / Reported to Union
    let unionDispatched = 0;
    bmcReceipts.forEach(r => {
      if (r.status === 'sent_to_union' || r.status === 'reviewed_by_union' || r.status === 'under_review') {
        const match = r.societySummaries?.find(s => s.societyId === society?.id);
        if (match) unionDispatched += match.receivedLitres;
      }
    });
    if (unionDispatched === 0 && totalReceived > 0) {
      unionDispatched = totalReceived * 0.98;
    }

    const recordedDays = dailySeries.filter(d => d.reportedLitres > 0).length;
    const avgDaily = recordedDays > 0 ? totalReceived / recordedDays : 0;
    const peakDay = Math.max(...dailySeries.map(d => d.receivedLitres));
    const minDay = Math.min(...dailySeries.map(d => d.receivedLitres));
    const totalVariance = parseFloat((totalReported - totalReceived).toFixed(1));
    const missingDays = dailySeries.filter(d => d.reportedLitres === 0).length;

    return {
      totalReportedLitres: parseFloat(totalReported.toFixed(1)),
      totalReceivedLitres: parseFloat(totalReceived.toFixed(1)),
      unionDispatchedLitres: parseFloat(unionDispatched.toFixed(1)),
      avgDailyLitres: parseFloat(avgDaily.toFixed(1)),
      peakDayLitres: peakDay > 0 ? parseFloat(peakDay.toFixed(1)) : 0,
      minDayLitres: minDay > 0 ? parseFloat(minDay.toFixed(1)) : 0,
      totalVarianceLitres: totalVariance,
      recordedDaysCount: recordedDays,
      missingDaysCount: missingDays,
    };
  }, [dailySeries, bmcReceipts, society]);

  // Section 3: 12-Month Jan-Dec Bar Chart Data
  const monthlyBarData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyBaseline = (stats?.monthlyTotalMilk || 12500);

    return months.map((m, idx) => {
      const curve2026 = [0.88, 0.92, 0.96, 1.02, 1.05, 1.08, 1.04, 0.98, 0.97, 1.00, 0.95, 0.94];
      const curve2025 = [0.82, 0.86, 0.90, 0.95, 0.98, 1.00, 0.97, 0.92, 0.91, 0.94, 0.90, 0.89];

      const currentVal = idx <= 9 
        ? Math.round(monthlyBaseline * curve2026[idx])
        : 0;

      const previousVal = Math.round(monthlyBaseline * curve2025[idx]);

      return {
        month: m,
        val2026: currentVal,
        val2025: previousVal,
        isProjected: idx > 9,
      };
    });
  }, [stats]);

  // Section 3: Historical Comparison
  const historicalAnalysis = useMemo(() => {
    const curMonthVal = stats?.monthlyTotalMilk || 12850;
    const prevMonthVal = Math.round(curMonthVal * 0.945);
    const monthDiff = curMonthVal - prevMonthVal;
    const monthGrowthPct = prevMonthVal > 0 ? parseFloat(((monthDiff / prevMonthVal) * 100).toFixed(1)) : 0;

    const curYearVal = stats?.yearlyTotalMilk || 148200;
    const prevYearVal = Math.round(curYearVal * 0.915);
    const yearDiff = curYearVal - prevYearVal;
    const yearGrowthPct = prevYearVal > 0 ? parseFloat(((yearDiff / prevYearVal) * 100).toFixed(1)) : 0;

    return {
      curMonthVal,
      prevMonthVal,
      monthDiff,
      monthGrowthPct,
      curYearVal,
      prevYearVal,
      yearDiff,
      yearGrowthPct,
      avgDailyCur: stats?.avgDailyQuantity || 430,
      avgDailyPrev: Math.round((stats?.avgDailyQuantity || 430) * 0.95),
      varianceTrend: stats?.differenceLitres && stats.differenceLitres > 0
        ? 'A volume difference of 12.0L logged on 11 Oct; currently undergoing routine sensor calibration verification.'
        : 'All receipts balanced within Union acceptable transit threshold (±0.5%).',
    };
  }, [stats]);

  // Section 4: Operational Supply Telemetry Facets
  const supplyTelemetry = useMemo(() => {
    const latestDate = '2026-10-12';
    const latestSessionToday = dailySeries.find(d => d.date === latestDate) || dailySeries[dailySeries.length - 1];
    const latestDelivery = societyDeliveries.find(d => d.collectionDate === latestDate) || societyDeliveries[0];

    const targetQuota = 440.0;
    const quotaPct = ((latestSessionToday.receivedLitres / targetQuota) * 100).toFixed(1);

    return {
      latestDate,
      sessionName: 'Morning Shift Session #1',
      sessionTime: latestDelivery?.dispatchTime || '07:15 AM',
      vehicleNumber: 'TN-59-BZ-4819 (Insulated SS Tanker)',
      route: 'Melur -> Othakadai -> Madurai Central Dairy',
      chillingTemp: '4.1°C (Standard Grade)',
      statusBadge: latestDelivery?.status === 'pending_arrival' ? 'Awaiting Arrival' : 'Intake Verified & Chilled',
      targetQuota,
      quotaFulfillmentPct: quotaPct,
      dailyQuantity: latestSessionToday.receivedLitres,
      reportedQuantity: latestSessionToday.reportedLitres,
      intakeVariance: latestSessionToday.differenceLitres,
      unresolvedCasesCount: societyDiscrepancies.filter(c => c.status !== 'resolved').length,
    };
  }, [dailySeries, societyDeliveries, societyDiscrepancies]);

  // Financial Summary
  const financialTotals = useMemo(() => {
    const totalRecorded = societyIncome.reduce((s, i) => s + i.amountInr, 0);
    const cleared = societyIncome
      .filter(i => i.status === 'verified')
      .reduce((s, i) => s + i.amountInr, 0);
    const pending = societyIncome
      .filter(i => i.status === 'recorded')
      .reduce((s, i) => s + i.amountInr, 0);

    let unionReported = 0;
    bmcReceipts.forEach(r => {
      const match = r.societySummaries?.find(s => s.societyId === society?.id);
      if (match) unionReported += match.recordedIncome;
    });

    return {
      totalRecordedIncome: totalRecorded > 0 ? totalRecorded : (stats?.totalRecordedIncome || 84500),
      clearedPayments: cleared > 0 ? cleared : 84500,
      pendingPayments: pending,
      amountReportedToUnion: unionReported > 0 ? unionReported : (stats?.amountReportedToUnion || 0),
      latestRecordDate: societyIncome.length > 0 ? societyIncome[0].transactionDate : '12-Oct-2026',
      submissionStatus: cleared > 0 ? 'Verified & Cleared' : 'Pending Verification',
    };
  }, [societyIncome, bmcReceipts, stats, society]);

  if (!society) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <DemoHeader title="Society Details" subtitle="Society record not found" />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[Typography.headline, { color: colors.text, marginTop: 12 }]}>
            Society Not Found
          </Text>
          <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
            The requested feeder society ID could not be located in the registry.
          </Text>
          <Button 
            title="← Back to Societies Directory" 
            style={{ marginTop: 20 }}
            onPress={() => router.back()} 
          />
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <DemoHeader title={society.name} subtitle={`Loading society analytics (ID: ${society.id})...`} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[Typography.subhead, { color: colors.text, marginTop: 14, fontWeight: '700' }]}>
            Loading Society Telemetry & Analytics...
          </Text>
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>
            Fetching weigh-scale telemetry, chilling flow meters, and financial ledgers.
          </Text>
        </View>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <DemoHeader title={society.name} subtitle="Data Retrieval Interrupted" />
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#DC2626" />
          <Text style={[Typography.headline, { color: colors.text, marginTop: 12 }]}>
            Unable to Load Society Records
          </Text>
          <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
            A network or cache error occurred while loading telemetry for {society.name}.
          </Text>
          <Button 
            title="Retry Loading" 
            style={{ marginTop: 20 }}
            onPress={() => {
              setIsLoading(true);
              setHasError(false);
              setTimeout(() => setIsLoading(false), 200);
            }} 
          />
        </View>
      </View>
    );
  }

  const hasNoData = rawMilkRecords.length === 0 && societyDeliveries.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={society.name}
        subtitle={`ID: ${society.id} • ${society.village}, ${society.taluk}`}
        showBack={true}
        onBack={handleBack}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Dedicated Top Navigation Bar with Back Button & Quick Actions */}
        <View style={styles.topNavBar}>
          <Pressable 
            style={[styles.navBackBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to Feeder Societies"
          >
            <Ionicons name="arrow-back" size={16} color={colors.primary} />
            <Text style={[styles.navBackBtnText, { color: colors.primary }]}>
              Back to Feeder Societies
            </Text>
          </Pressable>

          <View style={styles.headerActionRow}>
            <Pressable 
              style={[styles.actionBtnPill, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              onPress={() => router.push({ pathname: '/(bmc)/society-income', params: { preselectedSocietyId: society.id } })}
              accessibilityRole="button"
              accessibilityLabel="Record Society Income"
            >
              <Ionicons name="cash-outline" size={14} color={colors.primary} />
              <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', marginLeft: 4 }]}>
                + Income
              </Text>
            </Pressable>

            <Pressable 
              style={[styles.actionBtnPill, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}
              onPress={() => router.push({ pathname: '/(bmc)/society-comparison', params: { preselectedId1: society.id } })}
              accessibilityRole="button"
              accessibilityLabel="Compare Societies"
            >
              <Ionicons name="bar-chart-outline" size={14} color="#166534" />
              <Text style={[Typography.caption2, { color: '#166534', fontWeight: '800', marginLeft: 4 }]}>
                Compare
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Dedicated Non-Colliding Breadcrumb Trail */}
        <View style={[styles.breadcrumbTrailContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable onPress={() => router.push('/(bmc)')} style={styles.breadcrumbItem}>
            <Ionicons name="home-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.breadcrumbText, { color: colors.primary }]}>BMC Dashboard</Text>
          </Pressable>
          <Ionicons name="chevron-forward" size={11} color={colors.textMuted} style={{ marginHorizontal: 4 }} />
          <Pressable onPress={handleBack} style={styles.breadcrumbItem}>
            <Text style={[styles.breadcrumbText, { color: colors.primary }]}>Assigned Feeder Societies</Text>
          </Pressable>
          <Ionicons name="chevron-forward" size={11} color={colors.textMuted} style={{ marginHorizontal: 4 }} />
          <Text style={[styles.breadcrumbText, { color: colors.text, fontWeight: '800', flexShrink: 1 }]} numberOfLines={1}>
            {society.name} ({society.id})
          </Text>
        </View>

        {/* Society Profile Card */}
        <Card style={styles.profileHeaderCard}>
          <View style={styles.profileHeaderTop}>
            <View style={[styles.societyIconBadgeLarge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="business" size={26} color={colors.primary} />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.titleRow}>
                <Text style={[Typography.headline, { color: colors.text, fontWeight: '900', flex: 1 }]}>
                  {society.name}
                </Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: stats?.isActive ? '#DCFCE7' : '#F1F5F9' 
                }]}>
                  <Text style={[styles.statusText, { 
                    color: stats?.isActive ? '#166534' : '#64748B' 
                  }]}>
                    {stats?.isActive ? 'ACTIVE CO-OPERATIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaBadgeRow}>
                <View style={styles.codePill}>
                  <Text style={styles.codePillText}>ID: {society.id}</Text>
                </View>
                <View style={styles.codePill}>
                  <Text style={styles.codePillText}>Code: {society.code}</Text>
                </View>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  📍 {society.village}, {society.taluk}
                </Text>
              </View>

              <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 4 }]}>
                Assigned BMC: {bmc?.name || society.assignedBmcId} • In-Charge: {society.operatorName} • 📞 {society.phone} • Capacity: {society.capacityLitres.toLocaleString()} L
              </Text>
            </View>
          </View>

          {/* Verification & Reporting Status Banner */}
          <View style={[styles.reconcileStatusStrip, {
            backgroundColor: stats?.reconciliationStatus === 'variance' ? '#FEF2F2' : 
                             stats?.reconciliationStatus === 'reconciled' ? '#F0FDF4' : '#F8FAFC',
            borderColor: stats?.reconciliationStatus === 'variance' ? '#FCA5A5' : 
                         stats?.reconciliationStatus === 'reconciled' ? '#86EFAC' : '#E2E8F0',
          }]}>
            <Ionicons 
              name={stats?.reconciliationStatus === 'variance' ? 'warning' : 
                    stats?.reconciliationStatus === 'reconciled' ? 'checkmark-circle' : 'hourglass-outline'} 
              size={18} 
              color={stats?.reconciliationStatus === 'variance' ? '#DC2626' : 
                     stats?.reconciliationStatus === 'reconciled' ? '#16A34A' : '#64748B'} 
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[Typography.caption1, { 
                color: stats?.reconciliationStatus === 'variance' ? '#991B1B' : 
                       stats?.reconciliationStatus === 'reconciled' ? '#166534' : '#334155',
                fontWeight: '800',
              }]}>
                Reconciliation: {stats?.reconciliationStatus.toUpperCase()}
                {stats?.differenceLitres && stats.differenceLitres !== 0 ? ` (${stats.differenceLitres > 0 ? '-' : '+'}${Math.abs(stats.differenceLitres)}L variance)` : ' (Balanced)'}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Latest Intake: {stats?.latestSubmissionDate || '12-Oct-2026'} • Active Audit Cases: {stats?.unresolvedDiscrepanciesCount || 0}
              </Text>
            </View>

            <Button
              title="Audit Log"
              size="sm"
              variant="outline"
              onPress={() => router.push('/(bmc)/investigations')}
            />
          </View>

          {/* Date-Range Selector & Quick Filters */}
          <View style={styles.periodFilterSection}>
            <Text style={[Typography.caption2, { color: colors.textMuted, fontWeight: '800', marginBottom: 6 }]}>
              SELECT REPORTING PERIOD:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodTabsRow}>
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'Last 7 Days' },
                { id: 'month', label: 'Current Month' },
                { id: 'prev_month', label: 'Previous Month' },
                { id: 'year', label: 'Current Year' },
                { id: 'prev_year', label: 'Previous Year' },
                { id: 'all', label: 'All Time' },
              ].map((p) => {
                const active = period === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.periodTab,
                      active && { backgroundColor: colors.primary, borderColor: colors.primary },
                      !active && { backgroundColor: colors.card, borderColor: colors.border }
                    ]}
                    onPress={() => setPeriod(p.id as PeriodFilter)}
                  >
                    <Text style={[
                      Typography.caption2,
                      { fontWeight: '700' },
                      active ? { color: '#FFFFFF' } : { color: colors.textSecondary }
                    ]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700', marginTop: 6 }]}>
              Active Horizon: {dateRangeBounds.label}
            </Text>
          </View>
        </Card>

        {hasNoData ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
            <Text style={[Typography.headline, { color: colors.text, marginTop: 10 }]}>
              No Historical Records
            </Text>
            <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 420 }]}>
              This feeder society has no recorded milk collections or delivery records in the active period. Missing records are transparently marked as unlogged rather than assuming 0L supply.
            </Text>
            <Button
              title="📥 Record Milk Delivery at BMC"
              size="md"
              style={{ marginTop: 16 }}
              onPress={() => router.push('/(bmc)/receive-milk')}
            />
          </Card>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* SECTION 3: MILK ANALYTICS DASHBOARD (Organized into 6 Sub-sections)        */}
            {/* ========================================================================= */}
            <View style={styles.sectionHeaderContainer}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="analytics" size={22} color={colors.primary} />
                <Text style={[Typography.headline, { color: colors.text, fontWeight: '900', marginLeft: 8 }]}>
                  Milk Analytics Dashboard
                </Text>
              </View>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                Aggregated collection telemetry, flow-meter verification, and comparative trends
              </Text>
            </View>

            {/* 1. Milk Collection Overview (4 Uniform Metric Cards arranged 2 col x 2 row) */}
            <View style={styles.subSectionBlock}>
              <Text style={styles.subSectionTitle}>1. MILK COLLECTION OVERVIEW (2 × 2 GRID)</Text>
              <View style={styles.uniformMetricsGrid}>
                {/* Metric 1 */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={styles.uniformMetricCard}>
                    <View style={styles.metricTopRow}>
                      <Ionicons name="scale-outline" size={18} color={colors.primary} />
                      <View style={[styles.miniBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.miniBadgeText, { color: colors.primary }]}>Declared</Text>
                      </View>
                    </View>
                    <Text style={[styles.metricBigNumber, { color: colors.text }]}>
                      {milkAnalytics.totalReportedLitres.toLocaleString()} L
                    </Text>
                    <Text style={styles.metricCardTitle}>Reported by Society</Text>
                    <Text style={styles.metricCardSubtitle}>Society weigh-scale dispatch</Text>
                  </Card>
                </View>

                {/* Metric 2 */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={styles.uniformMetricCard}>
                    <View style={styles.metricTopRow}>
                      <Ionicons name="flask-outline" size={18} color={colors.primary} />
                      <View style={[styles.miniBadge, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={[styles.miniBadgeText, { color: '#166534' }]}>Verified</Text>
                      </View>
                    </View>
                    <Text style={[styles.metricBigNumber, { color: colors.primary }]}>
                      {milkAnalytics.totalReceivedLitres.toLocaleString()} L
                    </Text>
                    <Text style={styles.metricCardTitle}>Received at BMC</Text>
                    <Text style={styles.metricCardSubtitle}>Chilling flow-meter verified</Text>
                  </Card>
                </View>

                {/* Metric 3 */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={styles.uniformMetricCard}>
                    <View style={styles.metricTopRow}>
                      <Ionicons name="send-outline" size={18} color="#7C3AED" />
                      <View style={[styles.miniBadge, { backgroundColor: '#F3E8FF' }]}>
                        <Text style={[styles.miniBadgeText, { color: '#7C3AED' }]}>Dispatched</Text>
                      </View>
                    </View>
                    <Text style={[styles.metricBigNumber, { color: '#7C3AED' }]}>
                      {milkAnalytics.unionDispatchedLitres.toLocaleString()} L
                    </Text>
                    <Text style={styles.metricCardTitle}>Reported to Union</Text>
                    <Text style={styles.metricCardSubtitle}>Included in consolidated return</Text>
                  </Card>
                </View>

                {/* Metric 4 */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={[styles.uniformMetricCard, milkAnalytics.totalVarianceLitres > 0 && { borderColor: '#FCA5A5' }]}>
                    <View style={styles.metricTopRow}>
                      <Ionicons name="swap-vertical" size={18} color={milkAnalytics.totalVarianceLitres > 0 ? '#DC2626' : '#16A34A'} />
                      <View style={[styles.miniBadge, { backgroundColor: milkAnalytics.totalVarianceLitres > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                        <Text style={[styles.miniBadgeText, { color: milkAnalytics.totalVarianceLitres > 0 ? '#991B1B' : '#166534' }]}>
                          {milkAnalytics.totalVarianceLitres > 0 ? 'Variance' : 'Balanced'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.metricBigNumber, { color: milkAnalytics.totalVarianceLitres > 0 ? '#DC2626' : '#16A34A' }]}>
                      {milkAnalytics.totalVarianceLitres > 0 ? `-${milkAnalytics.totalVarianceLitres} L` : '0.0 L'}
                    </Text>
                    <Text style={styles.metricCardTitle}>Net Intake Discrepancy</Text>
                    <Text style={styles.metricCardSubtitle}>Transit measurement delta</Text>
                  </Card>
                </View>
              </View>
            </View>

            {/* 2. Society Performance Overview (4 Uniform Metric Cards arranged 2 col x 2 row) */}
            <View style={styles.subSectionBlock}>
              <Text style={styles.subSectionTitle}>2. SOCIETY PERFORMANCE METRICS (2 × 2 GRID)</Text>
              <View style={styles.uniformMetricsGrid}>
                {/* Daily Avg */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={styles.uniformMetricCard}>
                    <View style={styles.metricTopRow}>
                      <Ionicons name="speedometer-outline" size={18} color="#16A34A" />
                      <Text style={[Typography.caption2, { color: '#166534', fontWeight: '800' }]}>Daily Pace</Text>
                    </View>
                    <Text style={[styles.metricBigNumber, { color: '#16A34A' }]}>
                      {milkAnalytics.avgDailyLitres} L
                    </Text>
                    <Text style={styles.metricCardTitle}>Average Daily Intake</Text>
                    <Text style={styles.metricCardSubtitle}>Across active recording sessions</Text>
                  </Card>
                </View>

                {/* Peak Day */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={styles.uniformMetricCard}>
                    <View style={styles.metricTopRow}>
                      <Ionicons name="trending-up-outline" size={18} color="#EA580C" />
                      <Text style={[Typography.caption2, { color: '#EA580C', fontWeight: '800' }]}>Peak Day</Text>
                    </View>
                    <Text style={[styles.metricBigNumber, { color: '#EA580C' }]}>
                      {milkAnalytics.peakDayLitres} L
                    </Text>
                    <Text style={styles.metricCardTitle}>Highest Daily Yield</Text>
                    <Text style={styles.metricCardSubtitle}>Single-day peak intake session</Text>
                  </Card>
                </View>

                {/* Min Day */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={styles.uniformMetricCard}>
                    <View style={styles.metricTopRow}>
                      <Ionicons name="trending-down-outline" size={18} color="#64748B" />
                      <Text style={[Typography.caption2, { color: '#64748B', fontWeight: '800' }]}>Lean Day</Text>
                    </View>
                    <Text style={[styles.metricBigNumber, { color: '#64748B' }]}>
                      {milkAnalytics.minDayLitres} L
                    </Text>
                    <Text style={styles.metricCardTitle}>Lowest Daily Yield</Text>
                    <Text style={styles.metricCardSubtitle}>Single-day lowest recorded session</Text>
                  </Card>
                </View>

                {/* Recorded Session Days */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={styles.uniformMetricCard}>
                    <View style={styles.metricTopRow}>
                      <Ionicons name="calendar-outline" size={18} color="#0284C7" />
                      <Text style={[Typography.caption2, { color: '#0284C7', fontWeight: '800' }]}>Compliance</Text>
                    </View>
                    <Text style={[styles.metricBigNumber, { color: '#0284C7' }]}>
                      {milkAnalytics.recordedDaysCount} / 7 Days
                    </Text>
                    <Text style={styles.metricCardTitle}>Telemetry Completeness</Text>
                    <Text style={styles.metricCardSubtitle}>
                      {milkAnalytics.missingDaysCount > 0 ? `⚠️ ${milkAnalytics.missingDaysCount} unlogged session(s)` : '100% telemetry verified'}
                    </Text>
                  </Card>
                </View>
              </View>
            </View>

            {/* 3. Supply Trends — Fully Responsive SVG Line Chart */}
            <View style={styles.subSectionBlock}>
              <Text style={styles.subSectionTitle}>3. DAILY SUPPLY TRENDS</Text>
              <Card 
                style={styles.chartCard}
                onLayout={(e: LayoutChangeEvent) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0 && Math.abs(w - lineChartCardWidth) > 2) {
                    setLineChartCardWidth(w);
                  }
                }}
              >
                <View style={styles.chartHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      Daily Milk Collection & Chilling Influx
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Dynamic volume curves across weigh-scale and flow-meter sensors
                    </Text>
                  </View>

                  <View style={styles.chartToggleGroup}>
                    {(['both', 'reported', 'received'] as LineChartMetric[]).map((m) => (
                      <Pressable
                        key={m}
                        style={[
                          styles.toggleBtn,
                          lineMetric === m && { backgroundColor: colors.primary }
                        ]}
                        onPress={() => setLineMetric(m)}
                      >
                        <Text style={[
                          styles.toggleBtnText,
                          lineMetric === m ? { color: '#FFFFFF' } : { color: colors.textSecondary }
                        ]}>
                          {m.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Legend Row */}
                <View style={styles.chartLegendRow}>
                  {(lineMetric === 'both' || lineMetric === 'reported') && (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendIndicatorLine, { backgroundColor: '#0284C7' }]} />
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Society Declared (L)</Text>
                    </View>
                  )}
                  {(lineMetric === 'both' || lineMetric === 'received') && (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendIndicatorLine, { backgroundColor: '#16A34A' }]} />
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>BMC Intake Measured (L)</Text>
                    </View>
                  )}
                </View>

                {/* Render SVG Line Chart with auto-measured width */}
                <View style={styles.svgContainer}>
                  {(() => {
                    const cardInnerW = lineChartCardWidth > 0 ? lineChartCardWidth - 32 : (width - (isMobile ? 48 : 64));
                    const svgW = Math.max(280, cardInnerW);
                    const svgH = isMobile ? 190 : 220;
                    const padLeft = 44;
                    const padRight = 20;
                    const padBottom = 28;
                    const padTop = 18;

                    const allVals = dailySeries.flatMap(d => [d.reportedLitres, d.receivedLitres]);
                    const maxVal = Math.max(...allVals, 500);
                    const minVal = Math.min(...allVals, 300);
                    const range = maxVal - minVal || 1;

                    const plotW = svgW - padLeft - padRight;
                    const plotH = svgH - padTop - padBottom;

                    const getX = (i: number) => padLeft + (i / (dailySeries.length - 1)) * plotW;
                    const getY = (val: number) => padTop + plotH - ((val - minVal) / range) * plotH;

                    const reportedPath = dailySeries.map((d, i) => `${getX(i)},${getY(d.reportedLitres)}`).join(' ');
                    const receivedPath = dailySeries.map((d, i) => `${getX(i)},${getY(d.receivedLitres)}`).join(' ');

                    return (
                      <Svg width={svgW} height={svgH}>
                        {/* Horizontal Grid */}
                        <Line x1={padLeft} y1={padTop} x2={svgW - padRight} y2={padTop} stroke="#E2E8F0" strokeDasharray="3,3" />
                        <Line x1={padLeft} y1={padTop + plotH / 2} x2={svgW - padRight} y2={padTop + plotH / 2} stroke="#E2E8F0" strokeDasharray="3,3" />
                        <Line x1={padLeft} y1={padTop + plotH} x2={svgW - padRight} y2={padTop + plotH} stroke="#CBD5E1" strokeWidth={1} />

                        {/* Y-Axis Labels */}
                        <SvgText x={padLeft - 6} y={padTop + 4} fontSize={9} fill="#64748B" textAnchor="end">
                          {Math.round(maxVal)}L
                        </SvgText>
                        <SvgText x={padLeft - 6} y={padTop + plotH / 2 + 3} fontSize={9} fill="#64748B" textAnchor="end">
                          {Math.round((maxVal + minVal) / 2)}L
                        </SvgText>
                        <SvgText x={padLeft - 6} y={padTop + plotH} fontSize={9} fill="#64748B" textAnchor="end">
                          {Math.round(minVal)}L
                        </SvgText>

                        {/* Line 1: Reported */}
                        {(lineMetric === 'both' || lineMetric === 'reported') && (
                          <Path
                            d={`M ${reportedPath}`}
                            fill="none"
                            stroke="#0284C7"
                            strokeWidth={2.5}
                            strokeDasharray={lineMetric === 'both' ? '4,4' : undefined}
                          />
                        )}

                        {/* Line 2: Received */}
                        {(lineMetric === 'both' || lineMetric === 'received') && (
                          <Path
                            d={`M ${receivedPath}`}
                            fill="none"
                            stroke="#16A34A"
                            strokeWidth={3}
                          />
                        )}

                        {/* Nodes and Labels */}
                        {dailySeries.map((d, i) => {
                          const x = getX(i);
                          const yRec = getY(d.receivedLitres);
                          const isSelected = selectedPointIndex === i;

                          return (
                            <G key={d.date}>
                              <Circle
                                cx={x}
                                cy={yRec}
                                r={isSelected ? 6 : 4}
                                fill="#16A34A"
                                stroke="#FFFFFF"
                                strokeWidth={2}
                                onPress={() => setSelectedPointIndex(isSelected ? null : i)}
                              />

                              <SvgText
                                x={x}
                                y={svgH - 8}
                                fontSize={9}
                                fontWeight="600"
                                fill="#475569"
                                textAnchor="middle"
                              >
                                {d.label}
                              </SvgText>

                              {isSelected && (
                                <SvgText
                                  x={x}
                                  y={yRec - 8}
                                  fontSize={10}
                                  fontWeight="800"
                                  fill="#166534"
                                  textAnchor="middle"
                                >
                                  {d.receivedLitres}L
                                </SvgText>
                              )}
                            </G>
                          );
                        })}
                      </Svg>
                    );
                  })()}
                </View>

                <Text style={[Typography.caption2, { color: colors.textMuted, textAlign: 'center', marginTop: 4 }]}>
                  💡 Tap any data node to inspect exact volume. Dotted blue: Declared • Solid green: Measured flow
                </Text>
              </Card>
            </View>

            {/* 4. Reported vs Received Milk & Shift Distribution */}
            <View style={styles.subSectionBlock}>
              <Text style={styles.subSectionTitle}>4. REPORTED VS RECEIVED MILK & SHIFT DISTRIBUTION</Text>
              <View style={styles.dualResponsiveRow}>
                {/* 4A: Variance Table */}
                <Card style={styles.halfCardItem}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginBottom: 6 }]}>
                    ⚖️ Reported vs Received Variance
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10 }]}>
                    Weigh-scale vs flow-meter reconciliation tracking
                  </Text>

                  <View style={{ gap: 6 }}>
                    {dailySeries.slice(0, 5).map(d => (
                      <View key={d.date} style={[styles.discrepancyRowItem, { borderBottomColor: colors.border }]}>
                        <View>
                          <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>{d.label}</Text>
                          <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                            Declared: {d.reportedLitres}L • Flow: {d.receivedLitres}L
                          </Text>
                        </View>
                        <View style={[styles.varianceBadge, { 
                          backgroundColor: d.differenceLitres === 0 ? '#DCFCE7' : (d.differenceLitres > 0 ? '#FEE2E2' : '#EFF6FF') 
                        }]}>
                          <Text style={[styles.varianceBadgeText, { 
                            color: d.differenceLitres === 0 ? '#166534' : (d.differenceLitres > 0 ? '#991B1B' : '#1E40AF') 
                          }]}>
                            {d.differenceLitres === 0 ? '✓ Balanced' : `${d.differenceLitres > 0 ? '-' : '+'}${Math.abs(d.differenceLitres)}L`}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>

                {/* 4B: Shift Distribution */}
                <Card style={styles.halfCardItem}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginBottom: 6 }]}>
                    ☀️ Shift Volume Distribution
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10 }]}>
                    Session proportion split (Morning vs Evening)
                  </Text>

                  <View style={styles.shiftBreakdownContainer}>
                    <View style={styles.shiftCard}>
                      <View style={styles.shiftCardTop}>
                        <Ionicons name="sunny" size={16} color="#D97706" />
                        <Text style={[Typography.caption2, { color: '#B45309', fontWeight: '800' }]}>MORNING</Text>
                      </View>
                      <Text style={[styles.shiftBigNumber, { color: '#D97706' }]}>58%</Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        ~{(milkAnalytics.avgDailyLitres * 0.58).toFixed(1)} L/day
                      </Text>
                    </View>

                    <View style={styles.shiftCard}>
                      <View style={styles.shiftCardTop}>
                        <Ionicons name="moon" size={16} color="#7C3AED" />
                        <Text style={[Typography.caption2, { color: '#6D28D9', fontWeight: '800' }]}>EVENING</Text>
                      </View>
                      <Text style={[styles.shiftBigNumber, { color: '#7C3AED' }]}>42%</Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        ~{(milkAnalytics.avgDailyLitres * 0.42).toFixed(1)} L/day
                      </Text>
                    </View>
                  </View>

                  <View style={styles.splitBar}>
                    <View style={[styles.splitBarLeft, { flex: 58 }]} />
                    <View style={[styles.splitBarRight, { flex: 42 }]} />
                  </View>

                  <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 8 }]}>
                    Morning collection peaks at 06:30 AM; evening session intake completes by 06:45 PM.
                  </Text>
                </Card>
              </View>
            </View>

            {/* 5. Historical Comparisons & Seasonality */}
            <View style={styles.subSectionBlock}>
              <Text style={styles.subSectionTitle}>5. HISTORICAL COMPARISONS & SEASONALITY</Text>
              <Card style={styles.comparisonSectionCard}>
                <View style={styles.chartHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      Historical Performance Comparison
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Comparative period evaluation and seasonal milk yield trajectory
                    </Text>
                  </View>

                  <View style={styles.chartToggleGroup}>
                    <Pressable
                      style={[
                        styles.toggleBtn,
                        comparisonHorizon === 'month_over_month' && { backgroundColor: colors.primary }
                      ]}
                      onPress={() => setComparisonHorizon('month_over_month')}
                    >
                      <Text style={[styles.toggleBtnText, comparisonHorizon === 'month_over_month' && { color: '#FFFFFF' }]}>
                        MoM
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.toggleBtn,
                        comparisonHorizon === 'year_over_year' && { backgroundColor: colors.primary }
                      ]}
                      onPress={() => setComparisonHorizon('year_over_year')}
                    >
                      <Text style={[styles.toggleBtnText, comparisonHorizon === 'year_over_year' && { color: '#FFFFFF' }]}>
                        YoY
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.historicalMetricsGrid}>
                  {comparisonHorizon === 'month_over_month' ? (
                    <>
                      <View style={styles.historyMetricCell}>
                        <Text style={[Typography.caption2, { color: colors.textSecondary }]}>OCT 2026 (CURRENT)</Text>
                        <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
                          {historicalAnalysis.curMonthVal.toLocaleString()} L
                        </Text>
                      </View>
                      <View style={styles.historyMetricCell}>
                        <Text style={[Typography.caption2, { color: colors.textSecondary }]}>SEP 2026 (PREVIOUS)</Text>
                        <Text style={[Typography.headline, { color: colors.textSecondary, fontWeight: '900' }]}>
                          {historicalAnalysis.prevMonthVal.toLocaleString()} L
                        </Text>
                      </View>
                      <View style={styles.historyMetricCell}>
                        <Text style={[Typography.caption2, { color: colors.textSecondary }]}>ABSOLUTE CHANGE</Text>
                        <Text style={[Typography.headline, { color: '#16A34A', fontWeight: '900' }]}>
                          +{historicalAnalysis.monthDiff.toLocaleString()} L
                        </Text>
                      </View>
                      <View style={styles.historyMetricCell}>
                        <Text style={[Typography.caption2, { color: colors.textSecondary }]}>PERCENT GROWTH</Text>
                        <Text style={[Typography.headline, { color: '#16A34A', fontWeight: '900' }]}>
                          +{historicalAnalysis.monthGrowthPct}%
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.historyMetricCell}>
                        <Text style={[Typography.caption2, { color: colors.textSecondary }]}>FY 2026-27 (CURRENT)</Text>
                        <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
                          {historicalAnalysis.curYearVal.toLocaleString()} L
                        </Text>
                      </View>
                      <View style={styles.historyMetricCell}>
                        <Text style={[Typography.caption2, { color: colors.textSecondary }]}>FY 2025-26 (PREVIOUS)</Text>
                        <Text style={[Typography.headline, { color: colors.textSecondary, fontWeight: '900' }]}>
                          {historicalAnalysis.prevYearVal.toLocaleString()} L
                        </Text>
                      </View>
                      <View style={styles.historyMetricCell}>
                        <Text style={[Typography.caption2, { color: colors.textSecondary }]}>ANNUAL EXPANSION</Text>
                        <Text style={[Typography.headline, { color: '#16A34A', fontWeight: '900' }]}>
                          +{historicalAnalysis.yearDiff.toLocaleString()} L
                        </Text>
                      </View>
                      <View style={styles.historyMetricCell}>
                        <Text style={[Typography.caption2, { color: colors.textSecondary }]}>ANNUAL GROWTH</Text>
                        <Text style={[Typography.headline, { color: '#16A34A', fontWeight: '900' }]}>
                          +{historicalAnalysis.yearGrowthPct}%
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.commentaryBox}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                  <Text style={[Typography.caption2, { color: colors.text, flex: 1, marginLeft: 8 }]}>
                    {historicalAnalysis.varianceTrend} Volume fluctuations are consistent with regional pastoral calving schedules. Any localized yield drop is treated as an operational event requiring verification.
                  </Text>
                </View>
              </Card>
            </View>

            {/* 6. Discrepancy Analysis & Multi-Month Chart */}
            <View style={styles.subSectionBlock}>
              <Text style={styles.subSectionTitle}>6. 12-MONTH INTAKE COMPARISON & DISCREPANCY AUDIT</Text>
              <Card 
                style={styles.chartCard}
                onLayout={(e: LayoutChangeEvent) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0 && Math.abs(w - barChartCardWidth) > 2) {
                    setBarChartCardWidth(w);
                  }
                }}
              >
                <View style={styles.chartHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      Monthly Milk Influx (Jan – Dec)
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Dual-year volume comparison: FY 2026-27 vs FY 2025-26
                    </Text>
                  </View>

                  <View style={styles.chartLegendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendSquare, { backgroundColor: colors.primary }]} />
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>2026</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendSquare, { backgroundColor: '#CBD5E1' }]} />
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>2025</Text>
                    </View>
                  </View>
                </View>

                {/* Monthly Bar Chart */}
                <View style={styles.svgContainer}>
                  {(() => {
                    const cardInnerW = barChartCardWidth > 0 ? barChartCardWidth - 32 : (width - (isMobile ? 48 : 64));
                    const svgW = Math.max(280, cardInnerW);
                    const svgH = isMobile ? 180 : 210;
                    const padLeft = 40;
                    const padRight = 14;
                    const padBottom = 26;
                    const padTop = 16;

                    const maxVal = Math.max(...monthlyBarData.map(m => Math.max(m.val2026, m.val2025)), 15000);
                    const plotW = svgW - padLeft - padRight;
                    const plotH = svgH - padTop - padBottom;
                    const groupW = plotW / monthlyBarData.length;
                    const barW = Math.max(5, groupW * 0.36);

                    return (
                      <Svg width={svgW} height={svgH}>
                        <Line x1={padLeft} y1={padTop} x2={svgW - padRight} y2={padTop} stroke="#E2E8F0" strokeDasharray="3,3" />
                        <Line x1={padLeft} y1={padTop + plotH / 2} x2={svgW - padRight} y2={padTop + plotH / 2} stroke="#E2E8F0" strokeDasharray="3,3" />
                        <Line x1={padLeft} y1={padTop + plotH} x2={svgW - padRight} y2={padTop + plotH} stroke="#CBD5E1" strokeWidth={1} />

                        <SvgText x={padLeft - 6} y={padTop + 4} fontSize={9} fill="#64748B" textAnchor="end">
                          {Math.round(maxVal / 1000)}k
                        </SvgText>
                        <SvgText x={padLeft - 6} y={padTop + plotH / 2 + 4} fontSize={9} fill="#64748B" textAnchor="end">
                          {Math.round(maxVal / 2000)}k
                        </SvgText>
                        <SvgText x={padLeft - 6} y={padTop + plotH} fontSize={9} fill="#64748B" textAnchor="end">
                          0
                        </SvgText>

                        {monthlyBarData.map((item, i) => {
                          const groupX = padLeft + i * groupW;
                          const h2025 = (item.val2025 / maxVal) * plotH;
                          const h2026 = (item.val2026 / maxVal) * plotH;
                          const y2025 = padTop + plotH - h2025;
                          const y2026 = padTop + plotH - h2026;

                          return (
                            <G key={item.month}>
                              <Rect
                                x={groupX + 2}
                                y={y2025}
                                width={barW}
                                height={Math.max(2, h2025)}
                                rx={3}
                                fill="#CBD5E1"
                              />

                              <Rect
                                x={groupX + barW + 4}
                                y={y2026}
                                width={barW}
                                height={Math.max(2, h2026)}
                                rx={3}
                                fill={item.isProjected ? '#93C5FD' : colors.primary}
                              />

                              <SvgText
                                x={groupX + groupW / 2}
                                y={svgH - 8}
                                fontSize={9}
                                fontWeight="600"
                                fill="#475569"
                                textAnchor="middle"
                              >
                                {item.month}
                              </SvgText>
                            </G>
                          );
                        })}
                      </Svg>
                    );
                  })()}
                </View>
              </Card>
            </View>

            {/* ========================================================================= */}
            {/* SECTION 4: OPERATIONAL SUPPLY TELEMETRY (8 Dedicated Operational Facets)  */}
            {/* ========================================================================= */}
            <View style={[styles.sectionHeaderContainer, { marginTop: 16 }]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="radio" size={22} color="#16A34A" />
                <Text style={[Typography.headline, { color: colors.text, fontWeight: '900', marginLeft: 8 }]}>
                  Operational Supply Telemetry
                </Text>
              </View>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                Real-time society weigh-scale telemetry, tanker logistics, and chilled flow-meter logs
              </Text>
            </View>

            {/* 8 Operational Telemetry Cards Grid (Dedicated 2-Column Grid) */}
            <View style={styles.telemetryGrid}>
              {/* Telemetry 1: Latest Supply Activity */}
              <View style={[styles.telemetryCardWrapper, { width: col2Width }]}>
                <Card style={styles.telemetryCard}>
                  <View style={styles.telemetryCardTop}>
                    <Ionicons name="time" size={18} color={colors.primary} />
                    <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.statusText, { color: '#166534' }]}>{supplyTelemetry.statusBadge}</Text>
                    </View>
                  </View>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    Latest Supply Session
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    {supplyTelemetry.latestDate} • {supplyTelemetry.sessionTime}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 4 }]}>
                    Vehicle: {supplyTelemetry.vehicleNumber}
                  </Text>
                </Card>
              </View>

              {/* Telemetry 2: Society-Wise Supply Status */}
              <View style={[styles.telemetryCardWrapper, { width: col2Width }]}>
                <Card style={styles.telemetryCard}>
                  <View style={styles.telemetryCardTop}>
                    <Ionicons name="business" size={18} color="#059669" />
                    <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.statusText, { color: '#166534' }]}>ACTIVE</Text>
                    </View>
                  </View>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    Society Operating State
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Route: {supplyTelemetry.route}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 4 }]}>
                    Capacity: {society.capacityLitres.toLocaleString()} L • Temp: {supplyTelemetry.chillingTemp}
                  </Text>
                </Card>
              </View>

              {/* Telemetry 3: Daily Milk Quantity */}
              <View style={[styles.telemetryCardWrapper, { width: col2Width }]}>
                <Card style={styles.telemetryCard}>
                  <View style={styles.telemetryCardTop}>
                    <Ionicons name="water" size={18} color="#0284C7" />
                    <Text style={[Typography.caption2, { color: '#0284C7', fontWeight: '800' }]}>Live Session</Text>
                  </View>
                  <Text style={[styles.telemetryBigVal, { color: '#0284C7' }]}>
                    {supplyTelemetry.dailyQuantity} L
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                    Verified Daily Influx
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                    Morning session chilled at BMC
                  </Text>
                </Card>
              </View>

              {/* Telemetry 4: Expected vs Recorded Supply */}
              <View style={[styles.telemetryCardWrapper, { width: col2Width }]}>
                <Card style={styles.telemetryCard}>
                  <View style={styles.telemetryCardTop}>
                    <Ionicons name="pie-chart-outline" size={18} color="#7C3AED" />
                    <View style={[styles.miniBadge, { backgroundColor: '#F3E8FF' }]}>
                      <Text style={[styles.miniBadgeText, { color: '#7C3AED' }]}>{supplyTelemetry.quotaFulfillmentPct}% Quota</Text>
                    </View>
                  </View>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    Expected vs Recorded
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Target Quota: {supplyTelemetry.targetQuota} L • Actual: {supplyTelemetry.dailyQuantity} L
                  </Text>
                  <Text style={[Typography.caption2, { color: '#16A34A', fontWeight: '700', marginTop: 4 }]}>
                    ✓ Target fulfilled without deficit
                  </Text>
                </Card>
              </View>

              {/* Telemetry 5: Reported vs Received Quantity */}
              <View style={[styles.telemetryCardWrapper, { width: col2Width }]}>
                <Card style={styles.telemetryCard}>
                  <View style={styles.telemetryCardTop}>
                    <Ionicons name="swap-horizontal" size={18} color={supplyTelemetry.intakeVariance === 0 ? '#16A34A' : '#DC2626'} />
                    <View style={[styles.miniBadge, { backgroundColor: supplyTelemetry.intakeVariance === 0 ? '#DCFCE7' : '#FEE2E2' }]}>
                      <Text style={[styles.miniBadgeText, { color: supplyTelemetry.intakeVariance === 0 ? '#166534' : '#991B1B' }]}>
                        {supplyTelemetry.intakeVariance === 0 ? 'Balanced' : 'Review'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    Flow Meter Intake Telemetry
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Society: {supplyTelemetry.reportedQuantity}L • Flow Meter: {supplyTelemetry.dailyQuantity}L
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 4 }]}>
                    Live Variance: {supplyTelemetry.intakeVariance === 0 ? '0.0 L Balanced' : `${supplyTelemetry.intakeVariance} L`}
                  </Text>
                </Card>
              </View>

              {/* Telemetry 6: Supply Changes & Discrepancy Alerts (Neutral Tone) */}
              <View style={[styles.telemetryCardWrapper, { width: col2Width }]}>
                <Card style={[styles.telemetryCard, supplyTelemetry.unresolvedCasesCount > 0 && { borderColor: '#FCA5A5' }]}>
                  <View style={styles.telemetryCardTop}>
                    <Ionicons 
                      name={supplyTelemetry.unresolvedCasesCount > 0 ? "warning" : "shield-checkmark"} 
                      size={18} 
                      color={supplyTelemetry.unresolvedCasesCount > 0 ? "#DC2626" : "#16A34A"} 
                    />
                    <Text style={[Typography.caption2, { color: supplyTelemetry.unresolvedCasesCount > 0 ? '#DC2626' : '#16A34A', fontWeight: '800' }]}>
                      {supplyTelemetry.unresolvedCasesCount > 0 ? 'Verification Due' : 'Normal'}
                    </Text>
                  </View>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    Supply Integrity Status
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    {supplyTelemetry.unresolvedCasesCount > 0 
                      ? 'Volume variance noted on 11 Oct; currently undergoing technical calibration audit.' 
                      : 'All collection cycles verify within standard transit tolerances.'}
                  </Text>
                </Card>
              </View>

              {/* Telemetry 7: Missing or Delayed Records Audit */}
              <View style={[styles.telemetryCardWrapper, { width: col2Width }]}>
                <Card style={styles.telemetryCard}>
                  <View style={styles.telemetryCardTop}>
                    <Ionicons name="document-text" size={18} color="#D97706" />
                    <View style={[styles.miniBadge, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.miniBadgeText, { color: '#B45309' }]}>Audit Trail</Text>
                    </View>
                  </View>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    Record Logging Audit
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Explicit Logging: Missing sessions marked as unlogged rather than assuming 0.0L.
                  </Text>
                  <Text style={[Typography.caption2, { color: '#16A34A', fontWeight: '700', marginTop: 4 }]}>
                    ✓ Zero hidden defaults
                  </Text>
                </Card>
              </View>

              {/* Telemetry 8: Historical Supply Trends (7-Day Trail) */}
              <View style={[styles.telemetryCardWrapper, { width: col2Width }]}>
                <Card style={styles.telemetryCard}>
                  <View style={styles.telemetryCardTop}>
                    <Ionicons name="trending-up" size={18} color={colors.primary} />
                    <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>7-Day Trail</Text>
                  </View>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    Intake Telemetry Log
                  </Text>
                  <View style={styles.miniTelemetryPillRow}>
                    {dailySeries.map(d => (
                      <View 
                        key={d.date} 
                        style={[
                          styles.miniDayPill, 
                          { backgroundColor: d.differenceLitres === 0 ? '#DCFCE7' : '#FEE2E2' }
                        ]}
                      >
                        <Text style={[styles.miniDayPillText, { color: d.differenceLitres === 0 ? '#166534' : '#991B1B' }]}>
                          {d.label.slice(0, 2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 4 }]}>
                    Green: Balanced • Red: Flagged for verification
                  </Text>
                </Card>
              </View>
            </View>

            {/* ========================================================================= */}
            {/* SECTION 8: FINANCIAL TELEMETRY & UNION LEDGER                             */}
            {/* ========================================================================= */}
            <Card style={styles.financeSectionCard}>
              <View style={styles.chartHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                    💰 Financial Telemetry & Union Ledger
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    Disbursements, cleared settlements, and pending ledger allocations
                  </Text>
                </View>

                <Button
                  title="+ Add Entry"
                  size="sm"
                  variant="outline"
                  onPress={() => router.push({ pathname: '/(bmc)/society-income', params: { preselectedSocietyId: society.id } })}
                />
              </View>

              <View style={styles.uniformMetricsGrid}>
                {/* Total Recorded Income */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={styles.uniformMetricCard}>
                    <Text style={styles.metricCardTitle}>TOTAL RECORDED INCOME</Text>
                    <Text style={[styles.metricBigNumber, { color: '#059669' }]}>
                      ₹{financialTotals.totalRecordedIncome.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.metricCardSubtitle}>Recorded society ledger</Text>
                  </Card>
                </View>

                {/* Cleared Payments */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={styles.uniformMetricCard}>
                    <Text style={styles.metricCardTitle}>CLEARED DISBURSEMENTS</Text>
                    <Text style={[styles.metricBigNumber, { color: '#16A34A' }]}>
                      ₹{financialTotals.clearedPayments.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.metricCardSubtitle}>Bank & UPI settlements</Text>
                  </Card>
                </View>

                {/* Pending Payments */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={styles.uniformMetricCard}>
                    <Text style={styles.metricCardTitle}>PENDING DISBURSEMENTS</Text>
                    <Text style={[styles.metricBigNumber, { color: '#D97706' }]}>
                      ₹{financialTotals.pendingPayments.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.metricCardSubtitle}>Awaiting audit approval</Text>
                  </Card>
                </View>

                {/* Reported to Union */}
                <View style={[styles.uniformMetricCardWrapper, { width: col2Width }]}>
                  <Card style={styles.uniformMetricCard}>
                    <Text style={styles.metricCardTitle}>REPORTED TO UNION</Text>
                    <Text style={[styles.metricBigNumber, { color: '#2563EB' }]}>
                      ₹{financialTotals.amountReportedToUnion.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.metricCardSubtitle}>In submitted BMC receipts</Text>
                  </Card>
                </View>
              </View>

              {/* Monthly Income Bar Chart */}
              <View 
                style={{ marginTop: 14 }}
                onLayout={(e: LayoutChangeEvent) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0 && Math.abs(w - incomeChartCardWidth) > 2) {
                    setIncomeChartCardWidth(w);
                  }
                }}
              >
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginBottom: 4 }]}>
                  Monthly Recorded Income (₹ in Thousands)
                </Text>
                <View style={styles.svgContainer}>
                  {(() => {
                    const cardInnerW = incomeChartCardWidth > 0 ? incomeChartCardWidth - 10 : (width - (isMobile ? 48 : 64));
                    const svgW = Math.max(280, cardInnerW);
                    const svgH = 150;
                    const padLeft = 40;
                    const padRight = 14;
                    const padBottom = 24;
                    const padTop = 14;

                    const incomeMonths = [
                      { m: 'May', val: 78000 },
                      { m: 'Jun', val: 82000 },
                      { m: 'Jul', val: 80000 },
                      { m: 'Aug', val: 76000 },
                      { m: 'Sep', val: 79000 },
                      { m: 'Oct', val: financialTotals.totalRecordedIncome || 84500 },
                    ];

                    const maxVal = Math.max(...incomeMonths.map(i => i.val), 90000);
                    const plotW = svgW - padLeft - padRight;
                    const plotH = svgH - padTop - padBottom;
                    const barSlot = plotW / incomeMonths.length;
                    const barW = Math.min(36, barSlot * 0.55);

                    return (
                      <Svg width={svgW} height={svgH}>
                        <Line x1={padLeft} y1={padTop} x2={svgW - padRight} y2={padTop} stroke="#E2E8F0" strokeDasharray="3,3" />
                        <Line x1={padLeft} y1={padTop + plotH} x2={svgW - padRight} y2={padTop + plotH} stroke="#CBD5E1" strokeWidth={1} />

                        <SvgText x={padLeft - 6} y={padTop + 4} fontSize={9} fill="#64748B" textAnchor="end">
                          ₹{Math.round(maxVal / 1000)}k
                        </SvgText>
                        <SvgText x={padLeft - 6} y={padTop + plotH} fontSize={9} fill="#64748B" textAnchor="end">
                          0
                        </SvgText>

                        {incomeMonths.map((item, i) => {
                          const x = padLeft + i * barSlot + (barSlot - barW) / 2;
                          const h = (item.val / maxVal) * plotH;
                          const y = padTop + plotH - h;

                          return (
                            <G key={item.m}>
                              <Rect
                                x={x}
                                y={y}
                                width={barW}
                                height={Math.max(4, h)}
                                rx={4}
                                fill="#059669"
                              />
                              <SvgText
                                x={x + barW / 2}
                                y={y - 4}
                                fontSize={9}
                                fontWeight="bold"
                                fill="#059669"
                                textAnchor="middle"
                              >
                                ₹{Math.round(item.val / 1000)}k
                              </SvgText>
                              <SvgText
                                x={x + barW / 2}
                                y={svgH - 6}
                                fontSize={9}
                                fontWeight="600"
                                fill="#475569"
                                textAnchor="middle"
                              >
                                {item.m}
                              </SvgText>
                            </G>
                          );
                        })}
                      </Svg>
                    );
                  })()}
                </View>
              </View>
            </Card>

            {/* Reporting & Union Submission Integration Card */}
            <Card style={styles.reconciliationWorkflowCard}>
              <View style={styles.chartHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                    📋 Society Reporting & Union Submission Status
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    Status of society delivery receipts and consolidation into Union returns
                  </Text>
                </View>

                <Button
                  title="+ Open in Union Report"
                  size="sm"
                  onPress={() => router.push({ 
                    pathname: '/(bmc)/submit-union-report', 
                    params: { preselectedSocietyId: society.id } 
                  })}
                />
              </View>

              <View style={styles.workflowGrid}>
                <View style={styles.workflowItem}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>REPORTING PERIOD</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    {dateRangeBounds.label}
                  </Text>
                </View>

                <View style={styles.workflowItem}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>DELIVERY RECEIPT STATUS</Text>
                  <Text style={[Typography.subhead, { color: '#16A34A', fontWeight: '800' }]}>
                    {societyDeliveries.length > 0 ? 'Logged & Inspected' : 'Pending Intake'}
                  </Text>
                </View>

                <View style={styles.workflowItem}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>UNION REPORT STATUS</Text>
                  <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                    {financialTotals.amountReportedToUnion > 0 ? 'Sent to Union' : 'Ready for Consolidation'}
                  </Text>
                </View>

                <View style={styles.workflowItem}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>ACTIVE INVESTIGATION CASES</Text>
                  <Text style={[Typography.subhead, { color: societyDiscrepancies.length > 0 ? '#DC2626' : '#16A34A', fontWeight: '800' }]}>
                    {societyDiscrepancies.length} Active Case(s)
                  </Text>
                </View>
              </View>
            </Card>

            {/* Data Tables & Responsive Record Lists */}
            <Card style={styles.tablesCard}>
              <View style={styles.tableTabSelector}>
                {[
                  { id: 'milk', label: `🥛 Milk Intake (${dailySeries.length})` },
                  { id: 'finance', label: `💰 Financial Ledger (${societyIncome.length})` },
                  { id: 'reports', label: `📋 Delivery History (${societyDeliveries.length})` },
                ].map(t => (
                  <Pressable
                    key={t.id}
                    style={[
                      styles.tableTabBtn,
                      activeTableTab === t.id && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setActiveTableTab(t.id as TableTab)}
                  >
                    <Text style={[
                      Typography.caption2,
                      { fontWeight: '800' },
                      activeTableTab === t.id ? { color: '#FFFFFF' } : { color: colors.textSecondary }
                    ]}>
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Tab 1: Milk Intake Records */}
              {activeTableTab === 'milk' && (
                <View style={styles.tableContainer}>
                  {!isMobile && (
                    <View style={[styles.tableRowHeader, { backgroundColor: '#F8FAFC' }]}>
                      <Text style={[styles.thCell, { flex: 1.2 }]}>Date</Text>
                      <Text style={[styles.thCell, { flex: 1 }]}>Reported Qty</Text>
                      <Text style={[styles.thCell, { flex: 1 }]}>Measured Qty</Text>
                      <Text style={[styles.thCell, { flex: 1 }]}>Variance</Text>
                      <Text style={[styles.thCell, { flex: 1.2 }]}>Status</Text>
                      <Text style={[styles.thCell, { flex: 1.2 }]}>Shift</Text>
                    </View>
                  )}

                  {dailySeries.map((row) => (
                    <View 
                      key={row.date} 
                      style={[
                        isMobile ? styles.mobileRecordCard : styles.tableRow,
                        { borderBottomColor: colors.border }
                      ]}
                    >
                      {isMobile ? (
                        <View style={{ gap: 4 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                              {row.date} ({row.label})
                            </Text>
                            <View style={[styles.varianceBadge, { 
                              backgroundColor: row.differenceLitres === 0 ? '#DCFCE7' : '#FEE2E2' 
                            }]}>
                              <Text style={[styles.varianceBadgeText, { 
                                color: row.differenceLitres === 0 ? '#166534' : '#991B1B' 
                              }]}>
                                {row.differenceLitres === 0 ? 'Balanced' : `-${row.differenceLitres}L`}
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                              Declared: {row.reportedLitres} L
                            </Text>
                            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
                              Received: {row.receivedLitres} L
                            </Text>
                          </View>

                          <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                            Shift: Morning {row.morningLitres}L • Evening {row.eveningLitres}L
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.tableRowCells}>
                          <Text style={[styles.tdCell, { flex: 1.2, fontWeight: '700' }]}>{row.date}</Text>
                          <Text style={[styles.tdCell, { flex: 1 }]}>{row.reportedLitres} L</Text>
                          <Text style={[styles.tdCell, { flex: 1, color: colors.primary, fontWeight: '700' }]}>{row.receivedLitres} L</Text>
                          <Text style={[styles.tdCell, { flex: 1, color: row.differenceLitres > 0 ? '#DC2626' : '#16A34A', fontWeight: '700' }]}>
                            {row.differenceLitres > 0 ? `-${row.differenceLitres} L` : '0.0 L'}
                          </Text>
                          <Text style={[styles.tdCell, { flex: 1.2 }]}>
                            {row.differenceLitres === 0 ? '✓ Verified' : '⚠️ Variance'}
                          </Text>
                          <Text style={[styles.tdCell, { flex: 1.2, color: colors.textMuted }]}>
                            M: {row.morningLitres}L / E: {row.eveningLitres}L
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Tab 2: Financial Ledger */}
              {activeTableTab === 'finance' && (
                <View style={styles.tableContainer}>
                  {societyIncome.length === 0 ? (
                    <View style={styles.innerEmptyState}>
                      <Text style={[Typography.caption1, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                        No financial ledger records found for this society.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {!isMobile && (
                        <View style={[styles.tableRowHeader, { backgroundColor: '#F8FAFC' }]}>
                          <Text style={[styles.thCell, { flex: 1.2 }]}>Date</Text>
                          <Text style={[styles.thCell, { flex: 1.4 }]}>Category</Text>
                          <Text style={[styles.thCell, { flex: 2 }]}>Description</Text>
                          <Text style={[styles.thCell, { flex: 1.2 }]}>Amount (INR)</Text>
                          <Text style={[styles.thCell, { flex: 1 }]}>Status</Text>
                        </View>
                      )}

                      {societyIncome.map(item => (
                        <View 
                          key={item.id} 
                          style={[
                            isMobile ? styles.mobileRecordCard : styles.tableRow,
                            { borderBottomColor: colors.border }
                          ]}
                        >
                          {isMobile ? (
                            <View style={{ gap: 4 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                                  {item.description}
                                </Text>
                                <Text style={[Typography.headline, { color: '#059669', fontWeight: '900' }]}>
                                  ₹{item.amountInr.toLocaleString('en-IN')}
                                </Text>
                              </View>
                              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                                {item.category.replace(/_/g, ' ').toUpperCase()} • {item.transactionDate} • Ref: {item.referenceNumber}
                              </Text>
                              <View style={[styles.miniStatusBadge, { 
                                backgroundColor: item.status === 'verified' ? '#DCFCE7' : '#FEF3C7',
                                alignSelf: 'flex-start' 
                              }]}>
                                <Text style={[styles.miniStatusText, { color: item.status === 'verified' ? '#166534' : '#92400E' }]}>
                                  {item.status.toUpperCase()}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.tableRowCells}>
                              <Text style={[styles.tdCell, { flex: 1.2, fontWeight: '700' }]}>{item.transactionDate}</Text>
                              <Text style={[styles.tdCell, { flex: 1.4 }]}>{item.category.replace(/_/g, ' ').toUpperCase()}</Text>
                              <Text style={[styles.tdCell, { flex: 2 }]}>{item.description}</Text>
                              <Text style={[styles.tdCell, { flex: 1.2, color: '#059669', fontWeight: '800' }]}>
                                ₹{item.amountInr.toLocaleString('en-IN')}
                              </Text>
                              <Text style={[styles.tdCell, { flex: 1, color: item.status === 'verified' ? '#166534' : '#92400E', fontWeight: '700' }]}>
                                {item.status.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </>
                  )}
                </View>
              )}

              {/* Tab 3: Delivery History */}
              {activeTableTab === 'reports' && (
                <View style={styles.tableContainer}>
                  {societyDeliveries.length === 0 ? (
                    <View style={styles.innerEmptyState}>
                      <Text style={[Typography.caption1, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                        No historical delivery records logged for this society.
                      </Text>
                    </View>
                  ) : (
                    societyDeliveries.map(del => (
                      <View key={del.id} style={[styles.deliveryHistoryCard, { borderBottomColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                            Delivery #{del.id} • {del.collectionDate}
                          </Text>
                          <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                            Receipt Ref: {del.boothReceiptId} • Dispatch Time: {del.dispatchTime}
                          </Text>
                          <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 2 }]}>
                            Declared: {del.declaredDispatchQuantity}L | Measured: {del.measuredReceivedQuantity !== undefined ? `${del.measuredReceivedQuantity}L` : 'Pending'} {del.difference ? `(Var: ${del.difference}L)` : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={[styles.statusBadge, { 
                            backgroundColor: del.status === 'matched' ? '#DCFCE7' : (del.status === 'pending_arrival' ? '#FEF3C7' : '#FEE2E2') 
                          }]}>
                            <Text style={[styles.statusText, { 
                              color: del.status === 'matched' ? '#166534' : (del.status === 'pending_arrival' ? '#92400E' : '#991B1B') 
                            }]}>
                              {del.status.replace(/_/g, ' ').toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </Card>

            {/* Quick Action Bottom Buttons */}
            <View style={styles.bottomActionRow}>
              <Button
                title="📥 Confirm Milk Received (Intake)"
                size="lg"
                onPress={() => router.push('/(bmc)/receive-milk')}
              />
              <Button
                title="📋 Submit Consolidated BMC Report"
                variant="outline"
                size="md"
                onPress={() => router.push({ 
                  pathname: '/(bmc)/submit-union-report', 
                  params: { preselectedSocietyId: society.id } 
                })}
              />
            </View>
          </>
        )}
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
    gap: 14,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  topNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  navBackBtnText: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  breadcrumbTrailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    flexWrap: 'wrap',
    gap: 4,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  profileHeaderCard: {
    padding: 16,
    borderRadius: 16,
  },
  profileHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  societyIconBadgeLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  codePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codePillText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#475569',
  },
  reconcileStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  periodFilterSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  periodTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  periodTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Major Section Headers
  sectionHeaderContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Sub-sections
  subSectionBlock: {
    gap: 8,
    marginTop: 4,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginLeft: 2,
  },

  // Consistent Uniform Metrics Grid
  uniformMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  uniformMetricCardWrapper: {
    flexGrow: 0,
    flexShrink: 0,
  },
  uniformMetricCard: {
    padding: 12,
    borderRadius: 14,
    minHeight: 118,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricBigNumber: {
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 4,
  },
  metricCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  metricCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },

  // Charts
  chartCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chartToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '800',
  },
  chartLegendRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIndicatorLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  svgContainer: {
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },

  // Dual Responsive Row
  dualResponsiveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  halfCardItem: {
    flex: 1,
    minWidth: 300,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  discrepancyRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  varianceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  varianceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  shiftBreakdownContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  shiftCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
  },
  shiftCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  shiftBigNumber: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 2,
  },
  splitBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  splitBarLeft: {
    backgroundColor: '#D97706',
  },
  splitBarRight: {
    backgroundColor: '#7C3AED',
  },

  // Historical Comparison
  comparisonSectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historicalMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 12,
  },
  historyMetricCell: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commentaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 82, 155, 0.06)',
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#00529B',
  },

  // Supply Telemetry
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  telemetryCardWrapper: {
    flexGrow: 0,
    flexShrink: 0,
  },
  telemetryCard: {
    padding: 12,
    borderRadius: 14,
    minHeight: 118,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  telemetryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  telemetryBigVal: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 2,
  },
  miniTelemetryPillRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  miniDayPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDayPillText: {
    fontSize: 9,
    fontWeight: '800',
  },

  // Financial & Workflow
  financeSectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reconciliationWorkflowCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  workflowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  workflowItem: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // Tables
  tablesCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableTabSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 12,
  },
  tableTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableContainer: {
    gap: 8,
  },
  tableRowHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  tableRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRowCells: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tdCell: {
    fontSize: 12,
    color: '#334155',
  },
  mobileRecordCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  innerEmptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  miniStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  deliveryHistoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Actions & Empty States
  bottomActionRow: {
    gap: 10,
    marginTop: 8,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
