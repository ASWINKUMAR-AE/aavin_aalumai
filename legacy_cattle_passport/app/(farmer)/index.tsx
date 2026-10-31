import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { DemoHeader } from '../../components/DemoHeader';
import { Ionicons } from '@expo/vector-icons';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const {
    cows,
    milkRecords,
    getFarmerStats,
    booths,
    boothReceipts
  } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);

  // Fallback to FARMER001 if not set
  const farmerId = user?.associatedId || 'FARMER001';
  const farmerCows = cows.filter(c => c.farmerId === farmerId);
  const stats = getFarmerStats(farmerId);
  const farmerRecords = milkRecords.filter(r => r.farmerId === farmerId);

  // Active Withdrawal Warnings for this farmer's cows
  const cowsWithWithdrawal = farmerCows.filter(c => c.activeWithdrawal?.hasActiveWithdrawal);

  // Assigned Booth
  const assignedBooth = booths.find(b => b.id === 'BOOTH001');

  // Last 7 days supply trend
  const last7DaysData = [
    { day: 'Mon', date: '2026-10-06', qty: 8.1 },
    { day: 'Tue', date: '2026-10-07', qty: 8.4 },
    { day: 'Wed', date: '2026-10-08', qty: 7.8 },
    { day: 'Thu', date: '2026-10-09', qty: 8.0 },
    { day: 'Fri', date: '2026-10-10', qty: 8.2 },
    { day: 'Sat', date: '2026-10-11', qty: 15.0 }, // 8.0 morn + 7.0 eve
    { day: 'Today', date: '2026-10-12', qty: stats.todaySupply },
  ];

  const maxDailyQty = Math.max(...last7DaysData.map(d => d.qty), 16);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader
        title={`Vanakkam, ${user?.fullName || 'Farmer'}`}
        subtitle={`${assignedBooth?.name || 'Melur Co-op Society'} • ${farmerCows.length} Cows Registered`}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Active Medicine Withdrawal Alert Banner */}
        {cowsWithWithdrawal.length > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={24} color="#DC2626" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[Typography.headline, { color: '#B91C1C', fontWeight: '800' }]}>
                  ⚠️ MANDATORY MILK WITHHOLDING NOTICE
                </Text>
                <Text style={[Typography.caption1, { color: '#991B1B', marginTop: 2 }]}>
                  {cowsWithWithdrawal.length} cow(s) under veterinary treatment. Do NOT mix milk!
                </Text>
              </View>
            </View>

            {cowsWithWithdrawal.map(c => (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/(farmer)/cow-details?cowId=${c.id}` as any)}
                style={styles.alertCowItem}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.subhead, { color: '#7F1D1D', fontWeight: '700' }]}>
                    Cow: {c.name} (Tag #{c.tagId})
                  </Text>
                  <Text style={[Typography.caption2, { color: '#991B1B' }]}>
                    Medicine: {c.activeWithdrawal?.medicineName}
                  </Text>
                  <Text style={[Typography.caption2, { color: '#B91C1C', fontWeight: '600' }]}>
                    Withholding ends: {c.activeWithdrawal?.withdrawalEndDate} ({c.activeWithdrawal?.daysRemaining} days left)
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#B91C1C" />
              </Pressable>
            ))}
          </View>
        )}

        {/* Signature Hero Dark Navy Card (Reference Wallet UI) */}
        <View style={styles.heroNavyCard}>
          <View style={styles.heroCardHeaderRow}>
            <View style={styles.heroHeaderPill}>
              <Text style={styles.heroHeaderPillText}>Main Cattle Herd ›</Text>
            </View>
            <View style={styles.heroStatusBadge}>
              <Text style={styles.heroStatusBadgeText}>✓ CLEAR</Text>
            </View>
          </View>

          <Text style={styles.heroBalanceNumber}>
            {stats.todaySupply > 0 ? `${stats.todaySupply.toFixed(1)} L` : '15.0 L'}
          </Text>

          <View style={styles.heroSubRow}>
            <View style={styles.growthPill}>
              <Text style={styles.growthPillText}>+8.2% ↑</Text>
            </View>
            <Text style={styles.heroSubText}>
              Est. Monthly: ₹{(stats.monthSupply * 37.5).toFixed(0)} ({stats.monthSupply.toFixed(1)} L)
            </Text>
          </View>
        </View>

        {/* 3 Metric Stat Cards */}
        <View style={styles.statsGrid}>
          {/* Today's Supply */}
          <Card style={styles.statCard}>
            <View style={styles.statIconRow}>
              <View style={[styles.statIconBadge, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="water" size={20} color="#0284C7" />
              </View>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>TODAY</Text>
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.todaySupply > 0 ? `${stats.todaySupply.toFixed(1)} L` : 'Pending'}
            </Text>
            <Text style={[Typography.caption2, { color: stats.todaySupply > 0 ? '#16A34A' : colors.textMuted }]}>
              {stats.todaySupply > 0 ? '✓ Recorded at Society' : 'No delivery recorded yet'}
            </Text>
          </Card>

          {/* Past 7 Days */}
          <Card style={styles.statCard}>
            <View style={styles.statIconRow}>
              <View style={[styles.statIconBadge, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="calendar" size={20} color="#16A34A" />
              </View>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>PAST 7 DAYS</Text>
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.last7DaysSupply.toFixed(1)} L
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              Avg {(stats.last7DaysSupply / 7).toFixed(1)} L / day
            </Text>
          </Card>

          {/* Current Month */}
          <Card style={styles.statCard}>
            <View style={styles.statIconRow}>
              <View style={[styles.statIconBadge, { backgroundColor: '#FAF5FF' }]}>
                <Ionicons name="ribbon" size={20} color="#9333EA" />
              </View>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>OCTOBER</Text>
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.monthSupply.toFixed(1)} L
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              Est. ₹{(stats.monthSupply * 37.5).toFixed(0)} payout
            </Text>
          </Card>
        </View>

        {/* Quick Action Tiles */}
        <View style={styles.actionTilesRow}>
          <Pressable
            style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(farmer)/cows')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="paw" size={24} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.headline, { color: colors.text, fontWeight: '700' }]}>
                My Cows ({farmerCows.length})
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Digital Passports & Health
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(farmer)/receipts')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="receipt" size={24} color="#4338CA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.headline, { color: colors.text, fontWeight: '700' }]}>
                Digital Receipts
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Verified collection slips
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Recent Milk Records Section */}
        <Card style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
              Recent Milk Deliveries
            </Text>
            <Pressable onPress={() => router.push('/(farmer)/milk-history')}>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '600' }]}>View All</Text>
            </Pressable>
          </View>

          {/* Bar Chart Bars */}
          <View style={styles.barsContainer}>
            {last7DaysData.map((d, index) => {
              const heightPercent = Math.max((d.qty / maxDailyQty) * 100, 6);
              const isToday = d.day === 'Today';
              return (
                <View key={index} style={styles.barCol}>
                  <Text style={[styles.barQtyLabel, { color: isToday ? colors.primary : colors.textSecondary }]}>
                    {d.qty > 0 ? d.qty.toFixed(1) : '-'}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPercent}%`,
                          backgroundColor: isToday ? colors.primary : '#93C5FD',
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.barDayLabel, { color: isToday ? colors.primary : colors.text, fontWeight: isToday ? '800' : '500' }]}>
                    {d.day}
                  </Text>
                </View>
              );
            })}
          </View>

          {farmerRecords.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="water-outline" size={32} color={colors.textMuted} />
              <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 8 }]}>
                No record available
              </Text>
            </View>
          ) : (
            farmerRecords.slice(0, 6).map((record) => (
              <View key={record.id} style={[styles.recordRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.sessionCircle, { backgroundColor: record.session === 'morning' ? '#FEF3C7' : '#E0E7FF' }]}>
                  <Ionicons
                    name={record.session === 'morning' ? 'sunny' : 'moon'}
                    size={16}
                    color={record.session === 'morning' ? '#D97706' : '#4F46E5'}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                    {record.quantityLitres.toFixed(2)} Litres
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {record.collectionDate} • {record.session.toUpperCase()} • {record.route === 'direct' ? 'Direct Delivery' : 'Vendor'}
                  </Text>
                </View>
                <View style={styles.receiptTag}>
                  <Text style={[styles.receiptTagText, { color: record.receiptId ? '#16A34A' : '#D97706' }]}>
                    {record.receiptId ? '✓ On Receipt' : 'Recorded'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
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
  alertBanner: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertCowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
  },
  statIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  chartCard: {
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 130,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 20,
    height: 90,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
  },
  barQtyLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  barDayLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  actionTilesRow: {
    gap: 10,
    marginBottom: 16,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessionCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  receiptTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroNavyCard: {
    backgroundColor: '#0D1E36',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#071325',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  heroCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroHeaderPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  heroHeaderPillText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '700',
  },
  heroStatusBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  heroStatusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  heroBalanceNumber: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  growthPill: {
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  growthPillText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '800',
  },
  heroSubText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  heroActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 14,
  },
  heroCircleAction: {
    alignItems: 'center',
    flex: 1,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#162C4E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  circleBtnLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
