import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Pressable } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function BoothProfileScreen() {
  const { booths, bmcs, farmers, milkRecords, boothReceipts, cows } = useAavinStore();
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0] || { name: 'Kallandiri Milk Collection Center', code: 'BOOTH-401' };
  const assignedBmc = bmcs.find(b => b.id === (booth as any).assignedBmcId) || bmcs[0] || { name: 'Alanganallur BMC Center', id: 'BMC001' };

  // Farmers and cattle data
  const assignedFarmers = farmers.filter(f => f.assignedBoothId === booth.id);
  const assignedFarmerIds = new Set(assignedFarmers.map(f => f.id));
  const totalCows = cows.filter(c => assignedFarmerIds.has(c.farmerId)).length;

  // Receipts and records
  const boothRecords = milkRecords.filter(r => r.boothId === booth.id);
  const myReceipts = boothReceipts.filter(r => r.boothId === booth.id);

  // Today collection metrics
  const todayStr = '2026-10-12';
  const todayRecords = boothRecords.filter(r => r.collectionDate === todayStr);
  const todayLitres = todayRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
  const farmerWiseLitres = todayRecords.filter(r => r.measurementMethod === 'farmer_wise').reduce((sum, r) => sum + r.quantityLitres, 0);
  const vendorLitres = todayRecords.filter(r => r.measurementMethod === 'combined').reduce((sum, r) => sum + r.quantityLitres, 0);

  // Active participating farmers count today
  const activeFarmersToday = new Set(todayRecords.filter(r => r.farmerId).map(r => r.farmerId)).size;
  const attendancePercent = assignedFarmers.length > 0 
    ? Math.round((activeFarmersToday / assignedFarmers.length) * 100) 
    : 0;

  // 7-Day Production Chart Data
  const weeklyChartData = [
    { day: '06 Oct', morning: 390.0, evening: 330.0, total: 720.0 },
    { day: '07 Oct', morning: 410.0, evening: 350.0, total: 760.0 },
    { day: '08 Oct', morning: 395.0, evening: 360.0, total: 755.0 },
    { day: '09 Oct', morning: 420.0, evening: 370.0, total: 790.0 },
    { day: '10 Oct', morning: 405.0, evening: 365.0, total: 770.0 },
    { day: '11 Oct', morning: 430.0, evening: 380.0, total: 810.0 },
    { day: '12 Oct', morning: 460.5, evening: 320.0, total: todayLitres > 0 ? todayLitres : 780.5 },
  ];

  const maxChartVal = Math.max(...weeklyChartData.map(d => d.total), 900);
  const chartHeight = 160;
  const chartWidth = 320;
  const barWidth = 24;
  const gap = (chartWidth - weeklyChartData.length * barWidth) / (weeklyChartData.length + 1);

  // Time-frame toggle state
  const [activeChartMetric, setActiveChartMetric] = useState<'volume' | 'producers'>('volume');

  const handleLogout = () => {
    Alert.alert(
      'Sign Out of Booth Portal',
      'Are you sure you want to sign out? You will need to log back in to record milk entries.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Society Operator Profile"
        subtitle={`Staff Identity & Analytics • ${booth.name}`}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Official Staff Credential Card */}
        <Card style={styles.credentialCard}>
          <View style={styles.credentialHeader}>
            {/* Verified Profile Avatar with Green Circle & Badge */}
            <View style={styles.avatarContainer}>
              <View style={styles.verifiedGreenCircle}>
                <View style={styles.staffAvatar}>
                  <Text style={styles.avatarInitials}>
                    {(user?.fullName || "K. Murugan").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.verifiedCheckBadge}>
                <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[Typography.title2, { color: colors.text, fontWeight: '900' }]}>
                {user?.fullName || "K. Murugan"}
              </Text>

              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
                Intake Station Lead • Operator ID: {user?.associatedId || "BOOTH_OPERATOR"}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                Aavin Madurai District Co-operative Milk Producers' Union
              </Text>
            </View>
          </View>

          {/* Facility & Node Mapping Corridor */}
          <View style={[styles.facilityStrip, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
            <View style={styles.facilityItem}>
              <Ionicons name="business" size={16} color={colors.primary} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Assigned Primary Society</Text>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
                  {booth.name}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>Code: {booth.code || 'BOOTH-401'}</Text>
              </View>
            </View>

            <View style={[styles.facilityDivider, { backgroundColor: colors.border }]} />

            <View style={styles.facilityItem}>
              <Ionicons name="snow" size={16} color="#0284C7" />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Linked Chilling Center</Text>
                <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]} numberOfLines={1}>
                  {assignedBmc.name}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>Hub ID: {assignedBmc.id}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* 2. Key Operational Counter Metrics (Organized into Two Distinct Rows) */}
        <View style={styles.twoRowsContainer}>
          {/* Row 1: Producers & Livestock */}
          <View style={styles.statsRow}>
            <View style={[styles.statTile, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.border }]}>
              <View style={styles.statTileTop}>
                <View style={[styles.statIconBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="people" size={18} color="#15803D" />
                </View>
                <View style={styles.miniTagGreen}>
                  <Text style={styles.miniTagGreenText}>Active</Text>
                </View>
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>{assignedFarmers.length}</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>Registered Producers</Text>
              <Text style={[Typography.caption2, { color: '#16A34A', fontSize: 10, marginTop: 2 }]}>100% KYC Complete</Text>
            </View>

            <View style={[styles.statTile, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.border }]}>
              <View style={styles.statTileTop}>
                <View style={[styles.statIconBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="paw" size={18} color="#0284C7" />
                </View>
                <View style={styles.miniTagBlue}>
                  <Text style={styles.miniTagBlueText}>RFID Sync</Text>
                </View>
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>{totalCows}</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>Monitored Cattle</Text>
              <Text style={[Typography.caption2, { color: '#0284C7', fontSize: 10, marginTop: 2 }]}>Tag Registry Synced</Text>
            </View>
          </View>

          {/* Row 2: Intake & Waybills */}
          <View style={styles.statsRow}>
            <View style={[styles.statTile, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.border }]}>
              <View style={styles.statTileTop}>
                <View style={[styles.statIconBadge, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="water" size={18} color="#0072BC" />
                </View>
                <View style={styles.miniTagNavy}>
                  <Text style={styles.miniTagNavyText}>Today</Text>
                </View>
              </View>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{todayLitres.toFixed(1)} L</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>Today's Collection</Text>
              <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>{todayRecords.length} Batch Entries</Text>
            </View>

            <View style={[styles.statTile, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.border }]}>
              <View style={styles.statTileTop}>
                <View style={[styles.statIconBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="receipt" size={18} color="#D97706" />
                </View>
                <View style={styles.miniTagAmber}>
                  <Text style={styles.miniTagAmberText}>Dispatched</Text>
                </View>
              </View>
              <Text style={[styles.statNumber, { color: '#B45309' }]}>{myReceipts.length}</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>Dispatch Waybills</Text>
              <Text style={[Typography.caption2, { color: '#16A34A', fontSize: 10, marginTop: 2 }]}>All Reconciled</Text>
            </View>
          </View>
        </View>

        {/* 3. 7-Day Milk Intake Production Chart (SVG Stacked Bar Chart) */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '900' }]}>
                7-Day Milk Collection Volume & Shift Counts
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Daily volumetric intake measured at {booth.name}
              </Text>
            </View>

            {/* Shift Legend */}
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginRight: 8 }]}>Morning</Text>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Evening</Text>
            </View>
          </View>

          {/* SVG Chart Container */}
          <View style={styles.svgWrapper}>
            <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              {/* Baseline axis line */}
              <Line x1="10" y1={chartHeight - 24} x2={chartWidth - 10} y2={chartHeight - 24} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4,4" />

              {weeklyChartData.map((item, idx) => {
                const x = gap + idx * (barWidth + gap);
                const morningHeight = (item.morning / maxChartVal) * (chartHeight - 45);
                const eveningHeight = (item.evening / maxChartVal) * (chartHeight - 45);
                const morningY = chartHeight - 25 - morningHeight;
                const eveningY = morningY - eveningHeight;

                return (
                  <React.Fragment key={idx}>
                    {/* Evening Shift Bar (Top portion) */}
                    <Rect
                      x={x}
                      y={eveningY}
                      width={barWidth}
                      height={eveningHeight}
                      fill="#F59E0B"
                      rx={3}
                    />
                    {/* Morning Shift Bar (Bottom portion) */}
                    <Rect
                      x={x}
                      y={morningY}
                      width={barWidth}
                      height={morningHeight}
                      fill={colors.primary}
                      rx={3}
                    />
                    {/* Total Litres Tag above bar */}
                    <SvgText
                      x={x + barWidth / 2}
                      y={eveningY - 4}
                      fontSize="9"
                      fontWeight="bold"
                      fill={colors.text}
                      textAnchor="middle"
                    >
                      {Math.round(item.total)}
                    </SvgText>
                    {/* Day label below baseline */}
                    <SvgText
                      x={x + barWidth / 2}
                      y={chartHeight - 8}
                      fontSize="9"
                      fontWeight="600"
                      fill={colors.textSecondary}
                      textAnchor="middle"
                    >
                      {item.day.split(' ')[0]}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>

          {/* Peak Volume & Average Banner */}
          <View style={[styles.chartSummaryBanner, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <View style={styles.summaryBannerItem}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Peak Day Volume</Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                810.0 L (11 Oct)
              </Text>
            </View>
            <View style={styles.summaryBannerDivider} />
            <View style={styles.summaryBannerItem}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>7-Day Intake Total</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                5,445.5 Litres
              </Text>
            </View>
            <View style={styles.summaryBannerDivider} />
            <View style={styles.summaryBannerItem}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Daily Average</Text>
              <Text style={[Typography.subhead, { color: '#16A34A', fontWeight: '800' }]}>
                777.9 L/day
              </Text>
            </View>
          </View>
        </Card>

        {/* 4. Intake Channel & Producer Attendance Analytics Card */}
        <Card style={styles.chartCard}>
          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '900', marginBottom: 2 }]}>
            Operational Distribution & Attendance Counts
          </Text>
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 12 }]}>
            Breakdown of milk sources and daily producer participation
          </Text>

          {/* Producer Attendance Gauge */}
          <View style={styles.attendanceRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                  Producer Attendance Today
                </Text>
                <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800' }]}>
                  {activeFarmersToday} of {assignedFarmers.length} Farmers ({attendancePercent}%)
                </Text>
              </View>
              {/* Progress Track */}
              <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, attendancePercent)}%`, backgroundColor: '#10B981' }]} />
              </View>
            </View>
          </View>

          {/* Milk Channel Split Progress */}
          <View style={[styles.attendanceRow, { marginTop: 14 }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                  Intake Channel Split
                </Text>
                <Text style={[Typography.caption1, { color: colors.textSecondary, fontWeight: '700' }]}>
                  Farmer: {farmerWiseLitres.toFixed(1)} L • Route: {vendorLitres.toFixed(1)} L
                </Text>
              </View>
              {/* Dual Channel Bar */}
              <View style={[styles.progressBarTrack, { backgroundColor: '#6366F1' }]}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${todayLitres > 0 ? (farmerWiseLitres / todayLitres) * 100 : 67}%`, 
                      backgroundColor: '#0072BC' 
                    }
                  ]} 
                />
              </View>
              <View style={styles.channelLegendRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.legendDot, { backgroundColor: '#0072BC' }]} />
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    Farmer-Wise Direct ({todayLitres > 0 ? Math.round((farmerWiseLitres / todayLitres) * 100) : 67}%)
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    Route Vendor Bulk ({todayLitres > 0 ? Math.round((vendorLitres / todayLitres) * 100) : 33}%)
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quality Averages Strip */}
          <View style={[styles.qualityMetricsRow, { borderTopColor: colors.border }]}>
            <View style={styles.qualityTile}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Avg FAT Content</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>4.25%</Text>
              <Text style={[Typography.caption2, { color: '#16A34A', fontSize: 10 }]}>Grade A Quality</Text>
            </View>

            <View style={styles.qualityTile}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Avg SNF Content</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>8.55%</Text>
              <Text style={[Typography.caption2, { color: '#16A34A', fontSize: 10 }]}>Standard Passed</Text>
            </View>

            <View style={styles.qualityTile}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Chilling Temp</Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>3.8°C</Text>
              <Text style={[Typography.caption2, { color: '#0284C7', fontSize: 10 }]}>≤ 4.0°C Safe Zone</Text>
            </View>
          </View>
        </Card>

        {/* 5. Center Hardware & Device Specifications */}
        <Card style={styles.hardwareCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="hardware-chip-outline" size={18} color={colors.primary} />
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              Society Instrumentation & Calibration
            </Text>
          </View>

          <View style={styles.hardwareRow}>
            <Text style={[styles.hardwareLabel, { color: colors.textSecondary }]}>Society Reg. No:</Text>
            <Text style={[styles.hardwareValue, { color: colors.text }]}>TNDD-MDU-SOC-401/2018</Text>
          </View>

          <View style={styles.hardwareRow}>
            <Text style={[styles.hardwareLabel, { color: colors.textSecondary }]}>Ultrasonic Analyzer:</Text>
            <Text style={[styles.hardwareValue, { color: '#15803D' }]}>AAVIN-SCAN-088 (Calibrated)</Text>
          </View>

          <View style={styles.hardwareRow}>
            <Text style={[styles.hardwareLabel, { color: colors.textSecondary }]}>Bulk Storage Vat:</Text>
            <Text style={[styles.hardwareValue, { color: colors.text }]}>1,500 L Insulated Tank</Text>
          </View>

          <View style={styles.hardwareRow}>
            <Text style={[styles.hardwareLabel, { color: colors.textSecondary }]}>Firmware Version:</Text>
            <Text style={[styles.hardwareValue, { color: colors.text }]}>v2.4.12-PROD-MADURAI</Text>
          </View>
        </Card>

        {/* 6. Quick Operations Shortcuts */}
        <Card style={styles.shortcutsCard}>
          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginBottom: 10 }]}>
            Booth Operations Navigation
          </Text>

          <Pressable 
            style={[styles.shortcutRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/(booth)/record-milk')}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="water" size={16} color="#15803D" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                Record Milk Intake
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Log individual farmer or bulk vendor supply
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>

          <Pressable 
            style={[styles.shortcutRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/(booth)/farmers')}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="people" size={16} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                Farmers Directory & KYC
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                View and edit registered dairy producers
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>

          <Pressable 
            style={[styles.shortcutRow, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/(booth)/sent-receipts')}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="documents" size={16} color="#0072BC" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                Sent Dispatch Receipts Ledger
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                BMC transit track and ultrasonic weight matching
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>
        </Card>

        {/* 7. Sign Out / Session Button */}
        <Button
          title="Sign Out of Society Operator Account"
          variant="destructive"
          icon="log-out-outline"
          onPress={handleLogout}
          style={{ marginTop: 6, marginBottom: 36 }}
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
    gap: 14,
    paddingBottom: 110,
  },
  credentialCard: {
    padding: 16,
    borderRadius: 18,
  },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  verifiedGreenCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  staffAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0072BC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  facilityStrip: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facilityDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  twoRowsContainer: {
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statTile: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 118,
    justifyContent: 'space-between',
  },
  statTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTagGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniTagGreenText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  miniTagBlue: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniTagBlueText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
  },
  miniTagNavy: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniTagNavyText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  miniTagAmber: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniTagAmberText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  chartCard: {
    padding: 16,
    borderRadius: 16,
  },
  chartHeader: {
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  chartSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  summaryBannerItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryBannerDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
  attendanceRow: {
    marginTop: 2,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  channelLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  qualityMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  qualityTile: {
    flex: 1,
    alignItems: 'center',
  },
  hardwareCard: {
    padding: 14,
    borderRadius: 14,
  },
  hardwareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: 12,
  },
  hardwareLabel: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '45%',
    lineHeight: 18,
  },
  hardwareValue: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
  },
  shortcutsCard: {
    padding: 14,
    borderRadius: 14,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shortcutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
