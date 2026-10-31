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
  getFarmerAnalyticsById 
} from '../../services/bmcAnalyticsService';
import { useIsDesktop } from '../../hooks/useIsDesktop';

export default function FarmerAnalyticsScreen() {
  const isDesktop = useIsDesktop();
  const { farmerId, societyId, bmcId } = useLocalSearchParams<{ 
    farmerId: string; 
    societyId?: string; 
    bmcId?: string; 
  }>();
  const { farmers, cows, milkRecords, booths, bmcs } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  // Active farmer ID fallback
  const activeFarmerId = farmerId || farmers[0]?.id || 'FARMER001';
  const analyticsData = getFarmerAnalyticsById(
    activeFarmerId,
    farmers,
    cows,
    milkRecords,
    booths,
    bmcs
  );

  const fallbackSocietyId = societyId || analyticsData?.farmer.assignedBoothId || booths[0]?.id;
  const fallbackBmcId = bmcId || analyticsData?.farmer.assignedBmcId || bmcs[0]?.id;

  const handleBackToSociety = () => {
    if (fallbackSocietyId) {
      router.replace({
        pathname: '/(union)/society-analytics' as any,
        params: { societyId: fallbackSocietyId, bmcId: fallbackBmcId },
      });
    } else if (fallbackBmcId) {
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
      handleBackToSociety();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [fallbackSocietyId, fallbackBmcId]);

  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('daily');

  if (!analyticsData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <DemoHeader
          title="Farmer Production Analytics"
          subtitle="Farmer Not Found"
          showBack
          onBack={handleBackToSociety}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[Typography.headline, { color: colors.text, marginTop: 12 }]}>
            Farmer Record Not Found
          </Text>
          <Pressable onPress={handleBackToSociety} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>← Return to Society</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { farmer, cows: farmerCows, milkRecords: farmerRecords, booth, bmc } = analyticsData;
  const metrics = farmer.metrics;
  const todayLitres = metrics.daily.current;
  const periods: AnalyticsPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];

  // Financial realization calculation (₹40.50 Aavin base rate)
  const procurementRate = 40.5;
  const todayRevenue = todayLitres * procurementRate;
  const monthRevenue = metrics.monthly.current * procurementRate;

  // Morning vs evening session breakdown from records
  const morningRecords = farmerRecords.filter((r) => r.session === 'morning');
  const eveningRecords = farmerRecords.filter((r) => r.session === 'evening');
  const morningVol = morningRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
  const eveningVol = eveningRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
  const totalSessionVol = morningVol + eveningVol;
  const morningPct = totalSessionVol > 0 ? Math.round((morningVol / totalSessionVol) * 100) : 60;
  const eveningPct = 100 - morningPct;

  // Active medicine withdrawal check
  const cowsInWithdrawal = farmerCows.filter((c) => c.activeWithdrawal?.hasActiveWithdrawal);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader
        title="Farmer Production Analytics"
        subtitle={`${farmer.farmerName} • ${farmer.village}`}
        showBack
        onBack={handleBackToSociety}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && styles.desktopScrollContent]} showsVerticalScrollIndicator={false}>
        {/* 1. Farmer Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeaderRow}>
            <View style={[styles.farmerAvatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 32 }}>👨‍🌾</Text>
            </View>

            <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
              <View style={styles.nameRow}>
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '900', flex: 1 }]} numberOfLines={1}>
                  {farmer.farmerName}
                </Text>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: farmer.verificationStatus === 'verified' ? '#DCFCE7' : '#FEF3C7' }
                ]}>
                  <Text style={[
                    styles.statusBadgeText, 
                    { color: farmer.verificationStatus === 'verified' ? '#15803D' : '#D97706' }
                  ]}>
                    {farmer.verificationStatus === 'verified' ? 'Verified Member' : 'KYC Pending'}
                  </Text>
                </View>
              </View>

              <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 3 }]}>
                {farmer.farmerIdCode} • {farmer.village} {farmer.community ? `(${farmer.community})` : ''} • 📞 {farmer.mobileNumber}
              </Text>
            </View>
          </View>

          {/* Quick Jump Links to Linked Society & BMC */}
          <View style={styles.quickLinksRow}>
            <Pressable
              style={[styles.quickLinkPill, { backgroundColor: isDark ? '#112540' : '#EBF4FC', borderColor: colors.border }]}
              onPress={() =>
                router.replace({
                  pathname: '/(union)/society-analytics' as any,
                  params: { societyId: farmer.assignedBoothId, bmcId: fallbackBmcId },
                })
              }
            >
              <Ionicons name="business" size={14} color={colors.primary} />
              <Text style={[Typography.caption2, { color: colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                Society: <Text style={{ color: colors.primary, fontWeight: '800' }}>{farmer.boothName}</Text>
              </Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </Pressable>

            <Pressable
              style={[styles.quickLinkPill, { backgroundColor: isDark ? '#112540' : '#EBF4FC', borderColor: colors.border }]}
              onPress={() =>
                router.replace({
                  pathname: '/(union)/bmc-analytics' as any,
                  params: { bmcId: farmer.assignedBmcId },
                })
              }
            >
              <Ionicons name="snow" size={14} color={colors.primary} />
              <Text style={[Typography.caption2, { color: colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                BMC: <Text style={{ color: colors.primary, fontWeight: '800' }}>{farmer.bmcName}</Text>
              </Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </Pressable>
          </View>

          {/* DBT Direct Bank Account Badge */}
          <View style={[styles.dbtCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.dbtLeft}>
              <View style={[styles.dbtIconBox, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  DBT Direct Account (IFSC: {farmer.bankIfsc || 'CNRB0001092'})
                </Text>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                  {farmer.bankName || 'Canara Bank'} • {farmer.bankAccountNumber ? `••••${farmer.bankAccountNumber.slice(-4)}` : '••••6501'}
                </Text>
              </View>
            </View>
            <View style={[styles.dbtActivePill, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.dbtActiveText}>DBT Active</Text>
            </View>
          </View>
        </Card>

        {/* Active Medicine Withdrawal Alert Banner if applicable */}
        {cowsInWithdrawal.length > 0 && (
          <View style={[styles.withdrawalAlertBanner, { backgroundColor: isDark ? '#3E1818' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#F87171' }]}>
            <Ionicons name="alert-circle" size={22} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[Typography.subhead, { color: isDark ? '#FCA5A5' : '#991B1B', fontWeight: '900' }]}>
                MEDICINE WITHDRAWAL ALERT: {cowsInWithdrawal.length} Cow(s) on Hold
              </Text>
              <Text style={[Typography.caption2, { color: isDark ? '#F87171' : '#B91C1C', marginTop: 2 }]}>
                Milk from treated cow(s) must be segregated until veterinary clearance to prevent antibiotic residues.
              </Text>
            </View>
          </View>
        )}

        {/* 2. Performance Trends Grid (Daily, Weekly, Monthly, Yearly) */}
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
            Member Production Trends
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10, marginTop: -4 }]}>
          Milk volume delivered to {farmer.boothName} across historical collection cycles
        </Text>

        <View style={styles.trendsGrid}>
          {periods.map((periodKey) => {
            const comp = metrics[periodKey];
            const isPos = comp.deltaPercentage >= 0;
            const trendBg = isPos ? (isDark ? '#132E1D' : '#DCFCE7') : (isDark ? '#3E1818' : '#FEE2E2');
            const trendColor = isPos ? (isDark ? '#4ADE80' : '#15803D') : (isDark ? '#F87171' : '#DC2626');

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

        {/* 3. Pashu Aadhaar Registered Cattle Herd */}
        <View style={[styles.sectionHeader, { marginTop: 14 }]}>
          <Ionicons name="heart-outline" size={18} color={colors.primary} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
            Pashu Aadhaar Cattle Herd ({farmer.numberOfCows} Cows)
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10, marginTop: -4 }]}>
          Government-registered milking cows tagged with 12-digit RFID INAPH numbers
        </Text>

        <Card style={styles.herdCard}>
          {farmerCows.length === 0 ? (
            <View style={styles.fallbackCowRow}>
              <View style={[styles.cowAvatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={{ fontSize: 20 }}>🐄</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                  Kamadhenu (Jersey Cross)
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  Tag #100100001001 • Peak Lactation • Yield: ~14.5 L/day
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.statusBadgeText, { color: '#15803D' }]}>Healthy</Text>
              </View>
            </View>
          ) : (
            farmerCows.map((c, cIdx) => {
              const isWithdrawal = c.activeWithdrawal?.hasActiveWithdrawal;
              return (
                <View
                  key={c.id}
                  style={[
                    styles.cowRow,
                    cIdx < farmerCows.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                  ]}
                >
                  <View style={[styles.cowAvatar, { backgroundColor: isWithdrawal ? '#FEE2E2' : colors.primaryLight }]}>
                    <Text style={{ fontSize: 20 }}>🐄</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                        {c.name} ({c.breed})
                      </Text>
                      {isWithdrawal && (
                        <View style={[styles.miniHoldBadge, { backgroundColor: '#FEE2E2' }]}>
                          <Text style={styles.miniHoldBadgeText}>WITHDRAWAL</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Tag #{c.tagId} • {c.lactationStage} Lactation • Daily: {c.dailyMilkYield.toFixed(1)} L
                    </Text>
                    {isWithdrawal && (
                      <Text style={[Typography.caption2, { color: '#DC2626', fontWeight: '700', marginTop: 2 }]}>
                        ⚠️ {c.activeWithdrawal?.medicineName} ({c.activeWithdrawal?.daysRemaining} days left)
                      </Text>
                    )}
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: isWithdrawal ? '#FEE2E2' : '#DCFCE7' }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText, 
                      { color: isWithdrawal ? '#DC2626' : '#15803D' }
                    ]}>
                      {isWithdrawal ? 'Hold' : 'Lactating'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* 4. Quality Parameters & Session Ratio */}
        <View style={[styles.sectionHeader, { marginTop: 14 }]}>
          <Ionicons name="flask-outline" size={18} color={colors.primary} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
            Quality & Session Distribution
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10, marginTop: -4 }]}>
          Milk fat, SNF, and collection session split
        </Text>

        <Card style={styles.qualityCard}>
          <View style={styles.sessionPillsRow}>
            <View style={styles.sessionPill}>
              <Ionicons name="sunny-outline" size={14} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={[Typography.caption2, { color: colors.text, fontWeight: '700' }]}>
                Morning: {morningPct}%
              </Text>
            </View>
            <View style={styles.sessionPill}>
              <Ionicons name="moon-outline" size={14} color="#4F46E5" style={{ marginRight: 4 }} />
              <Text style={[Typography.caption2, { color: colors.text, fontWeight: '700' }]}>
                Evening: {eveningPct}%
              </Text>
            </View>
          </View>

          {/* Visual Split Track */}
          <View style={[styles.splitTrack, { backgroundColor: isDark ? '#15273E' : '#E2E8F0' }]}>
            <View style={[styles.splitFillMorning, { width: `${morningPct}%` }]} />
            <View style={[styles.splitFillEvening, { width: `${eveningPct}%` }]} />
          </View>

          <View style={[styles.qualityGrid, { marginTop: 14 }]}>
            <View style={[styles.qualityItem, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Avg FAT %</Text>
              <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900', marginTop: 2 }]}>
                {farmer.avgFat.toFixed(2)}%
              </Text>
              <Text style={[Typography.caption2, { color: '#15803D', fontWeight: '700', marginTop: 2 }]}>
                Standard Compliant
              </Text>
            </View>

            <View style={[styles.qualityItem, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Avg SNF %</Text>
              <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900', marginTop: 2 }]}>
                {farmer.avgSnf.toFixed(2)}%
              </Text>
              <Text style={[Typography.caption2, { color: '#15803D', fontWeight: '700', marginTop: 2 }]}>
                Premium Density
              </Text>
            </View>

            <View style={[styles.qualityItem, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Quality Grade</Text>
              <Text style={[Typography.title2, { color: '#15803D', fontWeight: '900', marginTop: 2 }]}>
                Grade A
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 2 }]}>
                Clean Milk
              </Text>
            </View>
          </View>
        </Card>

        {/* 5. DBT Payment & Realized Income */}
        <View style={[styles.sectionHeader, { marginTop: 14 }]}>
          <Ionicons name="wallet-outline" size={18} color={colors.primary} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
            DBT Financial Credit & Realization
          </Text>
        </View>
        <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10, marginTop: -4 }]}>
          Direct Benefit Transfer passbook credits deposited to registered bank account
        </Text>

        <Card style={styles.revenueCard}>
          <View style={styles.revenueTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Today's Value</Text>
              <Text style={[Typography.title1, { color: colors.text, fontWeight: '900', marginTop: 2 }]}>
                ₹{todayRevenue.toFixed(0)}
              </Text>
              <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
                {todayLitres.toFixed(1)} L @ ₹{procurementRate.toFixed(2)}/L
              </Text>
            </View>

            <View style={[styles.revenueDivider, { backgroundColor: colors.border }]} />

            <View style={{ flex: 1, paddingLeft: 14 }}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>This Month Payout</Text>
              <Text style={[Typography.title1, { color: '#15803D', fontWeight: '900', marginTop: 2 }]}>
                ₹{(monthRevenue / 1000).toFixed(1)}k
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                {formatLitres(metrics.monthly.current)} total
              </Text>
            </View>
          </View>

          <View style={[styles.compDivider, { borderTopColor: colors.border, marginVertical: 12 }]} />

          <View style={styles.dbtSummaryRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="card" size={16} color={colors.primary} />
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                Disbursement: 100% Direct DBT Payout
              </Text>
            </View>
            <Text style={[Typography.caption2, { color: '#15803D', fontWeight: '800' }]}>
              Zero Middleman Fee ✓
            </Text>
          </View>
        </Card>

        {/* 6. Executive Action Buttons Footer */}
        <View style={styles.footerActions}>
          <Button
            title={`← Return to ${farmer.boothName} Analytics`}
            size="lg"
            variant="outline"
            onPress={handleBackToSociety}
          />
          <View style={{ height: 10 }} />
          <Button
            title={`❄️ Jump to ${farmer.bmcName} Analytics`}
            size="lg"
            variant="outline"
            onPress={() =>
              router.replace({
                pathname: '/(union)/bmc-analytics' as any,
                params: { bmcId: farmer.assignedBmcId },
              })
            }
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
    borderRadius: 12,
  },
  profileCard: {
    padding: 16,
    marginBottom: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  farmerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickLinkPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  dbtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  dbtLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dbtIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dbtActivePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dbtActiveText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  withdrawalAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  trendCard: {
    flex: 1,
    minWidth: '45%',
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
  herdCard: {
    padding: 12,
    marginBottom: 16,
  },
  cowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  fallbackCowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  cowAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniHoldBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniHoldBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#DC2626',
  },
  qualityCard: {
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
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  revenueCard: {
    padding: 14,
    marginBottom: 20,
  },
  revenueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueDivider: {
    width: 1,
    height: 48,
  },
  dbtSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerActions: {
    marginTop: 6,
    marginBottom: 24,
  },
});
