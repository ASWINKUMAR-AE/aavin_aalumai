import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, RefreshControl, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { SmartCattleTagScannerModal } from '../../components/scanner/SmartCattleTagScannerModal';

export default function BoothDashboard() {
  const { user } = useAuth();
  const { 
    booths, 
    bmcs, 
    farmers, 
    getBoothStats, 
    milkRecords, 
    boothReceipts,
    bmcDeliveries,
    discrepancyCases 
  } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];
  const assignedBmc = bmcs.find(b => b.id === booth.assignedBmcId) || bmcs[0];

  const stats = getBoothStats(booth.id);
  const boothRecords = milkRecords.filter(r => r.boothId === booth.id);
  const todayRecords = boothRecords.filter(r => r.collectionDate === '2026-10-12');
  const assignedFarmers = farmers.filter(f => f.assignedBoothId === booth.id);

  // Check today's receipt status
  const todayReceipt = boothReceipts.find(r => r.boothId === booth.id && r.collectionDate === '2026-10-12');

  // Any discrepancy cases involving this booth
  const boothDiscrepancies = discrepancyCases.filter(c => c.boothId === booth.id && c.status === 'open');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={booth.name}
        subtitle={`Society #${booth.code} • Linked to BMC: ${assignedBmc.name}`}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Discrepancy Alert for Society Staff */}
        {boothDiscrepancies.length > 0 && (
          <View style={[styles.discrepancyBanner, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={24} color="#DC2626" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.headline, { color: '#B91C1C', fontWeight: '800' }]}>
                ⚠️ ACTIVE BMC TRANSIT DISCREPANCY
              </Text>
              <Text style={[Typography.caption1, { color: '#991B1B', marginTop: 2 }]}>
                Case #{boothDiscrepancies[0].id}: {boothDiscrepancies[0].differenceLitres} L variance reported at {assignedBmc.name}.
              </Text>
            </View>
          </View>
        )}

        {/* Signature Hero Dark Navy Card with Assets soc.png Background & Dark Overlay */}
        <ImageBackground
          source={require('../../assets/soc.png')}
          style={styles.heroNavyCard}
          imageStyle={styles.heroBgImage}
          resizeMode="cover"
        >
          {/* Dark Color Layer above image */}
          <View style={styles.darkOverlayLayer}>
            <View style={styles.heroCardHeaderRow}>
              <View style={styles.heroHeaderPill}>
                <Text style={styles.heroHeaderPillText}>Society #{booth.code} ›</Text>
              </View>
              <View style={[styles.heroStatusBadge, { backgroundColor: todayReceipt ? '#16A34A' : '#D97706' }]}>
                <Text style={styles.heroStatusBadgeText}>
                  {todayReceipt ? '✓ DISPATCH READY' : 'CLOSURE PENDING'}
                </Text>
              </View>
            </View>

            <Text style={styles.heroBalanceNumber}>
              {stats.eligibleReceiptTotal.toFixed(2)} <Text style={{ fontSize: 20, fontWeight: '600' }}>Litres</Text>
            </Text>

            <View style={styles.heroSubRow}>
              <View style={styles.growthPill}>
                <Text style={styles.growthPillText}>+4.2% ↑</Text>
              </View>
              <Text style={styles.heroSubText}>
                Farmer: {stats.farmerWiseTotal.toFixed(1)} L • Route: {stats.vendorCombinedTotal.toFixed(1)} L
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* Quick Operations Row */}
        <View style={styles.actionBtnRow}>
          <Pressable 
            onPress={() => router.push('/(booth)/farmers')}
            style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="people" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                Farmers Directory & KYC
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                {assignedFarmers.length} Assigned • Tap to Edit Data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <Pressable 
            onPress={() => setScannerVisible(true)}
            style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: '#0284C7', borderWidth: 1.5 }]}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="scan" size={20} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                Scan Cattle Ear Tag (Dual-Mode)
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Barcode First + 12-Digit OCR • Check Withdrawal Hold
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#0284C7" />
          </Pressable>

          <Pressable 
            onPress={() => router.push(todayReceipt ? `/(booth)/receipt-preview?receiptId=${todayReceipt.id}` as any : '/(booth)/review-collection')}
            style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: todayReceipt ? '#DCFCE7' : '#FEF3C7' }]}>
              <Ionicons name="paper-plane" size={20} color={todayReceipt ? '#15803D' : '#D97706'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                Send Dispatch Receipts
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                {todayReceipt ? `Waybill #${todayReceipt.id} • ${todayReceipt.dispatchQuantity.toFixed(1)} L` : 'Audit Batch & Transmit to BMC'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Today's Recorded Entries List */}
        <Card style={styles.entriesCard}>
          <View style={styles.entriesHeader}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
              Today's Entries ({todayRecords.length})
            </Text>
            <Pressable onPress={() => router.push('/(booth)/record-milk')}>
              <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                + New Entry
              </Text>
            </Pressable>
          </View>

          {todayRecords.length === 0 ? (
            <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }]}>
              No milk entries recorded today yet.
            </Text>
          ) : (
            todayRecords.map((r) => (
              <View key={r.id} style={[styles.entryItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.entryIconCircle, { backgroundColor: r.measurementMethod === 'farmer_wise' ? '#DCFCE7' : '#E0E7FF' }]}>
                  <Ionicons 
                    name={r.measurementMethod === 'farmer_wise' ? 'person' : 'bus'} 
                    size={16} 
                    color={r.measurementMethod === 'farmer_wise' ? '#15803D' : '#4338CA'} 
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    {r.farmerName || `${r.vendorName || 'Combined Vendor'}`}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {r.measurementMethod === 'farmer_wise' ? 'Direct Farmer Measurement' : 'Vendor Combined (Individual N/A)'}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                    {r.session.toUpperCase()} • Recorded by: {r.createdBy}
                  </Text>
                </View>

                <View style={styles.entryQtyBox}>
                  <Text style={[styles.entryQtyNum, { color: colors.primary }]}>
                    {r.quantityLitres.toFixed(1)} L
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <SmartCattleTagScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(tagId) => {
          setScannerVisible(false);
          router.push({
            pathname: '/cow-details',
            params: { tagId },
          } as any);
        }}
        userRoleLabel="Society Staff"
      />
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
    paddingBottom: 40,
  },
  discrepancyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  primaryCard: {
    padding: 16,
  },
  primaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  largeTotalText: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 2,
  },
  receiptPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  receiptPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  breakdownCol: {
    flex: 1,
  },
  vDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  actionBtnRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  quickActionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entriesCard: {
    padding: 16,
  },
  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryQtyBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entryQtyNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  heroNavyCard: {
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#071325',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  heroBgImage: {
    borderRadius: 24,
    width: '100%',
    height: '100%',
  },
  darkOverlayLayer: {
    backgroundColor: 'rgba(8, 20, 38, 0.82)',
    padding: 18,
    borderRadius: 24,
    width: '100%',
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
    marginBottom: 4,
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
});
