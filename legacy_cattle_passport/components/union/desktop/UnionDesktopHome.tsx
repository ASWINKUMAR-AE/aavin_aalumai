import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
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
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../../store/AavinStoreContext';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { Typography } from '../../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';

interface UnionDesktopHomeProps {
  onIssueDirective?: () => void;
}

export const UnionDesktopHome: React.FC<UnionDesktopHomeProps> = () => {
  const { user } = useAuth();
  const {
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
  const router = useRouter();

  const [activeTabFilter, setActiveTabFilter] = useState<'Overview' | 'Booths & Low Yield' | 'MCP Chilling' | 'Herd & Cows' | 'Payments'>('Overview');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(2); // Default to Wed (middle)
  const [statusMode, setStatusMode] = useState<'sum' | 'percent'>('sum');

  // Executive Directive Modal
  const [showDirectiveModal, setShowDirectiveModal] = useState(false);
  const [targetBmcId, setTargetBmcId] = useState(bmcs[0]?.id || 'bmc-1');
  const [directiveCategory, setDirectiveCategory] = useState<'Low Yield Inquiry' | 'Transit Shrinkage' | 'Quality Audit' | 'Temperature Breach'>('Low Yield Inquiry');
  const [directivePriority, setDirectivePriority] = useState<'Normal' | 'High' | 'Critical GM Order'>('High');
  const [directiveText, setDirectiveText] = useState('');

  // Quick GM Sign-Off Modal
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [signOffNotes, setSignOffNotes] = useState('');

  const stats = getUnionStats();
  const netTransitDiscrepancy = Math.max(0, stats.totalBoothDispatched - stats.totalBmcReceived);
  const retentionPercent =
    stats.totalBoothDispatched > 0
      ? Math.min(100, Math.max(0, (stats.totalBmcReceived / stats.totalBoothDispatched) * 100))
      : 100;

  // Financial & Procurement Calculations
  const todayLitres = stats.totalBmcReceived > 0 ? stats.totalBmcReceived : 825.0;
  const procurementRatePerLitre = 40.5;
  const todayIncomeRevenue = todayLitres * procurementRatePerLitre;
  const farmerPayoutShare = todayIncomeRevenue * 0.85;
  const logisticsShare = todayIncomeRevenue * 0.10;
  const societyIncentiveShare = todayIncomeRevenue * 0.05;

  // Quarantine cattle count
  const quarantineCowsCount = cows.filter(c => c.activeWithdrawal?.hasActiveWithdrawal).length;

  // Deliveries & verification
  const totalDeliveries = bmcDeliveries.length > 0 ? bmcDeliveries.length : 12;
  const verifiedDeliveries = Math.max(0, totalDeliveries - stats.activeDiscrepanciesCount);
  const pendingReceipts = bmcReceipts.filter(r => r.status === 'sent_to_union');

  // Low-Yielding Booths
  const boothComparisons = [
    {
      id: 'BOOTH003',
      code: 'AAVIN-CC-MDU-03',
      name: 'Vadipatti Milk Collection Booth',
      operator: 'K. Balu',
      assignedBmc: 'Vadipatti BMC Center',
      currentMonthLitres: 310.0,
      prevMonthLitres: 440.0,
      changePercent: -29.5,
      isLowest: true,
      reason: 'Lowest in district • 6 cows in dry lactation period',
    },
    {
      id: 'BOOTH002',
      code: 'AAVIN-CC-MDU-02',
      name: 'Navinipatti Village Booth #2',
      operator: 'S. Muthu',
      assignedBmc: 'Madurai East BMC',
      currentMonthLitres: 680.0,
      prevMonthLitres: 790.0,
      changePercent: -13.9,
      isLowest: false,
      reason: 'Seasonal evening drop • Prompt payout needed',
    },
    {
      id: 'BOOTH001',
      code: 'AAVIN-CC-MDU-01',
      name: 'Melur Primary DCS Society',
      operator: 'P. Kannan',
      assignedBmc: 'Melur BMC Center',
      currentMonthLitres: 1280.0,
      prevMonthLitres: 1150.0,
      changePercent: 11.3,
      isLowest: false,
      reason: 'Top producer • High crossbred yield & 100% attendance',
    },
  ];

  const lowestBooth = boothComparisons.find(b => b.isLowest) || boothComparisons[0];

  // 5-Day Trend Data
  const daysData = [
    { day: 'Mon', inflow: 738.5, loss: 1.5, fat: 4.35, snf: 8.50, blueY: 52 },
    { day: 'Tue', inflow: 765.0, loss: 0.0, fat: 4.40, snf: 8.52, blueY: 34 },
    { day: 'Wed', inflow: todayLitres, loss: netTransitDiscrepancy, fat: 4.38, snf: 8.55, blueY: 38 },
    { day: 'Thu', inflow: 754.0, loss: 1.0, fat: 4.32, snf: 8.50, blueY: 60 },
    { day: 'Fri', inflow: 808.0, loss: 2.0, fat: 4.42, snf: 8.54, blueY: 46 },
  ];

  const currentPoint = daysData[selectedDayIdx] || daysData[2];

  const handleDispatchDirective = () => {
    if (!directiveText.trim()) {
      Alert.alert('Directive Required', 'Please enter specific audit instructions.');
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
      `Executive Directive issued to ${targetBmc?.name || 'BMC'}.\nCategory: ${directiveCategory}\nPriority: ${directivePriority}`
    );
    setDirectiveText('');
    setShowDirectiveModal(false);
  };

  const handleSignOffReceipt = () => {
    if (!selectedReceiptId) {
      Alert.alert('Selection Required', 'Please select a pending BMC daily slip.');
      return;
    }
    const receipt = bmcReceipts.find(r => r.id === selectedReceiptId);
    if (!receipt) return;

    reviewBmcReceipt(
      selectedReceiptId,
      signOffNotes.trim() || 'Signed and sealed by Union General Manager - volume and quality parameters verified compliant.',
      user?.fullName || 'Dr. S. Sundaram (General Manager)',
      'reviewed_by_union'
    );

    Alert.alert('Receipt Sealed', `Daily Intake Slip #${receipt.id} officially certified and archived.`);
    setShowSignOffModal(false);
    setSelectedReceiptId('');
    setSignOffNotes('');
  };

  const openSignOffWithFirst = () => {
    const firstPending = pendingReceipts[0];
    if (firstPending) {
      setSelectedReceiptId(firstPending.id);
      setShowSignOffModal(true);
    } else {
      router.push('/(union)/receipt-review' as any);
    }
  };

  return (
    <ScrollView style={[styles.canvas, { backgroundColor: colors.background }]} contentContainerStyle={styles.canvasContainer}>
      <View style={styles.contentConstrained}>

        {/* =========================================================================
            DESKTOP HEADER & CONTROLS STRIP
           ========================================================================= */}
        <View style={[styles.desktopHeaderStrip, { borderBottomColor: colors.border }]}>
          <View>
            <View style={styles.titleRow}>
              <View style={[styles.headerCrestCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name="business" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[styles.mainTitle, { color: colors.text }]}>
                  Executive Union Control Room
                </Text>
                <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
                  Madurai District Co-operative Milk Producers' Union • Real-Time Digital Twin
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <View style={[styles.liveSyncBadge, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7' }]}>
              <View style={styles.greenDot} />
              <Text style={[styles.liveSyncText, { color: isDark ? '#4ADE80' : '#15803D' }]}>
                Live District Nodes Synced
              </Text>
            </View>

            <Pressable
              style={({ hovered }: any) => [
                styles.dispatchBtn,
                hovered && styles.dispatchBtnHovered,
              ]}
              onPress={() => setShowDirectiveModal(true)}
            >
              <Ionicons name="flash-outline" size={15} color="#FFFFFF" />
              <Text style={styles.dispatchBtnText}>Issue Executive Directive</Text>
            </Pressable>
          </View>
        </View>

        {/* =========================================================================
            URGENT EXECUTIVE AUDIT BANNER (When Discrepancies or Pending Receipts exist)
           ========================================================================= */}
        {(stats.activeDiscrepanciesCount > 0 || stats.pendingReceiptsCount > 0) && (
          <View style={[styles.alertBanner, { backgroundColor: isDark ? 'rgba(220, 38, 38, 0.12)' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FCA5A5' }]}>
            <View style={styles.alertBannerLeft}>
              <View style={[styles.alertIconCircle, { backgroundColor: isDark ? '#991B1B' : '#FEE2E2' }]}>
                <Ionicons name="warning-outline" size={18} color={isDark ? '#FCA5A5' : '#DC2626'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertBannerTitle, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                  EXECUTIVE AUDIT REQUIRED: {stats.activeDiscrepanciesCount} Discrepancy Case(s)
                </Text>
                <Text style={[styles.alertBannerSub, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                  {stats.pendingReceiptsCount} BMC daily receipt(s) awaiting GM sign-off • Net shrinkage: {netTransitDiscrepancy.toFixed(1)} L
                </Text>
              </View>
            </View>

            <View style={styles.alertBannerActions}>
              {stats.pendingReceiptsCount > 0 && (
                <Pressable
                  style={[styles.alertActionSignBtn, { backgroundColor: isDark ? '#14532D' : '#DCFCE7', borderColor: isDark ? '#166534' : '#86EFAC' }]}
                  onPress={openSignOffWithFirst}
                >
                  <Ionicons name="checkmark-done" size={14} color="#15803D" />
                  <Text style={[styles.alertActionSignText, { color: isDark ? '#4ADE80' : '#15803D' }]}>
                    GM Sign-Off ({stats.pendingReceiptsCount})
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.alertActionAuditBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => router.push('/(union)/discrepancies' as any)}
              >
                <Text style={styles.alertActionAuditText}>Audit Cases</Text>
                <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        )}

        {/* =========================================================================
            ROW 1: TOP 4 KPI CARDS (Always Visible For Quick District Overview)
           ========================================================================= */}
        <View style={styles.kpiRow}>
          {/* KPI 1: Active Societies */}
          <Pressable
            style={({ hovered }: any) => [
              styles.kpiCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              hovered && styles.cardHovered,
            ]}
            onPress={() => router.push('/(union)/bmc-monitoring' as any)}
          >
            <View style={styles.kpiCardHeader}>
              <View style={[styles.kpiIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="storefront" size={16} color="#15803D" />
              </View>
              <View style={[styles.kpiPillBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.kpiPillText, { color: '#15803D' }]}>100% Online</Text>
              </View>
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Active Primary Societies</Text>
            <Text style={[styles.kpiBigNumber, { color: colors.text }]}>
              {booths.length > 0 ? booths.length : 24} <Text style={styles.kpiUnit}>DCS Units</Text>
            </Text>
            <Text style={[styles.kpiSub, { color: colors.textMuted }]}>All linked to {bmcs.length} BMC Chilling Hubs</Text>
          </Pressable>

          {/* KPI 2: Today's Volume Intake */}
          <Pressable
            style={({ hovered }: any) => [
              styles.kpiCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              hovered && styles.cardHovered,
            ]}
            onPress={() => router.push('/(union)/receipt-review' as any)}
          >
            <View style={styles.kpiCardHeader}>
              <View style={[styles.kpiIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="water" size={16} color="#1D4ED8" />
              </View>
              <View style={[styles.kpiPillBadge, { backgroundColor: '#DBEAFE' }]}>
                <Text style={[styles.kpiPillText, { color: '#1D4ED8' }]}>Intake OK</Text>
              </View>
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Today's District Intake</Text>
            <Text style={[styles.kpiBigNumber, { color: colors.primary }]}>
              {todayLitres.toFixed(1)} <Text style={styles.kpiUnit}>Litres</Text>
            </Text>
            <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Target daily baseline met</Text>
          </Pressable>

          {/* KPI 3: Today's Value */}
          <Pressable
            style={({ hovered }: any) => [
              styles.kpiCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              hovered && styles.cardHovered,
            ]}
            onPress={() => router.push('/(union)/receipt-review' as any)}
          >
            <View style={styles.kpiCardHeader}>
              <View style={[styles.kpiIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="cash" size={16} color="#B45309" />
              </View>
              <View style={[styles.kpiPillBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.kpiPillText, { color: '#B45309' }]}>@₹{procurementRatePerLitre}/L</Text>
              </View>
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Gross Procurement Value</Text>
            <Text style={[styles.kpiBigNumber, { color: colors.text }]}>
              ₹{(todayIncomeRevenue / 1000).toFixed(1)}k <Text style={styles.kpiUnit}>INR</Text>
            </Text>
            <Text style={[styles.kpiSub, { color: '#15803D' }]}>85% Direct Farmer DBT Share</Text>
          </Pressable>

          {/* KPI 4: Discrepancy & Health Audits */}
          <Pressable
            style={({ hovered }: any) => [
              styles.kpiCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              hovered && styles.cardHovered,
            ]}
            onPress={() => router.push('/(union)/discrepancies' as any)}
          >
            <View style={styles.kpiCardHeader}>
              <View style={[styles.kpiIconCircle, { backgroundColor: (discrepancyCases || []).length > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                <Ionicons name="shield-half" size={16} color={(discrepancyCases || []).length > 0 ? '#DC2626' : '#15803D'} />
              </View>
              <View style={[styles.kpiPillBadge, { backgroundColor: (discrepancyCases || []).length > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                <Text style={[styles.kpiPillText, { color: (discrepancyCases || []).length > 0 ? '#DC2626' : '#15803D' }]}>
                  {(discrepancyCases || []).length} Active Alerts
                </Text>
              </View>
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Discrepancies & Holds</Text>
            <Text style={[styles.kpiBigNumber, { color: (discrepancyCases || []).length > 0 ? '#DC2626' : colors.text }]}>
              {quarantineCowsCount} <Text style={styles.kpiUnit}>Quarantined</Text>
            </Text>
            <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Zero antibiotic milk entered BMCs</Text>
          </Pressable>
        </View>

        {/* =========================================================================
            TAB CONTENT 1: OVERVIEW TAB
           ========================================================================= */}
        {activeTabFilter === 'Overview' && (
          <>
            {/* MAIN 2-COLUMN ASYMMETRIC GRID */}
            <View style={styles.mainGridRow}>

              {/* LEFT COLUMN (60%): Today's Procurement Revenue + Productivity Trend Chart */}
              <View style={styles.leftCol}>

                {/* Section 1: Today's Milk Procurement & Financial Breakdown */}
                <View style={[styles.surfaceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardHeaderWithAction}>
                    <View style={styles.headerLeftBadgeGroup}>
                      <View style={[styles.headerIconSquare, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7' }]}>
                        <Ionicons name="cash-outline" size={18} color="#16A34A" />
                      </View>
                      <View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>
                          Today's Milk Procurement & Financial Distribution
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                          Calculated from {todayLitres.toFixed(1)} L intake @ standard Aavin procurement tariff
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.grossPillBadge, { backgroundColor: isDark ? '#132E1D' : '#F0FDF4', borderColor: isDark ? '#166534' : '#86EFAC' }]}>
                      <Text style={[styles.grossPillSub, { color: isDark ? '#86EFAC' : '#166534' }]}>District Total</Text>
                      <Text style={[styles.grossPillValue, { color: isDark ? '#4ADE80' : '#15803D' }]}>
                        ₹{todayIncomeRevenue.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {/* 3 Inline Distribution Cards */}
                  <View style={styles.incomeCardsRow}>
                    {/* 1: Farmers DBT */}
                    <View style={[styles.incomeMiniBox, { backgroundColor: isDark ? '#0E2819' : '#F0FDF4', borderColor: isDark ? '#166534' : '#BBF7D0' }]}>
                      <View style={styles.miniBoxHeader}>
                        <Ionicons name="people" size={16} color="#16A34A" />
                        <View style={[styles.miniBoxTag, { backgroundColor: isDark ? '#143C22' : '#DCFCE7' }]}>
                          <Text style={[styles.miniBoxTagText, { color: isDark ? '#4ADE80' : '#15803D' }]}>85% Direct</Text>
                        </View>
                      </View>
                      <Text style={[styles.miniBoxValue, { color: colors.text }]}>₹{farmerPayoutShare.toLocaleString('en-IN')}</Text>
                      <Text style={[styles.miniBoxLabel, { color: colors.textSecondary }]}>Farmer DBT Account Payout</Text>
                      <Text style={[styles.miniBoxSub, { color: colors.textMuted }]}>Direct bank credit</Text>
                    </View>

                    {/* 2: Tanker Logistics */}
                    <View style={[styles.incomeMiniBox, { backgroundColor: isDark ? '#0E2038' : '#EFF6FF', borderColor: isDark ? '#1E40AF' : '#BFDBFE' }]}>
                      <View style={styles.miniBoxHeader}>
                        <Ionicons name="bus" size={16} color="#2563EB" />
                        <View style={[styles.miniBoxTag, { backgroundColor: isDark ? '#132C4E' : '#DBEAFE' }]}>
                          <Text style={[styles.miniBoxTagText, { color: isDark ? '#60A5FA' : '#1D4ED8' }]}>10% Share</Text>
                        </View>
                      </View>
                      <Text style={[styles.miniBoxValue, { color: colors.text }]}>₹{logisticsShare.toLocaleString('en-IN')}</Text>
                      <Text style={[styles.miniBoxLabel, { color: colors.textSecondary }]}>Insulated Tanker Logistics</Text>
                      <Text style={[styles.miniBoxSub, { color: colors.textMuted }]}>Chill chain transit fee</Text>
                    </View>

                    {/* 3: Society Commission */}
                    <View style={[styles.incomeMiniBox, { backgroundColor: isDark ? '#231438' : '#FAF5FF', borderColor: isDark ? '#6B21A8' : '#E9D5FF' }]}>
                      <View style={styles.miniBoxHeader}>
                        <Ionicons name="business" size={16} color="#9333EA" />
                        <View style={[styles.miniBoxTag, { backgroundColor: isDark ? '#331B50' : '#F3E8FF' }]}>
                          <Text style={[styles.miniBoxTagText, { color: isDark ? '#C084FC' : '#7E22CE' }]}>5% Share</Text>
                        </View>
                      </View>
                      <Text style={[styles.miniBoxValue, { color: colors.text }]}>₹{societyIncentiveShare.toLocaleString('en-IN')}</Text>
                      <Text style={[styles.miniBoxLabel, { color: colors.textSecondary }]}>DCS Testing Allowance</Text>
                      <Text style={[styles.miniBoxSub, { color: colors.textMuted }]}>Society operating grant</Text>
                    </View>
                  </View>
                </View>

                {/* Section 2: 7-Day Inflow Productivity & Quality Chart */}
                <View style={[styles.surfaceCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
                  <View style={styles.cardHeaderWithAction}>
                    <View style={styles.headerLeftBadgeGroup}>
                      <View style={[styles.headerIconSquare, { backgroundColor: isDark ? '#1A2B44' : '#E0F2FE' }]}>
                        <Ionicons name="analytics" size={18} color="#0284C7" />
                      </View>
                      <View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>
                          7-Day District Inflow & Quality Analytics
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                          Daily volumetric receipts & ultrasonic quality index
                        </Text>
                      </View>
                    </View>

                    {/* Day selector pills */}
                    <View style={styles.dayPillsStrip}>
                      {daysData.map((d, idx) => (
                        <Pressable
                          key={d.day}
                          style={[
                            styles.dayPill,
                            selectedDayIdx === idx && { backgroundColor: colors.primary }
                          ]}
                          onPress={() => setSelectedDayIdx(idx)}
                        >
                          <Text style={[
                            styles.dayPillText,
                            { color: selectedDayIdx === idx ? '#FFFFFF' : colors.textSecondary },
                            selectedDayIdx === idx && { fontWeight: '800' }
                          ]}>
                            {d.day}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Chart SVG */}
                  <View style={styles.svgWrapper}>
                    <Svg width="100%" height={170} viewBox="0 0 680 170">
                      <Defs>
                        <SvgGradient id="desktopInflowGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor={colors.primary} stopOpacity="0.25" />
                          <Stop offset="1" stopColor={colors.primary} stopOpacity="0.0" />
                        </SvgGradient>
                      </Defs>

                      {/* Grid lines */}
                      <Line x1="40" y1="30" x2="660" y2="30" stroke={isDark ? '#334155' : '#E2E8F0'} strokeDasharray="4,4" />
                      <Line x1="40" y1="80" x2="660" y2="80" stroke={isDark ? '#334155' : '#E2E8F0'} strokeDasharray="4,4" />
                      <Line x1="40" y1="130" x2="660" y2="130" stroke={isDark ? '#334155' : '#E2E8F0'} />

                      {/* Area fill */}
                      <Path
                        d="M 80 130 L 80 90 L 210 65 L 340 70 L 470 100 L 600 50 L 600 130 Z"
                        fill="url(#desktopInflowGrad)"
                      />

                      {/* Trend line */}
                      <Path
                        d="M 80 90 L 210 65 L 340 70 L 470 100 L 600 50"
                        fill="none"
                        stroke={colors.primary}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      {/* Points */}
                      {[
                        { x: 80, y: 90, label: '738L' },
                        { x: 210, y: 65, label: '765L' },
                        { x: 340, y: 70, label: `${todayLitres.toFixed(0)}L` },
                        { x: 470, y: 100, label: '754L' },
                        { x: 600, y: 50, label: '808L' },
                      ].map((p, idx) => (
                        <React.Fragment key={idx}>
                          <Circle cx={p.x} cy={p.y} r={selectedDayIdx === idx ? 7 : 4} fill={selectedDayIdx === idx ? '#10B981' : colors.primary} stroke="#FFFFFF" strokeWidth="2" />
                          <SvgText x={p.x} y={p.y - 10} fontSize="11" fontWeight="700" fill={colors.text} textAnchor="middle">
                            {p.label}
                          </SvgText>
                        </React.Fragment>
                      ))}
                    </Svg>
                  </View>

                  {/* Bottom Metrics Bar */}
                  <View style={[styles.chartMetricsFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.chartMetricItem}>
                      <Text style={[styles.chartMetricLabel, { color: colors.textSecondary }]}>Selected Inflow</Text>
                      <Text style={[styles.chartMetricValue, { color: colors.text }]}>{currentPoint.inflow.toFixed(1)} L</Text>
                    </View>
                    <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.chartMetricItem}>
                      <Text style={[styles.chartMetricLabel, { color: colors.textSecondary }]}>Average Fat</Text>
                      <Text style={[styles.chartMetricValue, { color: '#16A34A' }]}>{currentPoint.fat}%</Text>
                    </View>
                    <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.chartMetricItem}>
                      <Text style={[styles.chartMetricLabel, { color: colors.textSecondary }]}>Average SNF</Text>
                      <Text style={[styles.chartMetricValue, { color: '#2563EB' }]}>{currentPoint.snf}%</Text>
                    </View>
                    <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.chartMetricItem}>
                      <Text style={[styles.chartMetricLabel, { color: colors.textSecondary }]}>Transit Shrinkage</Text>
                      <Text style={[styles.chartMetricValue, { color: currentPoint.loss > 0 ? '#DC2626' : '#16A34A' }]}>
                        {currentPoint.loss > 0 ? `-${currentPoint.loss} L` : '0.0 L'}
                      </Text>
                    </View>
                  </View>
                </View>

              </View>

              {/* RIGHT COLUMN (40%): Supply Chain Pipeline + Low-Yielding Booths */}
              <View style={styles.rightCol}>

                {/* Section 3: Supply Chain Stage Reconciliation */}
                <View style={[styles.surfaceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardHeaderWithAction}>
                    <View style={styles.headerLeftBadgeGroup}>
                      <View style={[styles.headerIconSquare, { backgroundColor: isDark ? '#2D1B44' : '#F3E8FF' }]}>
                        <Ionicons name="git-network" size={18} color="#9333EA" />
                      </View>
                      <View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Supply Chain Twin</Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Stage-wise retention</Text>
                      </View>
                    </View>

                    <View style={[styles.retentionPill, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7' }]}>
                      <Ionicons name="checkmark-circle" size={12} color="#15803D" />
                      <Text style={[styles.retentionPillText, { color: isDark ? '#4ADE80' : '#15803D' }]}>
                        {retentionPercent.toFixed(1)}% Retained
                      </Text>
                    </View>
                  </View>

                  {/* 3 Sequential Nodes */}
                  <View style={styles.pipelineNodesRow}>
                    {/* Node 1 */}
                    <View style={[styles.pipelineNodeBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                      <Text style={[styles.nodeTag, { color: colors.textSecondary }]}>1. DCS Intake</Text>
                      <Text style={[styles.nodeValue, { color: colors.text }]}>{stats.totalBoothDispatched.toFixed(0)} L</Text>
                      <Text style={[styles.nodeSub, { color: colors.textMuted }]}>Primary Societies</Text>
                    </View>

                    <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} style={{ marginHorizontal: 2 }} />

                    {/* Node 2 */}
                    <View style={[styles.pipelineNodeBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                      <Text style={[styles.nodeTag, { color: '#0284C7' }]}>2. BMC Chilled</Text>
                      <Text style={[styles.nodeValue, { color: colors.primary }]}>{stats.totalBmcReceived.toFixed(0)} L</Text>
                      <Text style={[styles.nodeSub, { color: colors.textMuted }]}>4 District Hubs</Text>
                    </View>

                    <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} style={{ marginHorizontal: 2 }} />

                    {/* Node 3 */}
                    <View style={[styles.pipelineNodeBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                      <Text style={[styles.nodeTag, { color: '#16A34A' }]}>3. Dairy Plant</Text>
                      <Text style={[styles.nodeValue, { color: '#16A34A' }]}>{stats.totalBmcReceived > 0 ? (stats.totalBmcReceived * 0.99).toFixed(0) : '0'} L</Text>
                      <Text style={[styles.nodeSub, { color: colors.textMuted }]}>Central Processing</Text>
                    </View>
                  </View>
                </View>

                {/* Section 4: Batch Delivery Reconciliation Card */}
                <View style={[styles.surfaceCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
                  <View style={styles.cardHeaderWithAction}>
                    <View style={styles.headerLeftBadgeGroup}>
                      <View style={[styles.headerIconSquare, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Ionicons name="pie-chart" size={18} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Batch Reconciliation</Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                          Verification status across {totalDeliveries} batches
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.sumPercentPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}>
                      <Pressable
                        style={[styles.toggleBtnMini, statusMode === 'sum' && { backgroundColor: colors.card }]}
                        onPress={() => setStatusMode('sum')}
                      >
                        <Text style={[styles.toggleBtnMiniText, { color: statusMode === 'sum' ? colors.primary : colors.textSecondary }]}>Σ</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.toggleBtnMini, statusMode === 'percent' && { backgroundColor: colors.card }]}
                        onPress={() => setStatusMode('percent')}
                      >
                        <Text style={[styles.toggleBtnMiniText, { color: statusMode === 'percent' ? colors.primary : colors.textSecondary }]}>%</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* 3 Status Bars */}
                  <View style={styles.statusBarsList}>
                    {/* Balanced */}
                    <View style={styles.statusRow}>
                      <View style={styles.statusLabelCol}>
                        <View style={[styles.statusDot, { backgroundColor: '#16A34A' }]} />
                        <Text style={[styles.statusText, { color: colors.text }]}>Balanced & Sealed</Text>
                      </View>
                      <Text style={[styles.statusVal, { color: '#16A34A' }]}>
                        {statusMode === 'sum' ? `${verifiedDeliveries} Batches` : `${((verifiedDeliveries / totalDeliveries) * 100).toFixed(0)}%`}
                      </Text>
                    </View>

                    {/* Discrepant */}
                    <View style={styles.statusRow}>
                      <View style={styles.statusLabelCol}>
                        <View style={[styles.statusDot, { backgroundColor: '#DC2626' }]} />
                        <Text style={[styles.statusText, { color: colors.text }]}>Active Discrepancies</Text>
                      </View>
                      <Text style={[styles.statusVal, { color: '#DC2626' }]}>
                        {statusMode === 'sum' ? `${stats.activeDiscrepanciesCount} Batches` : `${((stats.activeDiscrepanciesCount / totalDeliveries) * 100).toFixed(0)}%`}
                      </Text>
                    </View>

                    {/* Pending GM */}
                    <View style={styles.statusRow}>
                      <View style={styles.statusLabelCol}>
                        <View style={[styles.statusDot, { backgroundColor: '#2563EB' }]} />
                        <Text style={[styles.statusText, { color: colors.text }]}>Pending GM Sign-Off</Text>
                      </View>
                      <Text style={[styles.statusVal, { color: '#2563EB' }]}>
                        {statusMode === 'sum' ? `${stats.pendingReceiptsCount} Receipts` : `${((stats.pendingReceiptsCount / (bmcReceipts.length || 1)) * 100).toFixed(0)}%`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Section 5: Low-Yielding Booths Watchlist */}
                <View style={[styles.surfaceCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
                  <View style={styles.cardHeaderWithAction}>
                    <View style={styles.headerLeftBadgeGroup}>
                      <View style={[styles.headerIconSquare, { backgroundColor: isDark ? '#3E1818' : '#FEE2E2' }]}>
                        <Ionicons name="trending-down" size={18} color="#DC2626" />
                      </View>
                      <View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Low-Yield DCS Watchlist</Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Month-over-month yield deficit</Text>
                      </View>
                    </View>
                  </View>

                  {/* Booth List */}
                  <View style={styles.boothsList}>
                    {boothComparisons.map((b) => (
                      <View
                        key={b.id}
                        style={[
                          styles.boothItemRow,
                          { borderBottomColor: colors.border },
                          b.isLowest && { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2', borderRadius: 10, paddingHorizontal: 10 }
                        ]}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.boothItemTitle, { color: colors.text }]} numberOfLines={1}>
                            {b.name}
                          </Text>
                          <Text style={[styles.boothItemSub, { color: colors.textSecondary }]} numberOfLines={1}>
                            {b.assignedBmc} • Op: {b.operator}
                          </Text>
                        </View>

                        <View style={styles.boothItemRight}>
                          <Text style={[styles.boothLitres, { color: colors.text }]}>{b.currentMonthLitres} L</Text>
                          <View style={[styles.boothChangeBadge, { backgroundColor: b.changePercent < 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                            <Text style={[styles.boothChangeText, { color: b.changePercent < 0 ? '#DC2626' : '#15803D' }]}>
                              {b.changePercent > 0 ? `+${b.changePercent}%` : `${b.changePercent}%`}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    style={[styles.inquiryActionBtn, { borderColor: isDark ? '#5C1D1D' : '#FCA5A5' }]}
                    onPress={() => {
                      setTargetBmcId(bmcs[0]?.id || 'bmc-1');
                      setDirectiveCategory('Low Yield Inquiry');
                      setDirectiveText(`Executive Inquiry for ${lowestBooth.name}: Explain volume drop of ${lowestBooth.changePercent}% compared to previous month average.`);
                      setShowDirectiveModal(true);
                    }}
                  >
                    <Ionicons name="document-text-outline" size={14} color="#DC2626" />
                    <Text style={styles.inquiryActionText}>Issue Direct Inquiry Order to Lowest DCS</Text>
                  </Pressable>
                </View>

              </View>
            </View>

            {/* =========================================================================
                DISTRICT EXECUTIVE ACCESS HUB (Village Booths, MCP Coolers, Herd, Payments)
               ========================================================================= */}
            <View style={[styles.surfaceCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
              <View style={styles.cardHeaderWithAction}>
                <View style={styles.headerLeftBadgeGroup}>
                  <View style={[styles.headerIconSquare, { backgroundColor: isDark ? '#2D1B44' : '#F3E8FF' }]}>
                    <Ionicons name="grid-outline" size={18} color="#7C3AED" />
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>District Executive Access Hub</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                      Full administrative command for Booths, MCP Coolers, Farmers, Cattle Herd & DBT Payments
                    </Text>
                  </View>
                </View>

                <View style={[styles.fullAccessRolePill, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : '#F3E8FF' }]}>
                  <Ionicons name="shield-checkmark" size={13} color="#7C3AED" />
                  <Text style={[styles.fullAccessRoleText, { color: isDark ? '#C084FC' : '#7C3AED' }]}>GM High Privilege</Text>
                </View>
              </View>

              <View style={styles.accessGrid}>
                {/* Access 1: Booths */}
                <Pressable
                  style={({ hovered }: any) => [
                    styles.accessCard,
                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border },
                    hovered && styles.cardHovered,
                  ]}
                  onPress={() => router.push('/(booth)' as any)}
                >
                  <View style={[styles.accessIconCircle, { backgroundColor: isDark ? '#132840' : '#E0F2FE' }]}>
                    <Ionicons name="storefront" size={20} color="#0284C7" />
                  </View>
                  <Text style={[styles.accessTitle, { color: colors.text }]}>Village Booths</Text>
                  <Text style={[styles.accessStat, { color: colors.primary }]}>{booths.length} Societies</Text>
                  <Text style={[styles.accessDesc, { color: colors.textSecondary }]}>Record milk, sessions, dispatch manifests</Text>
                  <View style={styles.accessLinkRow}>
                    <Text style={[styles.accessLinkText, { color: colors.primary }]}>Manage Booths</Text>
                    <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                  </View>
                </Pressable>

                {/* Access 2: MCP Coolers */}
                <Pressable
                  style={({ hovered }: any) => [
                    styles.accessCard,
                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border },
                    hovered && styles.cardHovered,
                  ]}
                  onPress={() => router.push('/(union)/bmc-monitoring' as any)}
                >
                  <View style={[styles.accessIconCircle, { backgroundColor: isDark ? '#132E1D' : '#DCFCE7' }]}>
                    <Ionicons name="snow" size={20} color="#16A34A" />
                  </View>
                  <Text style={[styles.accessTitle, { color: colors.text }]}>MCP Chilling Hubs</Text>
                  <Text style={[styles.accessStat, { color: '#16A34A' }]}>{bmcs.length} Bulk Coolers</Text>
                  <Text style={[styles.accessDesc, { color: colors.textSecondary }]}>3.8°C temperature telemetry, flow meters</Text>
                  <View style={styles.accessLinkRow}>
                    <Text style={[styles.accessLinkText, { color: '#16A34A' }]}>Inspect MCPs</Text>
                    <Ionicons name="arrow-forward" size={12} color="#16A34A" />
                  </View>
                </Pressable>

                {/* Access 3: Herd */}
                <Pressable
                  style={({ hovered }: any) => [
                    styles.accessCard,
                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border },
                    hovered && styles.cardHovered,
                  ]}
                  onPress={() => router.push('/(veterinary)/cattle-registry' as any)}
                >
                  <View style={[styles.accessIconCircle, { backgroundColor: isDark ? '#381628' : '#FDF2F8' }]}>
                    <Ionicons name="heart" size={20} color="#EC4899" />
                  </View>
                  <Text style={[styles.accessTitle, { color: colors.text }]}>Herd & Pashu Aadhaar</Text>
                  <Text style={[styles.accessStat, { color: '#EC4899' }]}>{cows.length} Tagged Cows</Text>
                  <Text style={[styles.accessDesc, { color: colors.textSecondary }]}>
                    {farmers.length} Farmers • {quarantineCowsCount > 0 ? `${quarantineCowsCount} on withdrawal` : 'Zero hold'}
                  </Text>
                  <View style={styles.accessLinkRow}>
                    <Text style={[styles.accessLinkText, { color: '#EC4899' }]}>View Herd</Text>
                    <Ionicons name="arrow-forward" size={12} color="#EC4899" />
                  </View>
                </Pressable>

                {/* Access 4: Payments */}
                <Pressable
                  style={({ hovered }: any) => [
                    styles.accessCard,
                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border },
                    hovered && styles.cardHovered,
                  ]}
                  onPress={() => router.push('/(farmer)/payments' as any)}
                >
                  <View style={[styles.accessIconCircle, { backgroundColor: isDark ? '#261447' : '#FAF5FF' }]}>
                    <Ionicons name="wallet" size={20} color="#9333EA" />
                  </View>
                  <Text style={[styles.accessTitle, { color: colors.text }]}>DBT Payments</Text>
                  <Text style={[styles.accessStat, { color: '#9333EA' }]}>₹{(todayIncomeRevenue / 1000).toFixed(1)}k Today</Text>
                  <Text style={[styles.accessDesc, { color: colors.textSecondary }]}>Bank account IFSC, milk supply credit passbook</Text>
                  <View style={styles.accessLinkRow}>
                    <Text style={[styles.accessLinkText, { color: '#9333EA' }]}>Review Payments</Text>
                    <Ionicons name="arrow-forward" size={12} color="#9333EA" />
                  </View>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {/* =========================================================================
            TAB CONTENT 2: BOOTHS & LOW YIELD TAB
           ========================================================================= */}
        {activeTabFilter === 'Booths & Low Yield' && (
          <View style={[styles.surfaceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderWithAction}>
              <View style={styles.headerLeftBadgeGroup}>
                <View style={[styles.headerIconSquare, { backgroundColor: isDark ? '#3E1818' : '#FEE2E2' }]}>
                  <Ionicons name="trending-down" size={18} color="#DC2626" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Booth Low-Yield Analysis vs Previous Month</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    Comparative volume deficit audit identifying collection centers below benchmark
                  </Text>
                </View>
              </View>

              <View style={[styles.lowYieldBadge, { backgroundColor: isDark ? '#3E1818' : '#FEE2E2' }]}>
                <Text style={[styles.lowYieldBadgeText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>1 Deficit Alert</Text>
              </View>
            </View>

            {/* Critical Low-Yield Warning Banner */}
            <View style={[styles.lowYieldBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FCA5A5' }]}>
              <View style={styles.lowYieldBannerHeader}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text style={[styles.lowYieldBannerTitle, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                  LOWEST PRODUCING BOOTH: {lowestBooth.name}
                </Text>
              </View>
              <Text style={[styles.lowYieldBannerDesc, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                Supplied only <Text style={{ fontWeight: '800' }}>{lowestBooth.currentMonthLitres} L</Text> this month vs <Text style={{ fontWeight: '800' }}>{lowestBooth.prevMonthLitres} L</Text> last month ({lowestBooth.changePercent}% Drop). Reason: {lowestBooth.reason}.
              </Text>
              <Pressable
                style={[styles.inquiryBtnSolid, { backgroundColor: '#DC2626' }]}
                onPress={() => {
                  setTargetBmcId(bmcs[0]?.id || 'bmc-1');
                  setDirectiveCategory('Low Yield Inquiry');
                  setDirectiveText(`Executive Inquiry for ${lowestBooth.name}: Explain volume drop of ${lowestBooth.changePercent}% compared to previous month average.`);
                  setShowDirectiveModal(true);
                }}
              >
                <Ionicons name="document-text-outline" size={14} color="#FFFFFF" />
                <Text style={styles.inquiryBtnSolidText}>Issue Executive Inquiry to Operator</Text>
              </Pressable>
            </View>

            {/* Full Comparative Table */}
            <View style={styles.boothTableContainer}>
              {boothComparisons.map((b) => {
                const isNegative = b.changePercent < 0;
                return (
                  <View
                    key={b.id}
                    style={[
                      styles.boothTableRow,
                      { borderBottomColor: colors.border },
                      b.isLowest && { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.05)' : '#FFF5F5' },
                    ]}
                  >
                    <View style={styles.boothTableColInfo}>
                      <View style={[styles.boothCodeTag, { backgroundColor: isNegative ? (isDark ? '#3E1818' : '#FEE2E2') : (isDark ? '#132E1D' : '#DCFCE7') }]}>
                        <Text style={[styles.boothCodeText, { color: isNegative ? (isDark ? '#FCA5A5' : '#DC2626') : (isDark ? '#4ADE80' : '#15803D') }]}>
                          {b.code}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.boothTableName, { color: colors.text }]}>{b.name}</Text>
                        <Text style={[styles.boothTableSub, { color: colors.textSecondary }]}>
                          Operator: {b.operator} • In-Charge: {b.assignedBmc}
                        </Text>
                        <Text style={[styles.boothTableReason, { color: colors.textMuted }]}>{b.reason}</Text>
                      </View>
                    </View>

                    <View style={styles.boothTableColMetrics}>
                      <View style={styles.boothMetricCell}>
                        <Text style={[styles.boothMetricLabel, { color: colors.textSecondary }]}>This Month</Text>
                        <Text style={[styles.boothMetricVal, { color: isNegative ? '#DC2626' : colors.text }]}>
                          {b.currentMonthLitres.toFixed(1)} L
                        </Text>
                      </View>

                      <View style={[styles.tableDivider, { backgroundColor: colors.border }]} />

                      <View style={styles.boothMetricCell}>
                        <Text style={[styles.boothMetricLabel, { color: colors.textSecondary }]}>Prev Month</Text>
                        <Text style={[styles.boothMetricVal, { color: colors.text }]}>
                          {b.prevMonthLitres.toFixed(1)} L
                        </Text>
                      </View>

                      <View style={[styles.varianceBadgeBig, { backgroundColor: isNegative ? (isDark ? '#3E1818' : '#FEE2E2') : (isDark ? '#132E1D' : '#DCFCE7') }]}>
                        <Ionicons
                          name={isNegative ? "arrow-down" : "arrow-up"}
                          size={13}
                          color={isNegative ? (isDark ? '#FCA5A5' : "#DC2626") : (isDark ? '#4ADE80' : "#16A34A")}
                        />
                        <Text style={[styles.varianceTextBig, { color: isNegative ? (isDark ? '#FCA5A5' : "#DC2626") : (isDark ? '#4ADE80' : "#16A34A") }]}>
                          {Math.abs(b.changePercent)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* =========================================================================
            TAB CONTENT 3: MCP CHILLING TAB
           ========================================================================= */}
        {activeTabFilter === 'MCP Chilling' && (
          <View style={[styles.surfaceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderWithAction}>
              <View style={styles.headerLeftBadgeGroup}>
                <View style={[styles.headerIconSquare, { backgroundColor: isDark ? '#132E1D' : '#DCFCE7' }]}>
                  <Ionicons name="snow" size={18} color="#16A34A" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>District Bulk Milk Cooling Infrastructure</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    4 Active Central BMC Centers • Continuous 3.8°C chilling telemetry
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.viewMoreBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(union)/bmc-monitoring' as any)}
              >
                <Text style={styles.viewMoreBtnText}>Open BMC Monitoring</Text>
                <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.bmcsGrid}>
              {bmcs.map((bmc, idx) => (
                <View
                  key={bmc.id}
                  style={[
                    styles.bmcFocalCard,
                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }
                  ]}
                >
                  <View style={styles.bmcFocalHeader}>
                    <View style={styles.bmcRankPill}>
                      <Text style={styles.bmcRankText}>#{idx + 1}</Text>
                    </View>
                    <View style={[styles.tempPill, { backgroundColor: isDark ? '#143C22' : '#DCFCE7' }]}>
                      <Ionicons name="thermometer" size={12} color="#16A34A" />
                      <Text style={[styles.tempPillText, { color: isDark ? '#4ADE80' : '#16A34A' }]}>3.8°C OK</Text>
                    </View>
                  </View>

                  <Text style={[styles.bmcFocalName, { color: colors.text }]}>{bmc.name}</Text>
                  <Text style={[styles.bmcFocalLoc, { color: colors.textSecondary }]}>
                    Location: {bmc.location} • In-Charge: {bmc.managerName}
                  </Text>

                  <View style={styles.bmcMetricsRow}>
                    <View>
                      <Text style={[styles.bmcMetricLabel, { color: colors.textSecondary }]}>Measured Intake</Text>
                      <Text style={[styles.bmcMetricValue, { color: colors.primary }]}>
                        {(todayLitres / bmcs.length).toFixed(1)} L
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.bmcMetricLabel, { color: colors.textSecondary }]}>Tank Utilization</Text>
                      <Text style={[styles.bmcMetricValue, { color: '#16A34A' }]}>78% Full</Text>
                    </View>
                  </View>

                  <Pressable
                    style={[styles.inspectCenterBtn, { borderColor: colors.primary }]}
                    onPress={() => router.push({ pathname: '/(union)/bmc-analytics' as any, params: { bmcId: bmc.id } })}
                  >
                    <Text style={[styles.inspectCenterBtnText, { color: colors.primary }]}>Inspect Facility Trends</Text>
                    <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* =========================================================================
            TAB CONTENT 4: HERD & COWS TAB
           ========================================================================= */}
        {activeTabFilter === 'Herd & Cows' && (
          <View style={[styles.surfaceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderWithAction}>
              <View style={styles.headerLeftBadgeGroup}>
                <View style={[styles.headerIconSquare, { backgroundColor: isDark ? '#381628' : '#FDF2F8' }]}>
                  <Ionicons name="heart" size={18} color="#EC4899" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>District Livestock Census & Pashu Aadhaar</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    RFID tagged dairy herd registry • Medicine withdrawal enforcement
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.viewMoreBtn, { backgroundColor: '#EC4899' }]}
                onPress={() => router.push('/(veterinary)/cattle-registry' as any)}
              >
                <Text style={styles.viewMoreBtnText}>Open Cattle Registry</Text>
                <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* 3 Summary Census Stats */}
            <View style={styles.herdCensusRow}>
              <View style={[styles.herdStatBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                <Text style={[styles.herdStatLabel, { color: colors.textSecondary }]}>Total Registered Herd</Text>
                <Text style={[styles.herdStatNum, { color: colors.text }]}>{cows.length} Tagged</Text>
                <Text style={[styles.herdStatSub, { color: colors.textMuted }]}>{farmers.length} Dairy Farmers</Text>
              </View>

              <View style={[styles.herdStatBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                <Text style={[styles.herdStatLabel, { color: colors.textSecondary }]}>Active Lactation</Text>
                <Text style={[styles.herdStatNum, { color: '#16A34A' }]}>{Math.max(1, cows.length - quarantineCowsCount)} Cows</Text>
                <Text style={[styles.herdStatSub, { color: '#16A34A' }]}>Supplying Daily Milk</Text>
              </View>

              <View style={[styles.herdStatBox, { backgroundColor: isDark ? '#3E1818' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FCA5A5' }]}>
                <Text style={[styles.herdStatLabel, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>Quarantine Holds</Text>
                <Text style={[styles.herdStatNum, { color: '#DC2626' }]}>{quarantineCowsCount} Cows</Text>
                <Text style={[styles.herdStatSub, { color: '#DC2626' }]}>Zero Antibiotic Leakage</Text>
              </View>
            </View>

            {/* Milk Safety Guarantee */}
            <View style={[styles.safetyGuaranteeBox, { backgroundColor: isDark ? '#143C22' : '#F0FDF4', borderColor: isDark ? '#166534' : '#86EFAC' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#16A34A" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.safetyTitle, { color: isDark ? '#86EFAC' : '#166534' }]}>
                  100% Quality Assured Milk Supply
                </Text>
                <Text style={[styles.safetyDesc, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                  All {cows.length} cattle are registered on Pashu Aadhaar digital twin. Any cows receiving antibiotic or dewormer therapy are automatically flagged and prohibited from dispatching milk until full withdrawal clearance.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* =========================================================================
            TAB CONTENT 5: PAYMENTS TAB
           ========================================================================= */}
        {activeTabFilter === 'Payments' && (
          <View style={[styles.surfaceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderWithAction}>
              <View style={styles.headerLeftBadgeGroup}>
                <View style={[styles.headerIconSquare, { backgroundColor: isDark ? '#261447' : '#FAF5FF' }]}>
                  <Ionicons name="wallet" size={18} color="#9333EA" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Farmer Direct Benefit Transfer (DBT) & Tariff Settlement</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    Automated bank clearance breakdown for today's district procurement
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.viewMoreBtn, { backgroundColor: '#9333EA' }]}
                onPress={() => router.push('/(farmer)/payments' as any)}
              >
                <Text style={styles.viewMoreBtnText}>View Payment Ledger</Text>
                <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Payout Distribution Details */}
            <View style={styles.payoutGrid}>
              <View style={[styles.payoutCard, { backgroundColor: isDark ? '#0E2819' : '#F0FDF4', borderColor: isDark ? '#166534' : '#BBF7D0' }]}>
                <Text style={[styles.payoutLabel, { color: '#16A34A' }]}>Farmer DBT Share (85%)</Text>
                <Text style={[styles.payoutAmount, { color: colors.text }]}>₹{farmerPayoutShare.toLocaleString('en-IN')}</Text>
                <Text style={[styles.payoutDesc, { color: colors.textMuted }]}>
                  Direct credit to registered Canara Bank / SBI accounts based on fat & SNF testing.
                </Text>
              </View>

              <View style={[styles.payoutCard, { backgroundColor: isDark ? '#0E2038' : '#EFF6FF', borderColor: isDark ? '#1E40AF' : '#BFDBFE' }]}>
                <Text style={[styles.payoutLabel, { color: '#2563EB' }]}>Tanker Transit Logistics (10%)</Text>
                <Text style={[styles.payoutAmount, { color: colors.text }]}>₹{logisticsShare.toLocaleString('en-IN')}</Text>
                <Text style={[styles.payoutDesc, { color: colors.textMuted }]}>
                  Insulated cold-chain transport allowance from village booths to BMC chillers.
                </Text>
              </View>

              <View style={[styles.payoutCard, { backgroundColor: isDark ? '#231438' : '#FAF5FF', borderColor: isDark ? '#6B21A8' : '#E9D5FF' }]}>
                <Text style={[styles.payoutLabel, { color: '#9333EA' }]}>DCS Testing Commission (5%)</Text>
                <Text style={[styles.payoutAmount, { color: colors.text }]}>₹{societyIncentiveShare.toLocaleString('en-IN')}</Text>
                <Text style={[styles.payoutDesc, { color: colors.textMuted }]}>
                  Society operating allowance for ultrasonic testing, sampling, and data entry.
                </Text>
              </View>
            </View>
          </View>
        )}

      </View>

      {/* =========================================================================
          EXECUTIVE DIRECTIVE MODAL
         ========================================================================= */}
      <Modal visible={showDirectiveModal} transparent animationType="fade" onRequestClose={() => setShowDirectiveModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowDirectiveModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Issue Union Executive Directive</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Dispatched from District General Manager Office</Text>
              </View>
              <Pressable onPress={() => setShowDirectiveModal(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Target Bulk Milk Chilling Center</Text>
            <View style={styles.pillSelectorRow}>
              {bmcs.map(b => (
                <Pressable
                  key={b.id}
                  style={[
                    styles.selectorPill,
                    { backgroundColor: targetBmcId === b.id ? colors.primary : isDark ? '#1E293B' : '#F1F5F9' }
                  ]}
                  onPress={() => setTargetBmcId(b.id)}
                >
                  <Text style={[
                    styles.selectorPillText,
                    { color: targetBmcId === b.id ? '#FFFFFF' : colors.textSecondary }
                  ]}>
                    {b.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 12 }]}>Directive Instructions</Text>
            <TextInput
              placeholder="Enter concrete audit order, investigation instructions or quality hold details..."
              placeholderTextColor={colors.textMuted}
              value={directiveText}
              onChangeText={setDirectiveText}
              multiline
              numberOfLines={4}
              style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowDirectiveModal(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleDispatchDirective}>
                <Ionicons name="paper-plane-outline" size={15} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Dispatch Executive Order</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* =========================================================================
          QUICK GM SIGN-OFF MODAL
         ========================================================================= */}
      <Modal visible={showSignOffModal} transparent animationType="fade" onRequestClose={() => setShowSignOffModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSignOffModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>GM Sign-Off & Seal Daily Receipt</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Executive Certification for BMC Intake Slips</Text>
              </View>
              <Pressable onPress={() => setShowSignOffModal(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Select Pending Daily Slip</Text>
            {pendingReceipts.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 13, marginVertical: 8 }}>
                All received slips have already been signed off by the GM.
              </Text>
            ) : (
              <View style={styles.pendingReceiptsList}>
                {pendingReceipts.map(r => {
                  const isSel = selectedReceiptId === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      style={[
                        styles.pendingSlipItem,
                        { borderColor: isSel ? colors.primary : colors.border, backgroundColor: isSel ? (isDark ? 'rgba(0, 114, 188, 0.15)' : '#EFF6FF') : (isDark ? '#1E293B' : '#F8FAFC') }
                      ]}
                      onPress={() => setSelectedReceiptId(r.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pendingSlipTitle, { color: colors.text }]}>Slip #{r.id} • {r.bmcName}</Text>
                        <Text style={[styles.pendingSlipSub, { color: colors.textSecondary }]}>
                          Received: {r.totalReceivedQuantity} L • Declared: {r.totalDeclaredQuantity} L • Diff: {r.netDifference.toFixed(1)} L
                        </Text>
                      </View>
                      <Ionicons
                        name={isSel ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={isSel ? colors.primary : colors.textMuted}
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 12 }]}>GM Audit Directives & Notes</Text>
            <TextInput
              placeholder="e.g. Audit findings: volume verified, chilling temp 3.8°C compliant, zero adulteration certified."
              placeholderTextColor={colors.textMuted}
              value={signOffNotes}
              onChangeText={setSignOffNotes}
              multiline
              numberOfLines={3}
              style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowSignOffModal(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.submitBtn, { backgroundColor: '#16A34A' }]} onPress={handleSignOffReceipt}>
                <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Confirm Sign-Off & Seal Receipt</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
  canvasContainer: {
    paddingTop: 20,
    paddingBottom: 110,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  contentConstrained: {
    width: '100%',
    maxWidth: 1160,
    gap: 15,
  },

  /* Header */
  desktopHeaderStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCrestCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  liveSyncText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    cursor: 'pointer' as any,
  },
  dispatchBtnHovered: {
    backgroundColor: '#1E293B',
  },
  dispatchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Alert Notice Banner */
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    flexWrap: 'wrap',
  },
  alertBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 300,
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  alertBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  alertBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertActionSignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  alertActionSignText: {
    fontSize: 12,
    fontWeight: '800',
  },
  alertActionAuditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    cursor: 'pointer' as any,
  },
  alertActionAuditText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Filter Tabs */
  filterStrip: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    cursor: 'pointer' as any,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* KPI Cards */
  kpiRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 240,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  cardHovered: {
    transform: [{ translateY: -2 }],
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  kpiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  kpiPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiBigNumber: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  kpiUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  kpiSub: {
    fontSize: 11,
    marginTop: 4,
  },

  /* Main Grid */
  mainGridRow: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  leftCol: {
    flex: 1,
    minWidth: 480,
  },
  rightCol: {
    flex: 1,
    minWidth: 360,
  },

  /* Surface Cards */
  surfaceCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  headerLeftBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 260,
  },
  headerIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  grossPillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'flex-end',
  },
  grossPillSub: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  grossPillValue: {
    fontSize: 14,
    fontWeight: '900',
  },

  /* Income Mini Boxes */
  incomeCardsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  incomeMiniBox: {
    flex: 1,
    minWidth: 160,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  miniBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniBoxTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBoxTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  miniBoxValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  miniBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  miniBoxSub: {
    fontSize: 10,
    marginTop: 2,
  },

  /* 7-Day Chart */
  dayPillsStrip: {
    flexDirection: 'row',
    gap: 4,
  },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  svgWrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
  },
  chartMetricsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  chartMetricItem: {
    alignItems: 'center',
  },
  chartMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  chartMetricValue: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  footerDivider: {
    width: 1,
    height: 24,
  },

  /* Supply Chain */
  retentionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retentionPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pipelineNodesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pipelineNodeBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  nodeTag: {
    fontSize: 10,
    fontWeight: '800',
  },
  nodeValue: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  nodeSub: {
    fontSize: 9,
    marginTop: 1,
  },

  /* Batch Reconciliation Status Bars */
  sumPercentPill: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnMini: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    cursor: 'pointer' as any,
  },
  toggleBtnMiniText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusBarsList: {
    gap: 10,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusVal: {
    fontSize: 12,
    fontWeight: '800',
  },

  /* Low Yield Watchlist */
  boothsList: {
    gap: 6,
  },
  boothItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  boothItemTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  boothItemSub: {
    fontSize: 10,
    marginTop: 1,
  },
  boothItemRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  boothLitres: {
    fontSize: 12,
    fontWeight: '800',
  },
  boothChangeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  boothChangeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  inquiryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    cursor: 'pointer' as any,
  },
  inquiryActionText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Access Hub */
  fullAccessRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fullAccessRoleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  accessGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  accessCard: {
    flex: 1,
    minWidth: 220,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  accessIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  accessTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  accessStat: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  accessDesc: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  accessLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  accessLinkText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Tab 2: Booths & Low Yield Styles */
  lowYieldBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lowYieldBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  lowYieldBanner: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 12,
    gap: 8,
  },
  lowYieldBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lowYieldBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  lowYieldBannerDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  inquiryBtnSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
    cursor: 'pointer' as any,
    marginTop: 4,
  },
  inquiryBtnSolidText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  boothTableContainer: {
    gap: 8,
    marginTop: 6,
  },
  boothTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 12,
  },
  boothTableColInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 280,
  },
  boothCodeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  boothCodeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  boothTableName: {
    fontSize: 13,
    fontWeight: '800',
  },
  boothTableSub: {
    fontSize: 11,
    marginTop: 2,
  },
  boothTableReason: {
    fontSize: 10,
    marginTop: 2,
    fontStyle: 'italic',
  },
  boothTableColMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  boothMetricCell: {
    alignItems: 'center',
  },
  boothMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  boothMetricVal: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  tableDivider: {
    width: 1,
    height: 24,
  },
  varianceBadgeBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  varianceTextBig: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Tab 3: MCP Chilling Styles */
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    cursor: 'pointer' as any,
  },
  viewMoreBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  bmcsGrid: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  bmcFocalCard: {
    flex: 1,
    minWidth: 240,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  bmcFocalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bmcRankPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bmcRankText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  tempPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tempPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  bmcFocalName: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  bmcFocalLoc: {
    fontSize: 11,
  },
  bmcMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  bmcMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  bmcMetricValue: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  inspectCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    cursor: 'pointer' as any,
  },
  inspectCenterBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Tab 4: Herd Styles */
  herdCensusRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  herdStatBox: {
    flex: 1,
    minWidth: 200,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  herdStatLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  herdStatNum: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  herdStatSub: {
    fontSize: 11,
    marginTop: 2,
  },
  safetyGuaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  safetyTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  safetyDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  /* Tab 5: Payments Styles */
  payoutGrid: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  payoutCard: {
    flex: 1,
    minWidth: 240,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  payoutLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '900',
  },
  payoutDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 580,
    borderRadius: 18,
    padding: 24,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  pillSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  selectorPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    cursor: 'pointer' as any,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    cursor: 'pointer' as any,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Pending Slips List */
  pendingReceiptsList: {
    gap: 8,
    maxHeight: 200,
  },
  pendingSlipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  pendingSlipTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  pendingSlipSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
