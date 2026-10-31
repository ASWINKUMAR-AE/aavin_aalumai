import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  useWindowDimensions,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Svg, {
  Rect,
  Text as SvgText,
  Line,
  Path,
  Circle,
  G,
  ClipPath,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../constants/Colors';
import { UnionDesktopHome } from '../../components/union/desktop/UnionDesktopHome';

import { useIsDesktop } from '../../hooks/useIsDesktop';

export default function UnionDashboard() {
  const { user } = useAuth();
  const {
    union,
    bmcs,
    booths,
    bmcReceipts,
    discrepancyCases,
    bmcDeliveries,
    farmers,
    cows,
    getUnionStats,
    addInvestigationNote,
    reviewBmcReceipt,
  } = useAavinStore();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();

  // Responsive breakpoints
  const isDesktop = useIsDesktop();
  const isTablet = !isDesktop && width >= 700 && width < 1060;
  const isMobile = !isDesktop && width < 700;

  const styles = useMemo(() => getStyles(colors, isDark, isMobile), [colors, isDark, isMobile]);
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(2); // Default to Wed (middle)
  const [activeTabFilter, setActiveTabFilter] = useState<'Overview' | 'Booths & Low Yield' | 'MCP Chilling' | 'Herd & Cows' | 'Payments'>('Overview');
  const [statusMode, setStatusMode] = useState<'sum' | 'percent'>('sum');
  const [trendRange, setTrendRange] = useState<'Daily' | 'Weekly'>('Daily');

  // Directive Modal state (Input Fields & Actions)
  const [showDirectiveModal, setShowDirectiveModal] = useState(false);
  const [targetBmcId, setTargetBmcId] = useState(bmcs[0]?.id || 'bmc-1');
  const [directiveCategory, setDirectiveCategory] = useState<'Low Yield Inquiry' | 'Transit Shrinkage' | 'Quality Audit' | 'Temperature Breach'>('Low Yield Inquiry');
  const [directivePriority, setDirectivePriority] = useState<'Normal' | 'High' | 'Critical GM Order'>('High');
  const [directiveText, setDirectiveText] = useState('');

  // Quick Sign-Off Modal state
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [signOffNotes, setSignOffNotes] = useState('');

  const stats = getUnionStats();
  const netTransitDiscrepancy = Math.max(0, stats.totalBoothDispatched - stats.totalBmcReceived);
  const retentionPercent =
    stats.totalBoothDispatched > 0
      ? Math.min(100, Math.max(0, (stats.totalBmcReceived / stats.totalBoothDispatched) * 100))
      : 100;
  const transitLossPercent = Math.max(0, 100 - retentionPercent);

  // Financial & Today's Income Analysis
  const todayLitres = stats.totalBmcReceived > 0 ? stats.totalBmcReceived : 825.0;
  const procurementRatePerLitre = 40.5; // Average Aavin procurement rate ₹/Litre based on 4.35% Fat & 8.52% SNF
  const todayIncomeRevenue = todayLitres * procurementRatePerLitre;
  const farmerPayoutShare = todayIncomeRevenue * 0.85; // 85% directly to farmers via DBT
  const logisticsShare = todayIncomeRevenue * 0.10; // 10% tanker logistics
  const societyIncentiveShare = todayIncomeRevenue * 0.05; // 5% society handling commission

  // Low-Yielding Booths Analysis compared with Previous Month
  const boothComparisons = [
    {
      id: 'BOOTH003',
      code: 'AAVIN-CC-MDU-03',
      name: 'Vadipatti Milk Collection Booth',
      operator: 'K. Balu',
      phone: '9842000012',
      assignedBmc: 'Vadipatti Bulk Milk Cooler',
      currentMonthLitres: 310.0,
      prevMonthLitres: 440.0,
      changePercent: -29.5,
      isLowest: true,
      reason: 'Lowest volume in district • 6 cows in dry lactation period',
    },
    {
      id: 'BOOTH002',
      code: 'AAVIN-CC-MDU-02',
      name: 'Navinipatti Village Collection Booth #2',
      operator: 'S. Muthu',
      phone: '9842000011',
      assignedBmc: 'Madurai East BMC',
      currentMonthLitres: 680.0,
      prevMonthLitres: 790.0,
      changePercent: -13.9,
      isLowest: false,
      reason: 'Seasonal drop in evening yield • Prompt payout needed',
    },
    {
      id: 'BOOTH001',
      code: 'AAVIN-CC-MDU-01',
      name: 'Melur Primary Milk Producers Co-op',
      operator: 'P. Kannan',
      phone: '9842000005',
      assignedBmc: 'Madurai East BMC',
      currentMonthLitres: 1280.0,
      prevMonthLitres: 1150.0,
      changePercent: 11.3,
      isLowest: false,
      reason: 'Top producer • High crossbred yield & 100% farmer attendance',
    },
  ];

  const lowestBooth = boothComparisons.find(b => b.isLowest) || boothComparisons[0];

  // Cows under quarantine / withdrawal
  const quarantineCowsCount = cows.filter(c => c.activeWithdrawal?.hasActiveWithdrawal).length;

  // 5 Days for Productivity Trend matching reference Mon..Fri with real milk inflow data
  const daysData = [
    { day: 'Mon', activeTime: '738.5 L', pauseTime: '₹29.9k Income', inflow: 738.5, loss: 1.5, fat: 4.3, snf: 8.5, blueY: 52, pinkY: 88 },
    { day: 'Tue', activeTime: '765.0 L', pauseTime: '₹30.9k Income', inflow: 765.0, loss: 0.0, fat: 4.4, snf: 8.5, blueY: 34, pinkY: 92 },
    { day: 'Wed', activeTime: `${todayLitres.toFixed(0)} L Inflow`, pauseTime: `₹${(todayIncomeRevenue / 1000).toFixed(1)}k Income`, inflow: todayLitres, loss: netTransitDiscrepancy, fat: 4.4, snf: 8.6, blueY: 38, pinkY: 80 },
    { day: 'Thu', activeTime: '754.0 L', pauseTime: '₹30.5k Income', inflow: 754.0, loss: 1.0, fat: 4.2, snf: 8.6, blueY: 60, pinkY: 72 },
    { day: 'Fri', activeTime: '808.0 L', pauseTime: '₹32.7k Income', inflow: 808.0, loss: 2.0, fat: 4.3, snf: 8.5, blueY: 46, pinkY: 76 },
  ];

  const currentTrendPoint = daysData[selectedDayIdx] || daysData[2];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  // Dispatch Directive Action Handler
  const handleDispatchDirective = () => {
    if (!directiveText.trim()) {
      Alert.alert('Directive Required', 'Please enter specific audit instructions or investigation directives.');
      return;
    }

    const targetBmc = bmcs.find(b => b.id === targetBmcId) || bmcs[0];
    const relatedCase = discrepancyCases.find(c => c.bmcId === targetBmcId && c.status !== 'resolved');

    if (relatedCase) {
      addInvestigationNote(
        relatedCase.id,
        `[UNION ${directivePriority.toUpperCase()} DIRECTIVE • ${directiveCategory}]: ${directiveText.trim()}`,
        user?.fullName || 'Dr. S. Sundaram (General Manager)',
        'Union Executive Order'
      );
    }

    Alert.alert(
      'Directive Dispatched',
      `Executive Directive issued to ${targetBmc?.name || 'BMC'}.\n\nCategory: ${directiveCategory}\nPriority: ${directivePriority}\nAuthorized by: ${user?.fullName || 'General Manager'}`
    );

    setDirectiveText('');
    setShowDirectiveModal(false);
  };

  // Quick GM Sign-off Action Handler
  const handleQuickSignOff = () => {
    if (!selectedReceiptId) return;
    try {
      reviewBmcReceipt(
        selectedReceiptId,
        signOffNotes.trim() || 'Approved and audited by Union General Manager.',
        user?.fullName || 'Dr. S. Sundaram (General Manager)'
      );
      Alert.alert('Sign-Off Recorded', `Receipt #${selectedReceiptId} successfully signed off and ledger reconciled.`);
      setShowSignOffModal(false);
      setSignOffNotes('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not sign off receipt.');
    }
  };

  // Render Diagonal Striped Rect for Progress Capsule
  const renderHatchPattern = (
    id: string,
    widthVal: number,
    heightVal: number,
    rxVal: number,
    color: string,
    bgColor: string,
    lineGap: number = 7
  ) => {
    const lines = [];
    const span = widthVal + heightVal;
    for (let x = -heightVal; x <= span; x += lineGap) {
      lines.push(
        <Line
          key={x}
          x1={x}
          y1={heightVal}
          x2={x + heightVal}
          y2={0}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      );
    }

    return (
      <G>
        <ClipPath id={id}>
          <Rect x={0} y={0} width={widthVal} height={heightVal} rx={rxVal} />
        </ClipPath>
        <G clipPath={`url(#${id})`}>
          <Rect x={0} y={0} width={widthVal} height={heightVal} fill={bgColor} rx={rxVal} />
          {lines}
        </G>
      </G>
    );
  };

  const totalDeliveries = bmcDeliveries.length > 0 ? bmcDeliveries.length : 12;
  const verifiedDeliveries = Math.max(0, totalDeliveries - stats.activeDiscrepanciesCount);

  if (isDesktop) {
    return (
      <View style={styles.outerContainer}>
        <DemoHeader
          title="Aavin Union Madurai"
          subtitle="Executive Control Room • Madurai District"
        />
        <UnionDesktopHome onIssueDirective={() => setShowDirectiveModal(true)} />
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      {/* Retain DemoHeader (Layout Header is completely preserved) */}
      <DemoHeader
        title="Aavin Union Madurai"
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.desktopScrollContent,
          isTablet && styles.tabletScrollContent,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainDashboardCanvas, isDesktop && styles.desktopDashboardCanvas]}>

          {/* TOP SECTION: Sub-header with Title, Nav Filter Tabs & "+ New Directive" CTA */}
          <View style={[styles.sectionTitleRow, isMobile && styles.mobileSectionTitleRow]}>
            <View style={styles.titleTextContainer}>
              <Text style={styles.dashboardMainTitle}>Union Operations & Analytics</Text>
              <Text style={styles.dashboardSubtitle}>
                Madurai Co-operative Milk Producers' Union • Real-time Procurement Income & Herd Audit
              </Text>
            </View>

            <Pressable
              style={[styles.newTaskBtn, isMobile && styles.mobileNewTaskBtn]}
              onPress={() => setShowDirectiveModal(true)}
            >
              <Ionicons name="add" size={17} color={isDark ? '#09121E' : '#FFFFFF'} />
              <Text style={styles.newTaskBtnText}>New Directive</Text>
            </Pressable>
          </View>

          {/* URGENT EXECUTIVE AUDIT BANNER */}
          {(stats.activeDiscrepanciesCount > 0 || stats.pendingReceiptsCount > 0) && (
            <View style={[styles.alertNoticeBanner, isMobile && styles.mobileAlertNoticeBanner]}>
              <View style={styles.alertNoticeLeft}>
                <View style={styles.alertNoticeIconBox}>
                  <Ionicons name="warning-outline" size={18} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertNoticeTitle}>
                    EXECUTIVE AUDIT REQUIRED: {stats.activeDiscrepanciesCount} Discrepancy Case(s)
                  </Text>
                  <Text style={styles.alertNoticeDesc}>
                    {stats.pendingReceiptsCount} BMC daily receipt(s) awaiting GM sign-off • Net shrinkage: {netTransitDiscrepancy.toFixed(1)} L.
                  </Text>
                </View>
              </View>

              <View style={[styles.alertBannerButtonsRow, isMobile && styles.mobileAlertBannerButtonsRow]}>
                {stats.pendingReceiptsCount > 0 && (
                  <Pressable
                    style={styles.signOffBtnMini}
                    onPress={() => {
                      const firstPending = bmcReceipts.find(r => r.status === 'sent_to_union');
                      if (firstPending) {
                        setSelectedReceiptId(firstPending.id);
                        setShowSignOffModal(true);
                      } else {
                        router.push('/(union)/receipt-review' as any);
                      }
                    }}
                  >
                    <Ionicons name="checkmark-done" size={13} color="#15803D" />
                    <Text style={styles.signOffBtnMiniText}>Sign-Off</Text>
                  </Pressable>
                )}

                <Pressable
                  style={styles.alertNoticeActionBtn}
                  onPress={() => router.push('/(union)/discrepancies' as any)}
                >
                  <Text style={styles.alertNoticeActionText}>Audit Cases</Text>
                  <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* =========================================================================
              ROW 1: THREE COGNIFY METRIC CARDS (Kept in a Single Row on Mobile!)
              Card 1: Active Societies | Card 2: Today's Milk & Revenue | Card 3: Active Discrepancies
             ========================================================================= */}
          <View style={[styles.topCardsGrid, isDesktop && styles.desktopTopCardsGrid, isTablet && styles.tabletTopCardsGrid]}>

            {/* CARD 1: GREEN - ACTIVE SOCIETIES (DCS) */}
            <View style={[styles.cognifyCard, styles.kpiCardItem, isDesktop && styles.desktopKpiCardItem]}>
              <View style={styles.cardTopHeaderRow}>
                <View style={[styles.kpiIconBadge, isDesktop && styles.desktopKpiIconBadge, { backgroundColor: '#22C55E' }]}>
                  <Ionicons name="storefront" size={isDesktop ? 20 : 16} color="#FFFFFF" />
                </View>
                <Pressable
                  style={[styles.arrowCircleBtn, isDesktop && styles.desktopArrowCircleBtn]}
                  onPress={() => router.push('/(union)/bmc-monitoring' as any)}
                >
                  <Ionicons name="arrow-up" size={isDesktop ? 17 : 13} color={isDark ? colors.textSecondary : '#475569'} style={{ transform: [{ rotate: '45deg' }] }} />
                </Pressable>
              </View>

              <Text style={styles.cardKpiLabel} numberOfLines={1}>Active Societies</Text>

              <View style={styles.statValueWithTrendRow}>
                <Text style={[styles.cardBigNumber, isDesktop && styles.desktopCardBigNumber]}>
                  {booths.length > 0 ? booths.length : 24}
                </Text>
                <View style={styles.trendPillUp}>
                  <Ionicons name="arrow-up" size={isDesktop ? 13 : 10} color="#16A34A" />
                  <Text style={[styles.trendTextUp, { color: '#16A34A' }]}>100%</Text>
                </View>
              </View>

              <View style={[styles.cardFooterRow, isDesktop && styles.desktopCardFooterRow]}>
                <View style={styles.dynamicLabelRow}>
                  <Ionicons name="infinite-outline" size={isDesktop ? 15 : 12} color={colors.textMuted} />
                  <Text style={styles.dynamicLabelText} numberOfLines={1}>District Network</Text>
                </View>
                <View style={styles.periodPill}>
                  <Text style={styles.periodPillText}>Online</Text>
                </View>
              </View>
            </View>

            {/* CARD 2: BLUE - TODAY'S LITRES & PROCUREMENT INCOME */}
            <View style={[styles.cognifyCard, styles.kpiCardItem, isDesktop && styles.desktopKpiCardItem]}>
              <View style={styles.cardTopHeaderRow}>
                <View style={[styles.kpiIconBadge, isDesktop && styles.desktopKpiIconBadge, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="cash-outline" size={isDesktop ? 20 : 16} color="#FFFFFF" />
                </View>
                <Pressable
                  style={[styles.arrowCircleBtn, isDesktop && styles.desktopArrowCircleBtn]}
                  onPress={() => router.push('/(union)/receipt-review' as any)}
                >
                  <Ionicons name="arrow-up" size={isDesktop ? 17 : 13} color={isDark ? colors.textSecondary : '#475569'} style={{ transform: [{ rotate: '45deg' }] }} />
                </Pressable>
              </View>

              <Text style={styles.cardKpiLabel} numberOfLines={1}>Today's Value</Text>

              <View style={styles.statValueWithTrendRow}>
                <Text style={[styles.cardBigNumber, isDesktop && styles.desktopCardBigNumber]}>
                  ₹{(todayIncomeRevenue / 1000).toFixed(1)}k
                </Text>
                <View style={styles.trendPillUp}>
                  <Ionicons name="water" size={isDesktop ? 12 : 9} color="#10B981" />
                  <Text style={styles.trendTextUp}>{todayLitres.toFixed(0)}L</Text>
                </View>
              </View>

              <View style={[styles.cardFooterRow, isDesktop && styles.desktopCardFooterRow]}>
                <View style={styles.dynamicLabelRow}>
                  <Ionicons name="infinite-outline" size={isDesktop ? 15 : 12} color={colors.textMuted} />
                  <Text style={styles.dynamicLabelText} numberOfLines={1}>@₹{procurementRatePerLitre}/L</Text>
                </View>
                <View style={styles.periodPill}>
                  <Text style={styles.periodPillText}>Today</Text>
                </View>
              </View>
            </View>

            {/* CARD 3: PINK - ACTIVE DISCREPANCIES & LOW-YIELD ALERT */}
            <View style={[styles.cognifyCard, styles.kpiCardItem, isDesktop && styles.desktopKpiCardItem]}>
              <View style={styles.cardTopHeaderRow}>
                <View style={[styles.kpiIconBadge, isDesktop && styles.desktopKpiIconBadge, { backgroundColor: '#EC4899' }]}>
                  <Ionicons name="trending-down-outline" size={isDesktop ? 20 : 16} color="#FFFFFF" />
                </View>
                <Pressable
                  style={[styles.arrowCircleBtn, isDesktop && styles.desktopArrowCircleBtn]}
                  onPress={() => router.push('/(union)/discrepancies' as any)}
                >
                  <Ionicons name="arrow-up" size={isDesktop ? 17 : 13} color={isDark ? colors.textSecondary : '#475569'} style={{ transform: [{ rotate: '45deg' }] }} />
                </Pressable>
              </View>

              <Text style={styles.cardKpiLabel} numberOfLines={1}>Low-Yield Deficit</Text>

              <View style={styles.statValueWithTrendRow}>
                <Text style={[styles.cardBigNumber, isDesktop && styles.desktopCardBigNumber, { color: '#DC2626' }]}>
                  -29.5%
                </Text>
                <View style={[styles.trendPillDown, { backgroundColor: isDark ? '#3E1818' : '#FEE2E2' }]}>
                  <Ionicons name="alert-circle" size={isDesktop ? 12 : 9} color="#DC2626" />
                  <Text style={[styles.trendTextDown, { color: isDark ? '#FCA5A5' : '#DC2626' }]} numberOfLines={1}>
                    Deficit
                  </Text>
                </View>
              </View>

              <View style={[styles.cardFooterRow, isDesktop && styles.desktopCardFooterRow]}>
                <View style={styles.dynamicLabelRow}>
                  <Ionicons name="time-outline" size={isDesktop ? 15 : 12} color={colors.textMuted} />
                  <Text style={styles.dynamicLabelText} numberOfLines={1}>vs Prev Mo</Text>
                </View>
                <View style={[styles.periodPill, { backgroundColor: isDark ? '#3E1818' : '#FEE2E2' }]}>
                  <Text style={[styles.periodPillText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>Audit</Text>
                </View>
              </View>
            </View>

          </View>

          {/* =========================================================================
              NEW FEATURE 1: TODAY'S TOTAL LITRES & INCOME ANALYSIS (FINANCIAL SUMMARY)
             ========================================================================= */}
          <View style={[styles.cognifyCard, styles.incomeAnalyticsCard]}>
            {/* Header: Icon + Titles (aligned together) & Gross Procurement Value Badge */}
            <View style={[styles.incomeHeaderRow, isMobile && styles.mobileIncomeHeaderRow]}>
              <View style={styles.incomeHeaderLeftGroup}>
                <View style={[styles.incomeBadgeIcon, { backgroundColor: isDark ? '#143C22' : '#DCFCE7' }]}>
                  <Ionicons name="cash" size={20} color="#16A34A" />
                </View>
                <View style={styles.incomeHeaderTitleContainer}>
                  <Text style={styles.analyticsTitle}>Today's Milk Procurement & Income</Text>
                  <Text style={styles.analyticsSubtitle}>
                    Realized District Value based on {todayLitres.toFixed(1)} L Intake @ ₹{procurementRatePerLitre.toFixed(2)}/L Aavin Tariff
                  </Text>
                </View>
              </View>

              <View style={[styles.incomeStatBadge, isMobile && styles.mobileIncomeStatBadge]}>
                <View style={styles.incomeStatBadgeLabelCol}>
                  <Text style={styles.incomeStatBadgeSub}>Gross Procurement Value</Text>
                  <Text style={styles.incomeStatBadgeTariff}>Intake: {todayLitres.toFixed(0)} L @ ₹{procurementRatePerLitre.toFixed(1)}/L</Text>
                </View>
                <Text style={styles.incomeStatBadgeText}>₹{todayIncomeRevenue.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Income Distribution Breakdown (3 Balanced Columns / Stacked on Mobile) */}
            <View style={[styles.incomeBreakdownGrid, isMobile && styles.mobileIncomeBreakdownGrid]}>
              {/* Box 1: Farmer DBT Payout (85%) */}
              <View style={[styles.incomeBoxItem, isMobile && styles.mobileIncomeBoxItem, { backgroundColor: isDark ? '#0E2819' : '#F0FDF4', borderColor: isDark ? '#166534' : '#BBF7D0' }]}>
                <View style={styles.incomeBoxTopRow}>
                  <View style={[styles.incomeBoxIconBadge, { backgroundColor: isDark ? '#143C22' : '#DCFCE7' }]}>
                    <Ionicons name="people" size={18} color="#16A34A" />
                  </View>
                  <View style={[styles.incomeBoxTagBadge, { backgroundColor: isDark ? '#143C22' : '#DCFCE7' }]}>
                    <Text style={[styles.incomeBoxTagText, { color: isDark ? '#4ADE80' : '#15803D' }]}>85% Share</Text>
                  </View>
                </View>

                <View style={styles.incomeBoxBody}>
                  <Text style={styles.incomeBoxValue}>₹{farmerPayoutShare.toLocaleString('en-IN')}</Text>
                  <Text style={styles.incomeBoxLabel} numberOfLines={1}>Direct Farmer DBT Payout</Text>
                  <Text style={styles.incomeBoxSub} numberOfLines={1}>Direct credit to Canara / SBI accounts</Text>
                </View>
              </View>

              {/* Box 2: Tanker Logistics (10%) */}
              <View style={[styles.incomeBoxItem, isMobile && styles.mobileIncomeBoxItem, { backgroundColor: isDark ? '#0E2038' : '#EFF6FF', borderColor: isDark ? '#1E40AF' : '#BFDBFE' }]}>
                <View style={styles.incomeBoxTopRow}>
                  <View style={[styles.incomeBoxIconBadge, { backgroundColor: isDark ? '#132C4E' : '#DBEAFE' }]}>
                    <Ionicons name="bus" size={18} color="#2563EB" />
                  </View>
                  <View style={[styles.incomeBoxTagBadge, { backgroundColor: isDark ? '#132C4E' : '#DBEAFE' }]}>
                    <Text style={[styles.incomeBoxTagText, { color: isDark ? '#60A5FA' : '#1D4ED8' }]}>10% Share</Text>
                  </View>
                </View>

                <View style={styles.incomeBoxBody}>
                  <Text style={styles.incomeBoxValue}>₹{logisticsShare.toLocaleString('en-IN')}</Text>
                  <Text style={styles.incomeBoxLabel} numberOfLines={1}>Insulated Tanker Logistics</Text>
                  <Text style={styles.incomeBoxSub} numberOfLines={1}>Transit allowance & chill transport</Text>
                </View>
              </View>

              {/* Box 3: Society Handling Commission (5%) */}
              <View style={[styles.incomeBoxItem, isMobile && styles.mobileIncomeBoxItem, { backgroundColor: isDark ? '#231438' : '#FAF5FF', borderColor: isDark ? '#6B21A8' : '#E9D5FF' }]}>
                <View style={styles.incomeBoxTopRow}>
                  <View style={[styles.incomeBoxIconBadge, { backgroundColor: isDark ? '#331B50' : '#F3E8FF' }]}>
                    <Ionicons name="business" size={18} color="#9333EA" />
                  </View>
                  <View style={[styles.incomeBoxTagBadge, { backgroundColor: isDark ? '#331B50' : '#F3E8FF' }]}>
                    <Text style={[styles.incomeBoxTagText, { color: isDark ? '#C084FC' : '#7E22CE' }]}>5% Share</Text>
                  </View>
                </View>

                <View style={styles.incomeBoxBody}>
                  <Text style={styles.incomeBoxValue}>₹{societyIncentiveShare.toLocaleString('en-IN')}</Text>
                  <Text style={styles.incomeBoxLabel} numberOfLines={1}>DCS Handling Commission</Text>
                  <Text style={styles.incomeBoxSub} numberOfLines={1}>Booth operator testing allowance</Text>
                </View>
              </View>
            </View>
          </View>

          {/* =========================================================================
              NEW FEATURE 2: BOOTH LOW-YIELD COMPARATIVE ANALYSIS (VERSUS PREVIOUS MONTH)
             ========================================================================= */}
          <View style={[styles.cognifyCard, styles.lowYieldCard]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="trending-down" size={20} color="#DC2626" />
                  <Text style={styles.analyticsTitle}>Booth Low-Yield Analysis vs Previous Month</Text>
                </View>
                <Text style={styles.analyticsSubtitle}>
                  Comparative volume deficit audit identifying collection centers below benchmark
                </Text>
              </View>

              <View style={styles.lowYieldAlertBadge}>
                <Text style={styles.lowYieldAlertBadgeText}>1 Deficit Alert</Text>
              </View>
            </View>

            {/* Critical Low-Yield Warning Banner */}
            <View style={[styles.lowYieldWarningBanner, isMobile && styles.mobileLowYieldWarningBanner]}>
              <View style={styles.lowYieldBannerHeader}>
                <Ionicons name="alert-circle" size={22} color="#DC2626" />
                <Text style={styles.lowYieldWarningTitle}>
                  LOWEST PRODUCING BOOTH: {lowestBooth.name}
                </Text>
              </View>
              <Text style={styles.lowYieldWarningDesc}>
                Supplied only <Text style={{ fontWeight: '800' }}>{lowestBooth.currentMonthLitres} L</Text> this month vs <Text style={{ fontWeight: '800' }}>{lowestBooth.prevMonthLitres} L</Text> last month ({lowestBooth.changePercent}% Drop). Reason: {lowestBooth.reason}.
              </Text>

              <Pressable
                style={[styles.lowYieldInquiryBtn, isMobile && styles.mobileLowYieldInquiryBtn]}
                onPress={() => {
                  setDirectiveCategory('Low Yield Inquiry');
                  setDirectiveText(`Executive Inquiry for ${lowestBooth.name}: Explain volume drop of ${lowestBooth.changePercent}% compared to previous month average.`);
                  setShowDirectiveModal(true);
                }}
              >
                <Ionicons name="document-text-outline" size={14} color="#FFFFFF" />
                <Text style={styles.lowYieldInquiryBtnText}>Issue Inquiry</Text>
              </Pressable>
            </View>

            {/* Comparative Breakdown Table for All Booths */}
            <View style={styles.boothCompareList}>
              {boothComparisons.map((b) => {
                const isNegative = b.changePercent < 0;
                return (
                  <View key={b.id} style={[styles.boothCompareItem, isMobile && styles.mobileBoothCompareItem]}>
                    <View style={styles.boothCompareLeft}>
                      <View style={[styles.boothCodeBadge, { backgroundColor: isNegative ? (isDark ? '#3E1818' : '#FEE2E2') : (isDark ? '#132E1D' : '#DCFCE7') }]}>
                        <Text style={[styles.boothCodeBadgeText, { color: isNegative ? (isDark ? '#FCA5A5' : '#DC2626') : (isDark ? '#4ADE80' : '#15803D') }]}>
                          {b.code}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.boothCompareName}>{b.name}</Text>
                        <Text style={styles.boothCompareSub}>
                          Operator: {b.operator} • In-Charge: {b.assignedBmc}
                        </Text>
                      </View>
                    </View>

                    {/* Volume Comparison Meters */}
                    <View style={[styles.boothCompareMeters, isMobile && styles.mobileBoothCompareMeters]}>
                      <View style={styles.meterCol}>
                        <Text style={styles.meterLabel}>This Month</Text>
                        <Text style={[styles.meterValue, { color: isNegative ? (isDark ? '#F87171' : '#DC2626') : colors.text }]}>
                          {b.currentMonthLitres.toFixed(1)} L
                        </Text>
                      </View>

                      <View style={styles.meterDivider} />

                      <View style={styles.meterCol}>
                        <Text style={styles.meterLabel}>Prev Month</Text>
                        <Text style={styles.meterValue}>{b.prevMonthLitres.toFixed(1)} L</Text>
                      </View>

                      <View style={[styles.variancePercentBadge, { backgroundColor: isNegative ? (isDark ? '#3E1818' : '#FEF2F2') : (isDark ? '#132E1D' : '#F0FDF4') }]}>
                        <Ionicons
                          name={isNegative ? "arrow-down" : "arrow-up"}
                          size={12}
                          color={isNegative ? (isDark ? '#FCA5A5' : "#DC2626") : (isDark ? '#4ADE80' : "#16A34A")}
                        />
                        <Text style={[styles.variancePercentText, { color: isNegative ? (isDark ? '#FCA5A5' : "#DC2626") : (isDark ? '#4ADE80' : "#16A34A") }]}>
                          {Math.abs(b.changePercent)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* =========================================================================
              NEW FEATURE 3: FULL ACCESS PORTAL FOR BOOTH, MCP, FARMER/COWS, PAYMENTS
             ========================================================================= */}
          <View style={[styles.cognifyCard, styles.fullAccessContainer]}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.analyticsTitle}>District Executive Access Hub</Text>
                <Text style={styles.analyticsSubtitle}>
                  Full administrative command for Booths, MCP Coolers, Farmers, Cattle Herd & DBT Payments
                </Text>
              </View>
              <View style={styles.fullAccessRolePill}>
                <Ionicons name="shield-checkmark" size={13} color="#7C3AED" />
                <Text style={styles.fullAccessRoleText}>GM High Privilege</Text>
              </View>
            </View>

            <View style={styles.fullAccessGrid}>
              {/* Access 1: Booths / Collection Centers */}
              <Pressable
                style={styles.accessTileCard}
                onPress={() => router.push('/(booth)' as any)}
              >
                <View style={[styles.accessTileIcon, { backgroundColor: isDark ? '#132840' : '#E0F2FE' }]}>
                  <Ionicons name="storefront" size={22} color="#0284C7" />
                </View>
                <Text style={styles.accessTileTitle}>Village Booths</Text>
                <Text style={styles.accessTileStat}>{booths.length} Societies</Text>
                <Text style={styles.accessTileDesc}>Record milk, sessions, dispatch manifests</Text>
                <View style={styles.accessTileLinkRow}>
                  <Text style={styles.accessTileLinkText}>Manage Booths</Text>
                  <Ionicons name="arrow-forward" size={13} color="#0284C7" />
                </View>
              </Pressable>

              {/* Access 2: MCP / Bulk Milk Coolers */}
              <Pressable
                style={styles.accessTileCard}
                onPress={() => router.push('/(union)/bmc-monitoring' as any)}
              >
                <View style={[styles.accessTileIcon, { backgroundColor: isDark ? '#132E1D' : '#DCFCE7' }]}>
                  <Ionicons name="snow" size={22} color="#16A34A" />
                </View>
                <Text style={styles.accessTileTitle}>MCP Chilling Hubs</Text>
                <Text style={styles.accessTileStat}>{bmcs.length} Bulk Coolers</Text>
                <Text style={styles.accessTileDesc}>3.8°C temperature telemetry, flow meters</Text>
                <View style={styles.accessTileLinkRow}>
                  <Text style={[styles.accessTileLinkText, { color: '#16A34A' }]}>Inspect MCPs</Text>
                  <Ionicons name="arrow-forward" size={13} color="#16A34A" />
                </View>
              </Pressable>

              {/* Access 3: Farmers & Cows Registry */}
              <Pressable
                style={styles.accessTileCard}
                onPress={() => router.push('/(veterinary)/cattle-registry' as any)}
              >
                <View style={[styles.accessTileIcon, { backgroundColor: isDark ? '#381628' : '#FDF2F8' }]}>
                  <Ionicons name="heart" size={22} color="#EC4899" />
                </View>
                <Text style={styles.accessTileTitle}>Herd & Pashu Aadhaar</Text>
                <Text style={styles.accessTileStat}>{cows.length} Tagged Cows</Text>
                <Text style={styles.accessTileDesc}>
                  {farmers.length} Farmers • {quarantineCowsCount > 0 ? `${quarantineCowsCount} in withdrawal` : 'Zero hold'}
                </Text>
                <View style={styles.accessTileLinkRow}>
                  <Text style={[styles.accessTileLinkText, { color: '#EC4899' }]}>View Herd</Text>
                  <Ionicons name="arrow-forward" size={13} color="#EC4899" />
                </View>
              </Pressable>

              {/* Access 4: Payments & DBT Ledger */}
              <Pressable
                style={styles.accessTileCard}
                onPress={() => router.push('/(farmer)/payments' as any)}
              >
                <View style={[styles.accessTileIcon, { backgroundColor: isDark ? '#261447' : '#FAF5FF' }]}>
                  <Ionicons name="wallet" size={22} color="#9333EA" />
                </View>
                <Text style={styles.accessTileTitle}>DBT Payments</Text>
                <Text style={styles.accessTileStat}>₹{(todayIncomeRevenue / 1000).toFixed(1)}k Today</Text>
                <Text style={styles.accessTileDesc}>Bank account IFSC, milk supply credit passbook</Text>
                <View style={styles.accessTileLinkRow}>
                  <Text style={[styles.accessTileLinkText, { color: '#9333EA' }]}>Review Payments</Text>
                  <Ionicons name="arrow-forward" size={13} color="#9333EA" />
                </View>
              </Pressable>
            </View>
          </View>

          {/* =========================================================================
              ANALYTICS CARDS: RETENTION, BATCHES & TRENDS
             ========================================================================= */}
          <View style={[styles.bottomCardsGrid, isDesktop && styles.desktopBottomCardsGrid, isTablet && styles.tabletBottomCardsGrid]}>

            {/* CARD 4: YIELD RETENTION & PHYSICAL TWIN STAGES */}
            <View style={[styles.cognifyCard, styles.analyticsCardItem]}>
              <View style={[styles.analyticsHeaderRow, isMobile && styles.mobileAnalyticsHeaderRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.analyticsTitle}>Transit Yield Retention</Text>
                  <Text style={styles.taskProgressBigNum}>{retentionPercent.toFixed(1)}%</Text>
                  <Text style={styles.analyticsSubtitle}>
                    Tolerance ±0.50% • Shrinkage: {netTransitDiscrepancy.toFixed(1)} L
                  </Text>
                </View>

                <View style={[styles.taskCategoriesCol, isMobile && styles.mobileTaskCategoriesRow]}>
                  <View style={[styles.taskCategoryItem, isMobile && styles.mobileTaskCategoryItem]}>
                    <View style={[styles.categoryMiniIcon, { backgroundColor: isDark ? '#381628' : '#FDF2F8' }]}>
                      <Ionicons name="water" size={13} color="#EC4899" />
                    </View>
                    <View>
                      <Text style={styles.categoryNameText}>Avg FAT</Text>
                      <Text style={styles.categoryPercentText}>4.35%</Text>
                    </View>
                  </View>

                  <View style={[styles.taskCategoryItem, isMobile && styles.mobileTaskCategoryItem]}>
                    <View style={[styles.categoryMiniIcon, { backgroundColor: isDark ? '#132840' : '#EFF6FF' }]}>
                      <Ionicons name="analytics" size={13} color="#3B82F6" />
                    </View>
                    <View>
                      <Text style={styles.categoryNameText}>Avg SNF</Text>
                      <Text style={styles.categoryPercentText}>8.52%</Text>
                    </View>
                  </View>

                  <View style={[styles.taskCategoryItem, isMobile && styles.mobileTaskCategoryItem]}>
                    <View style={[styles.categoryMiniIcon, { backgroundColor: isDark ? '#132E1D' : '#F0FDF4' }]}>
                      <Ionicons name="thermometer" size={13} color="#22C55E" />
                    </View>
                    <View>
                      <Text style={styles.categoryNameText}>Chilling</Text>
                      <Text style={styles.categoryPercentText}>3.8°C</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.cylinderChartContainer}>
                <Svg width="100%" height={160} viewBox="0 0 280 160">
                  <Defs>
                    <SvgGradient id="pinkHeadGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#F43F5E" />
                      <Stop offset="1" stopColor="#EC4899" />
                    </SvgGradient>
                    <SvgGradient id="blueHeadGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#60A5FA" />
                      <Stop offset="1" stopColor="#3B82F6" />
                    </SvgGradient>
                    <SvgGradient id="greenHeadGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#4ADE80" />
                      <Stop offset="1" stopColor="#22C55E" />
                    </SvgGradient>
                  </Defs>

                  <G transform="translate(10, 10)">
                    <G transform="translate(0, 36)">
                      {renderHatchPattern('pinkPillHatch', 66, 104, 18, '#F472B6', isDark ? '#381628' : '#FDF2F8', 6)}
                    </G>
                    <Rect x={0} y={0} width={66} height={42} rx={18} fill="url(#pinkHeadGrad)" />
                    <SvgText x={33} y={26} fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle">
                      {stats.totalBoothDispatched.toFixed(0)}L
                    </SvgText>
                  </G>

                  <G transform="translate(90, 40)">
                    <G transform="translate(0, 34)">
                      {renderHatchPattern('bluePillHatch', 82, 76, 18, '#60A5FA', isDark ? '#132840' : '#EFF6FF', 6)}
                    </G>
                    <Rect x={0} y={0} width={82} height={40} rx={18} fill="url(#blueHeadGrad)" />
                    <SvgText x={41} y={25} fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle">
                      {stats.totalBmcReceived.toFixed(0)}L
                    </SvgText>
                  </G>

                  <G transform="translate(186, 38)">
                    <G transform="translate(0, 34)">
                      {renderHatchPattern('greenPillHatch', 84, 78, 18, '#4ADE80', isDark ? '#132E1D' : '#F0FDF4', 6)}
                    </G>
                    <Rect x={0} y={0} width={84} height={40} rx={18} fill="url(#greenHeadGrad)" />
                    <SvgText x={42} y={25} fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle">
                      {stats.totalReportedByBmcReceipts.toFixed(0)}L
                    </SvgText>
                  </G>
                </Svg>
              </View>
            </View>

            {/* CARD 5: BATCH DELIVERY RECONCILIATION */}
            <View style={[styles.cognifyCard, styles.analyticsCardItem]}>
              <View style={styles.analyticsHeaderRow}>
                <Text style={styles.analyticsTitle}>Batch Reconciliation</Text>

                <View style={styles.sumPercentTogglePill}>
                  <Pressable
                    onPress={() => setStatusMode('sum')}
                    style={[styles.togglePillBtn, statusMode === 'sum' && styles.togglePillBtnActive]}
                  >
                    <Text style={[styles.togglePillText, statusMode === 'sum' && styles.togglePillTextActive]}>
                      Σ
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setStatusMode('percent')}
                    style={[styles.togglePillBtn, statusMode === 'percent' && styles.togglePillBtnActive]}
                  >
                    <Text style={[styles.togglePillText, statusMode === 'percent' && styles.togglePillTextActive]}>
                      %
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.donutContainer}>
                <Svg width="100%" height={150} viewBox="0 0 240 150">
                  <G transform="rotate(-90 120 75)">
                    <Circle
                      cx="120"
                      cy="75"
                      r="50"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="11"
                      strokeDasharray="145 314"
                      strokeDashoffset="75"
                      strokeLinecap="round"
                    />
                    <Circle
                      cx="120"
                      cy="75"
                      r="50"
                      fill="none"
                      stroke="#EC4899"
                      strokeWidth="11"
                      strokeDasharray="72 314"
                      strokeDashoffset="-75"
                      strokeLinecap="round"
                    />
                    <Circle
                      cx="120"
                      cy="75"
                      r="50"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="11"
                      strokeDasharray="74 314"
                      strokeDashoffset="-155"
                      strokeLinecap="round"
                    />
                  </G>

                  <SvgText x="120" y="72" fill={colors.text} fontSize="28" fontWeight="800" textAnchor="middle">
                    {totalDeliveries}
                  </SvgText>
                  <SvgText x="120" y="89" fill={colors.textMuted} fontSize="11" fontWeight="600" textAnchor="middle">
                    batches
                  </SvgText>

                  <G transform="translate(36, 12)">
                    <Rect x={0} y={0} width={82} height={22} rx={11} fill="#FFFFFF" stroke="#E2E8F0" strokeWidth={1} />
                    <Circle cx={11} cy={11} r={3} fill="#22C55E" />
                    <SvgText x={20} y={15} fill="#0F172A" fontSize="9.5" fontWeight="700">
                      {verifiedDeliveries} ({retentionPercent.toFixed(0)}%)
                    </SvgText>
                  </G>
                </Svg>
              </View>

              <View style={styles.statusBarsContainer}>
                <View style={styles.statusBarRow}>
                  <Text style={styles.statusBarLabel}>Balanced</Text>
                  <View style={styles.statusBarTrack}>
                    <Svg width="100%" height={10} viewBox="0 0 160 10">
                      {renderHatchPattern('compHatch', 82, 10, 5, '#16A34A', isDark ? '#132E1D' : '#22C55E', 5)}
                    </Svg>
                  </View>
                  <Text style={styles.statusBarCount}>
                    {statusMode === 'sum' ? `${verifiedDeliveries}/${totalDeliveries}` : `${((verifiedDeliveries / totalDeliveries) * 100).toFixed(0)}%`}
                  </Text>
                </View>

                <View style={styles.statusBarRow}>
                  <Text style={styles.statusBarLabel}>Discrepant</Text>
                  <View style={styles.statusBarTrack}>
                    <Svg width="100%" height={10} viewBox="0 0 160 10">
                      {renderHatchPattern('progHatch', 28, 10, 5, '#DB2777', isDark ? '#3E182A' : '#EC4899', 5)}
                    </Svg>
                  </View>
                  <Text style={styles.statusBarCount}>
                    {statusMode === 'sum' ? `${stats.activeDiscrepanciesCount}/${totalDeliveries}` : `${((stats.activeDiscrepanciesCount / totalDeliveries) * 100).toFixed(0)}%`}
                  </Text>
                </View>

                <View style={styles.statusBarRow}>
                  <Text style={styles.statusBarLabel}>Pending GM</Text>
                  <View style={styles.statusBarTrack}>
                    <Svg width="100%" height={10} viewBox="0 0 160 10">
                      {renderHatchPattern('upcHatch', 52, 10, 5, '#2563EB', isDark ? '#14294D' : '#3B82F6', 5)}
                    </Svg>
                  </View>
                  <Text style={styles.statusBarCount}>
                    {statusMode === 'sum' ? `${stats.pendingReceiptsCount}/${bmcReceipts.length || 1}` : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>

            {/* CARD 6: PRODUCTIVITY & INFLOW TREND */}
            <View style={[styles.cognifyCard, styles.analyticsCardItem]}>
              <View style={styles.analyticsHeaderRow}>
                <Text style={styles.analyticsTitle}>District Inflow & Revenue</Text>

                <Pressable
                  onPress={() => setTrendRange(trendRange === 'Daily' ? 'Weekly' : 'Daily')}
                  style={styles.dailyDropdownPill}
                >
                  <Ionicons name="calendar-outline" size={13} color="#64748B" />
                  <Text style={styles.dailyDropdownText}>{trendRange}</Text>
                  <Ionicons name="chevron-down" size={12} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.trendTooltipsHeaderRow}>
                <View style={styles.activeTimePill}>
                  <View style={styles.blueDot} />
                  <Text style={styles.activeTimePillText}>{currentTrendPoint.activeTime}</Text>
                </View>
                <View style={styles.pauseTimePill}>
                  <View style={styles.pinkDot} />
                  <Text style={styles.pauseTimePillText}>{currentTrendPoint.pauseTime}</Text>
                </View>
              </View>

              <View style={styles.lineChartSvgWrapper}>
                <Svg width="100%" height={110} viewBox="0 0 280 110">
                  <Line x1="10" y1="20" x2="270" y2="20" stroke="#F1F5F9" strokeWidth={1} />
                  <Line x1="10" y1="55" x2="270" y2="55" stroke="#F1F5F9" strokeWidth={1} />
                  <Line x1="10" y1="90" x2="270" y2="90" stroke="#F1F5F9" strokeWidth={1} />

                  {(() => {
                    const selX = 25 + selectedDayIdx * 57.5;
                    return (
                      <Line
                        x1={selX}
                        y1="10"
                        x2={selX}
                        y2="100"
                        stroke="#CBD5E1"
                        strokeWidth={1.5}
                        strokeDasharray="3,3"
                      />
                    );
                  })()}

                  <Path
                    d="M 15 50 C 45 28, 70 45, 95 32 C 120 18, 140 48, 165 30 C 190 15, 215 48, 240 38 C 255 32, 268 40, 275 42"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />

                  <Path
                    d="M 15 88 C 45 92, 70 82, 95 86 C 120 90, 140 70, 165 72 C 190 75, 215 62, 240 70 C 255 75, 268 68, 275 70"
                    fill="none"
                    stroke="#EC4899"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />

                  {(() => {
                    const selX = 25 + selectedDayIdx * 57.5;
                    const yBlue = currentTrendPoint.blueY;
                    const yPink = currentTrendPoint.pinkY;
                    return (
                      <G>
                        <Circle cx={selX} cy={yBlue} r={4.5} fill="#3B82F6" stroke="#FFFFFF" strokeWidth={2} />
                        <Circle cx={selX} cy={yPink} r={4.5} fill="#EC4899" stroke="#FFFFFF" strokeWidth={2} />
                      </G>
                    );
                  })()}
                </Svg>
              </View>

              <View style={styles.daysSelectorRow}>
                {daysData.map((d, idx) => {
                  const isSelected = selectedDayIdx === idx;
                  return (
                    <Pressable
                      key={d.day}
                      onPress={() => setSelectedDayIdx(idx)}
                      style={[styles.daySelectorPill, isSelected && styles.daySelectorPillActive]}
                    >
                      <Text style={[styles.daySelectorPillText, isSelected && styles.daySelectorPillTextActive]}>
                        {d.day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.productivityStatsRow}>
                <View>
                  <Text style={styles.prodStatLabel}>Total Inflow</Text>
                  <View style={styles.prodStatNumRow}>
                    <Text style={styles.prodStatValue}>{todayLitres.toFixed(0)} L</Text>
                    <View style={styles.prodTrendGreenPill}>
                      <Ionicons name="arrow-up" size={10} color="#16A34A" />
                      <Text style={styles.prodTrendGreenText}>{retentionPercent.toFixed(0)}%</Text>
                    </View>
                  </View>
                </View>

                <View>
                  <Text style={styles.prodStatLabel}>Gross Income</Text>
                  <View style={styles.prodStatNumRow}>
                    <Text style={styles.prodStatValue}>₹{(todayIncomeRevenue / 1000).toFixed(1)}k</Text>
                    <View style={styles.prodTrendGreenPill}>
                      <Ionicons name="shield-checkmark" size={10} color="#16A34A" />
                      <Text style={styles.prodTrendGreenText}>DBT</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

          </View>

          {/* =========================================================================
              SUPPLY CHAIN TWIN LEDGER
             ========================================================================= */}
          <View style={[styles.cognifyCard, styles.supplyChainContainer]}>
            <View style={[styles.supplyChainHeader, isMobile && styles.mobileSupplyChainHeader]}>
              <View style={styles.chainTitleGroup}>
                <View style={styles.chainIconCircle}>
                  <Ionicons name="git-network-outline" size={18} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chainTitleText}>Supply Chain Stage Reconciliation (Distinct Nodes)</Text>
                  <Text style={styles.chainSubtitleText}>
                    Booth declared dispatches and BMC intake measurements represent separate stages of the same milk batch.
                  </Text>
                </View>
              </View>

              <View style={[
                styles.retentionPillBadge,
                isMobile && styles.mobileRetentionPillBadge,
                { backgroundColor: netTransitDiscrepancy === 0 ? (isDark ? '#132E1D' : '#DCFCE7') : (isDark ? '#382510' : '#FEF3C7') }
              ]}>
                <Ionicons
                  name={netTransitDiscrepancy === 0 ? "checkmark-circle" : "alert-circle"}
                  size={14}
                  color={netTransitDiscrepancy === 0 ? (isDark ? '#4ADE80' : "#15803D") : (isDark ? '#FBBF24' : "#B45309")}
                />
                <Text style={[
                  styles.retentionPillText,
                  { color: netTransitDiscrepancy === 0 ? (isDark ? '#4ADE80' : "#15803D") : (isDark ? '#FBBF24' : "#B45309") }
                ]}>
                  {retentionPercent.toFixed(1)}% Yield Retention
                </Text>
              </View>
            </View>

            <View style={[styles.pipelineRow, isMobile && styles.mobilePipelineCol]}>
              <View style={[styles.pipelineNodeCard, { borderColor: isDark ? '#0284C7' : '#BAE6FD', backgroundColor: isDark ? '#0D1E34' : '#F8FAFC' }]}>
                <View style={styles.nodeHeaderSmall}>
                  <View style={[styles.nodeMiniBadge, { backgroundColor: '#0284C7' }]}>
                    <Text style={styles.nodeMiniBadgeText}>BOOTHS</Text>
                  </View>
                  <Ionicons name="storefront" size={15} color="#0284C7" />
                </View>
                <Text style={styles.nodeCardTitle}>Village Booths Dispatched</Text>
                <Text style={styles.nodeCardValue}>{stats.totalBoothDispatched.toFixed(1)} <Text style={styles.nodeCardUnit}>L</Text></Text>
                <Text style={styles.nodeCardSub}>{booths.length} Assigned Societies</Text>
              </View>

              <View style={[styles.nodeArrowDivider, isMobile && styles.mobileNodeArrowDivider]}>
                <Ionicons name={isMobile ? "arrow-down" : "arrow-forward"} size={16} color={colors.textMuted} />
              </View>

              <View style={[styles.pipelineNodeCard, { borderColor: isDark ? '#16A34A' : '#BBF7D0', backgroundColor: isDark ? '#0D1E34' : '#F8FAFC' }]}>
                <View style={styles.nodeHeaderSmall}>
                  <View style={[styles.nodeMiniBadge, { backgroundColor: '#16A34A' }]}>
                    <Text style={styles.nodeMiniBadgeText}>BMCS</Text>
                  </View>
                  <Ionicons name="snow" size={15} color="#16A34A" />
                </View>
                <Text style={styles.nodeCardTitle}>BMC Measured Intake</Text>
                <Text style={styles.nodeCardValue}>{stats.totalBmcReceived.toFixed(1)} <Text style={styles.nodeCardUnit}>L</Text></Text>
                <Text style={styles.nodeCardSub}>{bmcs.length} Bulk Coolers</Text>
              </View>

              <View style={[styles.nodeArrowDivider, isMobile && styles.mobileNodeArrowDivider]}>
                <Ionicons name={isMobile ? "arrow-down" : "arrow-forward"} size={16} color={colors.textMuted} />
              </View>

              <View style={[styles.pipelineNodeCard, { borderColor: isDark ? '#9333EA' : '#E9D5FF', backgroundColor: isDark ? '#0D1E34' : '#F8FAFC' }]}>
                <View style={styles.nodeHeaderSmall}>
                  <View style={[styles.nodeMiniBadge, { backgroundColor: '#9333EA' }]}>
                    <Text style={styles.nodeMiniBadgeText}>SLIPS</Text>
                  </View>
                  <Ionicons name="document-text" size={15} color="#9333EA" />
                </View>
                <Text style={styles.nodeCardTitle}>Reported by BMC Slips</Text>
                <Text style={styles.nodeCardValue}>{stats.totalReportedByBmcReceipts.toFixed(1)} <Text style={styles.nodeCardUnit}>L</Text></Text>
                <Text style={styles.nodeCardSub}>{stats.pendingReceiptsCount > 0 ? `${stats.pendingReceiptsCount} Pending Sign-Off` : '100% Signed'}</Text>
              </View>
            </View>

            {netTransitDiscrepancy > 0 && (
              <Pressable
                style={styles.inspectDiscrepancyBtn}
                onPress={() => router.push('/(union)/discrepancies' as any)}
              >
                <Ionicons name="search" size={15} color="#FFFFFF" />
                <Text style={styles.inspectDiscrepancyBtnText}>
                  Audit {netTransitDiscrepancy.toFixed(1)} L Discrepancy Case & Tolerance
                </Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

        </View>
      </ScrollView>

      {/* =========================================================================
          EXECUTIVE DIRECTIVE INPUT MODAL
         ========================================================================= */}
      <Modal
        visible={showDirectiveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDirectiveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalMainTitle}>Dispatch Executive Directive</Text>
                <Text style={styles.modalSubTitle}>Aavin Madurai District Milk Union Headquarters</Text>
              </View>
              <Pressable
                onPress={() => setShowDirectiveModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputFieldLabel}>Target BMC / Unit</Text>
              <View style={styles.bmcSelectorRow}>
                {bmcs.map((b) => {
                  const isSel = targetBmcId === b.id;
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => setTargetBmcId(b.id)}
                      style={[styles.modalSelectorPill, isSel && styles.modalSelectorPillActive]}
                    >
                      <Text style={[styles.modalSelectorPillText, isSel && styles.modalSelectorPillTextActive]}>
                        {b.name.split(' ')[0]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputFieldLabel}>Directive Category</Text>
              <View style={styles.bmcSelectorRow}>
                {(['Low Yield Inquiry', 'Transit Shrinkage', 'Quality Audit', 'Temperature Breach'] as const).map((cat) => {
                  const isSel = directiveCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setDirectiveCategory(cat)}
                      style={[styles.modalSelectorPill, isSel && styles.modalSelectorPillActive]}
                    >
                      <Text style={[styles.modalSelectorPillText, isSel && styles.modalSelectorPillTextActive]}>
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputFieldLabel}>Priority Level</Text>
              <View style={styles.bmcSelectorRow}>
                {(['Normal', 'High', 'Critical GM Order'] as const).map((p) => {
                  const isSel = directivePriority === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setDirectivePriority(p)}
                      style={[
                        styles.modalSelectorPill,
                        isSel && (p === 'Critical GM Order' ? styles.pillRedActive : styles.modalSelectorPillActive)
                      ]}
                    >
                      <Text style={[styles.modalSelectorPillText, isSel && styles.modalSelectorPillTextActive]}>
                        {p}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputFieldLabel}>Executive Instructions & Findings</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Enter executive instructions, low yield deficit inquiry, tanker custody seal inspection, or GM order..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                value={directiveText}
                onChangeText={setDirectiveText}
              />
            </ScrollView>

            <View style={styles.modalFooterActionsRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowDirectiveModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.modalSubmitBtn}
                onPress={handleDispatchDirective}
              >
                <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                <Text style={styles.modalSubmitBtnText}>Dispatch Directive</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          QUICK GM SIGN-OFF MODAL
         ========================================================================= */}
      <Modal
        visible={showSignOffModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSignOffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalMainTitle}>GM Sign-Off & Seal Receipt</Text>
                <Text style={styles.modalSubTitle}>Digital Signature for Daily BMC Intake Slip</Text>
              </View>
              <Pressable
                onPress={() => setShowSignOffModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={{ marginVertical: 12 }}>
              <Text style={styles.inputFieldLabel}>Select Pending Slip</Text>
              {bmcReceipts.filter(r => r.status === 'sent_to_union').map((r) => {
                const isSel = selectedReceiptId === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setSelectedReceiptId(r.id)}
                    style={[styles.receiptSelectCard, isSel && styles.receiptSelectCardActive]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.receiptSelectId, isSel && { color: isDark ? colors.primary : '#0284C7' }]}>Slip #{r.id}</Text>
                      <Text style={styles.receiptSelectSub}>BMC: {r.bmcName} • {r.totalReceivedQuantity} L</Text>
                    </View>
                    <Ionicons
                      name={isSel ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={isSel ? (isDark ? colors.primary : '#0284C7') : (isDark ? colors.border : '#CBD5E1')}
                    />
                  </Pressable>
                );
              })}

              <Text style={[styles.inputFieldLabel, { marginTop: 12 }]}>GM Audit Directives & Notes</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Audit findings: milk fat compliant, cooling temperature within 4°C, zero adulteration certified."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={signOffNotes}
                onChangeText={setSignOffNotes}
              />
            </View>

            <View style={styles.modalFooterActionsRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowSignOffModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </Pressable>

              <Pressable
                style={[styles.modalSubmitBtn, { backgroundColor: '#16A34A' }]}
                onPress={handleQuickSignOff}
              >
                <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                <Text style={styles.modalSubmitBtnText}>Sign & Reconcile</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean, isMobile: boolean) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isMobile ? 12 : 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  tabletScrollContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    alignItems: 'center',
  },
  desktopScrollContent: {
    paddingHorizontal: 36,
    paddingTop: 24,
    alignItems: 'center',
  },
  mainDashboardCanvas: {
    width: '100%',
    gap: 16,
  },
  desktopDashboardCanvas: {
    maxWidth: 1320,
    gap: 20,
  },

  /* Section Title Bar */
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mobileSectionTitleRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  titleTextContainer: {
    flex: 1,
  },
  dashboardMainTitle: {
    fontSize: isMobile ? 22 : 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  dashboardSubtitle: {
    fontSize: isMobile ? 12 : 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  mobileNewTaskBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  filterPillsWrapper: {
    width: '100%',
    marginBottom: 2,
  },
  filterPillsScrollContent: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#15273E' : '#E2E8F0',
    borderRadius: 24,
    padding: 3,
    gap: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: isDark ? colors.primary : '#0F172A',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? colors.textSecondary : '#475569',
  },
  filterPillTextActive: {
    color: isDark ? '#09121E' : '#FFFFFF',
    fontWeight: '700',
  },
  newTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? colors.primary : '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  newTaskBtnText: {
    color: isDark ? '#09121E' : '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Alert Notice Banner */
  alertNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#2D1515' : '#FEF2F2',
    borderWidth: 1,
    borderColor: isDark ? '#5C1D1D' : '#FECACA',
    borderRadius: 18,
    padding: 14,
  },
  mobileAlertNoticeBanner: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
  },
  alertNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  alertNoticeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: isDark ? '#3E1818' : '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: isDark ? '#FCA5A5' : '#991B1B',
  },
  alertNoticeDesc: {
    fontSize: 11,
    color: isDark ? '#F87171' : '#B91C1C',
    marginTop: 2,
    lineHeight: 16,
  },
  alertBannerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileAlertBannerButtonsRow: {
    width: '100%',
    justifyContent: 'flex-end',
    gap: 8,
  },
  signOffBtnMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? '#132E1D' : '#DCFCE7',
    borderWidth: 1,
    borderColor: isDark ? '#166534' : '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  signOffBtnMiniText: {
    color: isDark ? '#4ADE80' : '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  alertNoticeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  alertNoticeActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  /* The Signature Cognify White Card Base */
  cognifyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isMobile ? 14 : 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.25 : 0.04,
    shadowRadius: 16,
    elevation: 2,
  },

  /* Top 3 KPI Grid - SINGLE ROW ON MOBILE */
  topCardsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  tabletTopCardsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  desktopTopCardsGrid: {
    flexDirection: 'row',
    gap: 18,
  },
  kpiCardItem: {
    flex: 1,
    minWidth: 0,
    padding: isMobile ? 10 : 14,
    justifyContent: 'space-between',
    minHeight: isMobile ? 130 : 155,
  },
  desktopKpiCardItem: {
    padding: 20,
    minHeight: 180,
  },
  cardTopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  desktopKpiIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  arrowCircleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: isDark ? '#15273E' : '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopArrowCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  cardKpiLabel: {
    fontSize: isMobile ? 10.5 : 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    height: 16,
  },
  statValueWithTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 6,
  },
  cardBigNumber: {
    fontSize: isMobile ? 18 : 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  desktopCardBigNumber: {
    fontSize: 38,
    letterSpacing: -1,
  },
  trendPillDown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: isDark ? '#3E1818' : '#FEF2F2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendTextDown: {
    color: isDark ? '#F87171' : '#EF4444',
    fontSize: 9.5,
    fontWeight: '800',
  },
  trendPillUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: isDark ? '#132E1D' : '#F0FDF4',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendTextUp: {
    color: isDark ? '#4ADE80' : '#10B981',
    fontSize: 9.5,
    fontWeight: '800',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  desktopCardFooterRow: {
    paddingTop: 10,
  },
  dynamicLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
    marginRight: 2,
  },
  dynamicLabelText: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
  },
  periodPill: {
    backgroundColor: isDark ? '#15273E' : '#F1F4F8',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'center',
  },
  periodPillText: {
    fontSize: 8.5,
    color: isDark ? colors.textSecondary : '#475569',
    fontWeight: '700',
  },

  /* NEW SECTION 1: Income Analytics Card */
  incomeAnalyticsCard: {
    gap: 14,
  },
  incomeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  mobileIncomeHeaderRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  incomeHeaderLeftGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 240,
    gap: 12,
  },
  incomeHeaderTitleContainer: {
    flex: 1,
  },
  incomeBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#132E1D' : '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  incomeStatBadge: {
    backgroundColor: isDark ? '#132E1D' : '#F0FDF4',
    borderWidth: 1.5,
    borderColor: isDark ? '#166534' : '#86EFAC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  mobileIncomeStatBadge: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomeStatBadgeLabelCol: {
    alignItems: isMobile ? 'flex-start' : 'flex-end',
  },
  incomeStatBadgeText: {
    fontSize: isMobile ? 20 : 22,
    fontWeight: '900',
    color: isDark ? '#4ADE80' : '#15803D',
  },
  incomeStatBadgeSub: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#86EFAC' : '#166534',
  },
  incomeStatBadgeTariff: {
    fontSize: 10,
    fontWeight: '600',
    color: isDark ? '#86EFAC' : '#166534',
    marginTop: 1,
  },
  incomeBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mobileIncomeBreakdownGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  incomeBoxItem: {
    flex: 1,
    minWidth: isMobile ? '100%' : 180,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 145,
    justifyContent: 'space-between',
  },
  mobileIncomeBoxItem: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 14,
    minHeight: 120,
    gap: 10,
  },
  incomeBoxTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incomeBoxIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeBoxTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  incomeBoxTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  incomeBoxBody: {
    gap: 2,
  },
  incomeBoxValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  incomeBoxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  incomeBoxSub: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },

  /* NEW SECTION 2: Low-Yielding Booths Card */
  lowYieldCard: {
    gap: 14,
  },
  lowYieldAlertBadge: {
    backgroundColor: isDark ? '#3E1818' : '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lowYieldAlertBadgeText: {
    color: isDark ? '#F87171' : '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  lowYieldWarningBanner: {
    flexDirection: 'column',
    backgroundColor: isDark ? '#2D1515' : '#FEF2F2',
    borderWidth: 1.5,
    borderColor: isDark ? '#5C1D1D' : '#F87171',
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  mobileLowYieldWarningBanner: {
    padding: 12,
  },
  lowYieldBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lowYieldWarningTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: isDark ? '#FCA5A5' : '#991B1B',
    flex: 1,
  },
  lowYieldWarningDesc: {
    fontSize: 11,
    color: isDark ? '#F87171' : '#B91C1C',
    lineHeight: 16,
  },
  lowYieldInquiryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  mobileLowYieldInquiryBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  lowYieldInquiryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  boothCompareList: {
    gap: 8,
  },
  boothCompareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexWrap: 'wrap',
    gap: 10,
  },
  mobileBoothCompareItem: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    paddingVertical: 10,
  },
  boothCompareLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 200,
  },
  boothCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  boothCodeBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  boothCompareName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  boothCompareSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  boothCompareMeters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mobileBoothCompareMeters: {
    width: '100%',
    justifyContent: 'space-between',
    paddingLeft: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#182C44' : '#F1F5F9',
  },
  meterCol: {
    alignItems: 'flex-start',
  },
  meterLabel: {
    fontSize: 9.5,
    color: colors.textMuted,
    fontWeight: '600',
  },
  meterValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  meterDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  variancePercentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  variancePercentText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* NEW SECTION 3: Full Access Hub */
  fullAccessContainer: {
    gap: 16,
  },
  fullAccessRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? '#261447' : '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fullAccessRoleText: {
    color: isDark ? '#C084FC' : '#7C3AED',
    fontSize: 11,
    fontWeight: '800',
  },
  fullAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accessTileCard: {
    flex: 1,
    minWidth: isMobile ? 140 : 165,
    backgroundColor: isDark ? '#0D1E34' : '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
    minHeight: isMobile ? 175 : 190,
  },
  accessTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  accessTileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  accessTileStat: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginVertical: 2,
  },
  accessTileDesc: {
    fontSize: 10.5,
    color: colors.textSecondary,
    lineHeight: 15,
    marginBottom: 8,
    minHeight: 30,
  },
  accessTileLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  accessTileLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: isDark ? colors.primary : '#0284C7',
  },

  /* Analytics Grid (Bottom 3) */
  bottomCardsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  tabletBottomCardsGrid: {
    flexDirection: 'column',
    gap: 18,
  },
  desktopBottomCardsGrid: {
    flexDirection: 'row',
    gap: 18,
  },
  analyticsCardItem: {
    flex: 1,
    minWidth: isMobile ? 260 : 280,
  },
  analyticsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mobileAnalyticsHeaderRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  analyticsSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
    lineHeight: 16,
  },

  /* Card 4: Task Progress */
  taskProgressBigNum: {
    fontSize: isMobile ? 32 : 38,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    marginTop: 4,
  },
  taskCategoriesCol: {
    gap: 6,
  },
  mobileTaskCategoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taskCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileTaskCategoryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryMiniIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryNameText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryPercentText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '800',
  },
  cylinderChartContainer: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Card 5: Project Status */
  sumPercentTogglePill: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#15273E' : '#F1F4F8',
    borderRadius: 12,
    padding: 2,
  },
  togglePillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  togglePillBtnActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  togglePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  togglePillTextActive: {
    color: colors.text,
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  statusBarsContainer: {
    marginTop: 8,
    gap: 9,
  },
  statusBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBarLabel: {
    minWidth: 76,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: isDark ? '#15273E' : '#F1F5F9',
    borderRadius: 5,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  statusBarCount: {
    minWidth: 50,
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
  },

  /* Card 6: Productivity Trend */
  dailyDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: isDark ? '#15273E' : '#F1F4F8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dailyDropdownText: {
    fontSize: 12,
    color: isDark ? colors.textSecondary : '#475569',
    fontWeight: '700',
  },
  trendTooltipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 6,
  },
  activeTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? '#15273E' : '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  blueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  activeTimePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  pauseTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? '#0D1E34' : '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pinkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EC4899',
  },
  pauseTimePillText: {
    color: isDark ? colors.textSecondary : '#475569',
    fontSize: 10,
    fontWeight: '700',
  },
  lineChartSvgWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  daysSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  daySelectorPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  daySelectorPillActive: {
    backgroundColor: isDark ? '#15273E' : '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  daySelectorPillText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  daySelectorPillTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  productivityStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  prodStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  prodStatNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  prodStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  prodTrendGreenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  prodTrendGreenText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
  },
  prodTrendRedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  prodTrendRedText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Supply Chain Twin Section */
  supplyChainContainer: {
    gap: 14,
  },
  supplyChainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileSupplyChainHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  chainTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  chainIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#132840' : '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainTitleText: {
    fontSize: isMobile ? 14 : 15,
    fontWeight: '800',
    color: colors.text,
  },
  chainSubtitleText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 16,
  },
  retentionPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mobileRetentionPillBadge: {
    alignSelf: 'flex-start',
  },
  retentionPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobilePipelineCol: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  pipelineNodeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    backgroundColor: isDark ? '#0D1E34' : '#F8FAFC',
  },
  nodeHeaderSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nodeMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nodeMiniBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  nodeCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  nodeCardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginVertical: 2,
  },
  nodeCardUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  nodeCardSub: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  nodeArrowDivider: {
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileNodeArrowDivider: {
    paddingVertical: 4,
  },
  inspectDiscrepancyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  inspectDiscrepancyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.35 : 0.15,
    shadowRadius: 18,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  modalMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    marginTop: 8,
  },
  bmcSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  modalSelectorPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: isDark ? '#15273E' : '#F1F5F9',
    borderWidth: 1,
    borderColor: isDark ? '#1A304C' : '#E2E8F0',
  },
  modalSelectorPillActive: {
    backgroundColor: isDark ? colors.primary : '#0F172A',
    borderColor: isDark ? colors.primary : '#0F172A',
  },
  pillRedActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  modalSelectorPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? colors.textSecondary : '#475569',
  },
  modalSelectorPillTextActive: {
    color: isDark ? '#09121E' : '#FFFFFF',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: colors.text,
    backgroundColor: isDark ? '#0D1E34' : '#F8FAFC',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalFooterActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? colors.primary : '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  modalSubmitBtnText: {
    color: isDark ? '#09121E' : '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  receiptSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: isDark ? '#0D1E34' : '#F8FAFC',
    marginBottom: 6,
  },
  receiptSelectCardActive: {
    borderColor: isDark ? colors.primary : '#0284C7',
    backgroundColor: isDark ? '#132840' : '#F0F9FF',
  },
  receiptSelectId: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  receiptSelectSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
});
