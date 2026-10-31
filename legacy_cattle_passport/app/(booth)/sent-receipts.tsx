import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, TextInput, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { BoothReceipt } from '../../types/aavin';

export default function SentReceiptsScreen() {
  const { user } = useAuth();
  const { boothReceipts, bmcDeliveries, booths, discrepancyCases } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];

  // All receipts from this booth
  const myReceipts = boothReceipts.filter(r => r.boothId === booth.id);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'matched' | 'mismatch'>('all');

  // Selected receipt for "More View" popup modal
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<BoothReceipt | null>(null);

  // Stats calculation
  const totalDispatchedLitres = myReceipts.reduce((sum, r) => sum + r.dispatchQuantity, 0);
  const matchedCount = myReceipts.filter(r => {
    const d = bmcDeliveries.find(del => del.boothReceiptId === r.id);
    return d?.status === 'matched';
  }).length;
  const pendingCount = myReceipts.filter(r => {
    const d = bmcDeliveries.find(del => del.boothReceiptId === r.id);
    return !d || d.status === 'pending_arrival';
  }).length;
  const mismatchCount = myReceipts.filter(r => {
    const d = bmcDeliveries.find(del => del.boothReceiptId === r.id);
    return d?.status === 'mismatch_investigation';
  }).length;

  const filteredReceipts = myReceipts.filter(item => {
    const delivery = bmcDeliveries.find(d => d.boothReceiptId === item.id);
    const status = delivery?.status || 'pending_arrival';

    // Status filter
    if (selectedFilter === 'pending' && status !== 'pending_arrival') return false;
    if (selectedFilter === 'matched' && status !== 'matched' && status !== 'resolved') return false;
    if (selectedFilter === 'mismatch' && status !== 'mismatch_investigation') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.bmcName.toLowerCase().includes(q) ||
      item.verificationCode.toLowerCase().includes(q) ||
      item.collectionDate.includes(q)
    );
  });

  // Helper to determine status styling for any receipt
  const getStatusBadge = (receipt: BoothReceipt) => {
    const delivery = bmcDeliveries.find(d => d.boothReceiptId === receipt.id);
    if (!delivery) {
      return { label: 'CONFIRMED DRAFT', bg: '#FEF3C7', color: '#B45309', icon: 'time-outline' as const };
    }
    switch (delivery.status) {
      case 'pending_arrival':
        return { label: 'IN TRANSIT • PENDING BMC', bg: '#E0F2FE', color: '#0284C7', icon: 'bus-outline' as const };
      case 'matched':
        return { label: 'MATCHED & CONFIRMED', bg: '#DCFCE7', color: '#15803D', icon: 'checkmark-done-circle' as const };
      case 'mismatch_investigation':
        return { label: 'VARIANCE FLAGGED', bg: '#FEF2F2', color: '#DC2626', icon: 'alert-circle' as const };
      case 'resolved':
        return { label: 'AUDIT RESOLVED', bg: '#F3E8FF', color: '#7E22CE', icon: 'shield-checkmark' as const };
      default:
        return { label: delivery.status.toUpperCase(), bg: '#F1F5F9', color: '#475569', icon: 'ellipse-outline' as const };
    }
  };

  // Delivery data for currently open modal receipt
  const modalDelivery = selectedReceiptForModal
    ? bmcDeliveries.find(d => d.boothReceiptId === selectedReceiptForModal.id)
    : null;
  const modalBadge = selectedReceiptForModal ? getStatusBadge(selectedReceiptForModal) : null;
  const modalVariance = modalDelivery?.difference !== undefined ? modalDelivery.difference : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Sent Dispatch Receipts"
        subtitle={`BMC Transit & Reconciliation Ledger • ${booth.name}`}
        showBack
      />

      {/* Top Search & Action Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search Receipt ID, Destination BMC, Date..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Button
          title="+ New Receipt"
          size="sm"
          onPress={() => router.push('/(booth)/review-collection')}
        />
      </View>

      {/* Summary KPI Strip */}
      <View style={[styles.kpiContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.kpiRow}>
          <View style={[styles.kpiTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>TOTAL DISPATCHED</Text>
            <Text style={[styles.kpiNumber, { color: colors.primary }]}>
              {totalDispatchedLitres.toFixed(1)} <Text style={{ fontSize: 13 }}>L</Text>
            </Text>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>{myReceipts.length} Dispatch Receipts</Text>
          </View>

          <View style={[styles.kpiTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>BMC RECONCILED</Text>
            <Text style={[styles.kpiNumber, { color: '#16A34A' }]}>
              {matchedCount} <Text style={{ fontSize: 13 }}>Matched</Text>
            </Text>
            <Text style={[Typography.caption2, { color: '#16A34A' }]}>✓ Verified Weight</Text>
          </View>

          <View style={[styles.kpiTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>IN TRANSIT / HOLD</Text>
            <Text style={[styles.kpiNumber, { color: mismatchCount > 0 ? '#DC2626' : '#0284C7' }]}>
              {pendingCount} <Text style={{ fontSize: 13 }}>Pending</Text>
            </Text>
            <Text style={[Typography.caption2, { color: mismatchCount > 0 ? '#DC2626' : colors.textMuted }]}>
              {mismatchCount > 0 ? `${mismatchCount} Under Audit` : 'Normal Transit'}
            </Text>
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterChipRow}>
          <Pressable
            onPress={() => setSelectedFilter('all')}
            style={[
              styles.filterChip,
              selectedFilter === 'all'
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.filterChipText, { color: selectedFilter === 'all' ? '#FFFFFF' : colors.textSecondary }]}>
              All ({myReceipts.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedFilter('pending')}
            style={[
              styles.filterChip,
              selectedFilter === 'pending'
                ? { backgroundColor: '#0284C7', borderColor: '#0284C7' }
                : { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.filterChipText, { color: selectedFilter === 'pending' ? '#FFFFFF' : colors.textSecondary }]}>
              In Transit ({pendingCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedFilter('matched')}
            style={[
              styles.filterChip,
              selectedFilter === 'matched'
                ? { backgroundColor: '#16A34A', borderColor: '#16A34A' }
                : { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.filterChipText, { color: selectedFilter === 'matched' ? '#FFFFFF' : colors.textSecondary }]}>
              Matched ({matchedCount})
            </Text>
          </Pressable>

          {mismatchCount > 0 && (
            <Pressable
              onPress={() => setSelectedFilter('mismatch')}
              style={[
                styles.filterChip,
                selectedFilter === 'mismatch'
                  ? { backgroundColor: '#DC2626', borderColor: '#DC2626' }
                  : { backgroundColor: colors.background, borderColor: colors.border }
              ]}
            >
              <Text style={[styles.filterChipText, { color: selectedFilter === 'mismatch' ? '#FFFFFF' : '#DC2626' }]}>
                Variance ({mismatchCount})
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Compact Receipts List */}
      <FlatList
        data={filteredReceipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Dispatch Receipts"
            message={searchQuery ? `No receipts match "${searchQuery}".` : 'No dispatch receipts found under this filter.'}
            icon="paper-plane-outline"
          />
        }
        renderItem={({ item }) => {
          const delivery = bmcDeliveries.find(d => d.boothReceiptId === item.id);
          const hasDiscrepancy = delivery?.status === 'mismatch_investigation';
          const badge = getStatusBadge(item);

          return (
            <Card style={[styles.compactReceiptCard, { borderColor: hasDiscrepancy ? '#FCA5A5' : colors.border }]}>
              {/* Header: Receipt Number & Status Badge */}
              <View style={styles.cardHeader}>
                <View style={styles.receiptTitleRow}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '900' }]}>
                    #{item.id}
                  </Text>
                  <View style={[styles.sessionPill, { backgroundColor: item.session === 'morning' ? '#FEF3C7' : '#E0E7FF' }]}>
                    <Ionicons 
                      name={item.session === 'morning' ? 'sunny' : 'moon'} 
                      size={10} 
                      color={item.session === 'morning' ? '#D97706' : '#4F46E5'} 
                    />
                    <Text style={[styles.sessionPillText, { color: item.session === 'morning' ? '#92400E' : '#3730A3' }]}>
                      {item.session.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Ionicons name={badge.icon} size={12} color={badge.color} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </View>

              {/* Middle Row: Route Corridor & Large Volume */}
              <View style={styles.cardMidRow}>
                <View style={styles.routeTextCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="business-outline" size={13} color={colors.primary} />
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700', marginLeft: 4 }]} numberOfLines={1}>
                      {item.boothName}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Ionicons name="arrow-forward" size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Ionicons name="snow-outline" size={13} color="#0284C7" />
                    <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800', marginLeft: 4 }]} numberOfLines={1}>
                      {item.bmcName}
                    </Text>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 3 }]}>
                    Date: {item.collectionDate}
                  </Text>
                </View>

                <View style={styles.volumeRightBox}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Dispatched</Text>
                  <Text style={[styles.volumeLargeNum, { color: colors.primary }]}>
                    {item.dispatchQuantity.toFixed(1)} <Text style={{ fontSize: 13, fontWeight: '700' }}>L</Text>
                  </Text>
                </View>
              </View>

              {/* Bottom Action Row with "More View" Button */}
              <View style={[styles.cardBottomRow, { borderTopColor: colors.border }]}>
                <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '600', flex: 1 }]}>
                  👨‍🌾 {item.totalFarmersCount} Farmers • 🥛 {item.totalRecordsCount} Batches
                </Text>

                <Pressable
                  style={[styles.moreViewBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setSelectedReceiptForModal(item)}
                >
                  <Ionicons name="eye-outline" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={styles.moreViewBtnText}>More View</Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />

      {/* Full-Data Popup Modal */}
      {selectedReceiptForModal && modalBadge && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedReceiptForModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', letterSpacing: 0.5 }]}>
                    AAVIN DISPATCH CONSIGNMENT MANIFEST
                  </Text>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '900', marginTop: 2 }]}>
                    Receipt #{selectedReceiptForModal.id}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    Collection Date: {selectedReceiptForModal.collectionDate} • {selectedReceiptForModal.session.toUpperCase()} Shift
                  </Text>
                </View>

                <Pressable 
                  onPress={() => setSelectedReceiptForModal(null)} 
                  hitSlop={8}
                  style={[styles.modalCloseBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                {/* Status Strip */}
                <View style={[styles.modalStatusStrip, { backgroundColor: modalBadge.bg }]}>
                  <Ionicons name={modalBadge.icon} size={15} color={modalBadge.color} style={{ marginRight: 6 }} />
                  <Text style={[styles.modalStatusText, { color: modalBadge.color }]}>
                    {modalBadge.label}
                  </Text>
                </View>

                {/* Transit Corridor Origin & Destination */}
                <View style={[styles.modalCorridorBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                  <View style={styles.modalCorridorCol}>
                    <Ionicons name="business" size={16} color={colors.primary} />
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>ORIGIN BOOTH</Text>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', textAlign: 'center' }]} numberOfLines={1}>
                      {selectedReceiptForModal.boothName}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textMuted }]}>ID: {selectedReceiptForModal.boothId}</Text>
                  </View>

                  <Ionicons name="arrow-forward-circle" size={20} color="#0284C7" style={{ marginHorizontal: 6 }} />

                  <View style={styles.modalCorridorCol}>
                    <Ionicons name="snow" size={16} color="#0284C7" />
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>DESTINATION BMC</Text>
                    <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800', textAlign: 'center' }]} numberOfLines={1}>
                      {selectedReceiptForModal.bmcName}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textMuted }]}>ID: {selectedReceiptForModal.bmcId}</Text>
                  </View>
                </View>

                {/* 3-Column Reconciliation Metrics */}
                <View style={[styles.modalReconGrid, { borderColor: colors.border }]}>
                  <View style={styles.modalGridItem}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                      DECLARED INTAKE
                    </Text>
                    <Text style={[Typography.headline, { color: colors.primary, fontWeight: '900', marginTop: 2 }]}>
                      {selectedReceiptForModal.dispatchQuantity.toFixed(1)} L
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                      Booth Net Volume
                    </Text>
                  </View>

                  <View style={[styles.modalGridItem, styles.modalGridBorder, { borderColor: colors.border }]}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                      BMC WEIGHED
                    </Text>
                    <Text style={[Typography.headline, { color: colors.text, fontWeight: '900', marginTop: 2 }]}>
                      {modalDelivery?.measuredReceivedQuantity !== undefined 
                        ? `${modalDelivery.measuredReceivedQuantity.toFixed(1)} L` 
                        : 'In Transit'}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                      {modalDelivery?.receivedAt ? modalDelivery.receivedAt.split('T')[1]?.slice(0, 5) : 'Awaiting Arrival'}
                    </Text>
                  </View>

                  <View style={styles.modalGridItem}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                      VARIANCE
                    </Text>
                    <Text 
                      style={[
                        Typography.headline, 
                        { 
                          fontWeight: '900', 
                          marginTop: 2,
                          color: !modalDelivery?.measuredReceivedQuantity 
                            ? colors.textMuted 
                            : modalVariance > 0 
                              ? '#DC2626' 
                              : '#16A34A' 
                        }
                      ]}
                    >
                      {modalDelivery?.measuredReceivedQuantity !== undefined 
                        ? `${modalVariance > 0 ? '+' : ''}${modalVariance.toFixed(1)} L` 
                        : '0.0 L'}
                    </Text>
                    <Text style={[Typography.caption2, { color: !modalDelivery?.measuredReceivedQuantity ? colors.textMuted : modalVariance > 0 ? '#DC2626' : '#16A34A' }]}>
                      {!modalDelivery?.measuredReceivedQuantity ? 'Pending BMC' : Math.abs(modalVariance) <= 0.5 ? 'Within Tolerance' : '⚠️ Variance'}
                    </Text>
                  </View>
                </View>

                {/* Additional Full Consignment Data */}
                <View style={styles.modalDetailsGrid}>
                  <View style={[styles.modalDetailTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Producers Count</Text>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      {selectedReceiptForModal.totalFarmersCount} Farmers
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>Direct Dairy Farmers</Text>
                  </View>

                  <View style={[styles.modalDetailTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Batches Included</Text>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      {selectedReceiptForModal.totalRecordsCount} Records
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>Audit Trail Locked</Text>
                  </View>

                  <View style={[styles.modalDetailTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Measurement Basis</Text>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      {selectedReceiptForModal.measurementBasis.toUpperCase()}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>Calibrated Meter</Text>
                  </View>

                  <View style={[styles.modalDetailTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Authorized Officer</Text>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
                      {selectedReceiptForModal.createdBy}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>Booth Station Operator</Text>
                  </View>
                </View>

                {/* Verification Code Box */}
                <View style={[styles.modalTokenCard, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Ionicons name="key-outline" size={16} color="#0072BC" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[Typography.caption2, { color: '#0072BC', fontWeight: '800' }]}>
                      DIGITAL WAYBILL TOKEN
                    </Text>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '900' }]}>
                      {selectedReceiptForModal.verificationCode}
                    </Text>
                  </View>
                  <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
                </View>

                {/* Remarks if any */}
                {selectedReceiptForModal.notes && (
                  <View style={[styles.modalNotesCard, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[Typography.caption2, { color: colors.textSecondary, flex: 1 }]}>
                      Transit Notes: {selectedReceiptForModal.notes}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Modal Bottom Actions */}
              <View style={styles.modalActionsRow}>
                <Button
                  title="Open Full Digital Waybill & Slip ➔"
                  size="md"
                  onPress={() => {
                    const id = selectedReceiptForModal.id;
                    setSelectedReceiptForModal(null);
                    router.push(`/(booth)/receipt-preview?receiptId=${id}` as any);
                  }}
                />

                <Button
                  title="Close"
                  variant="outline"
                  size="md"
                  onPress={() => setSelectedReceiptForModal(null)}
                  style={{ marginTop: 6 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  kpiContainer: {
    padding: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiTile: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  compactReceiptCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  receiptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  sessionPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  routeTextCol: {
    flex: 1,
    marginRight: 10,
  },
  volumeRightBox: {
    alignItems: 'flex-end',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  volumeLargeNum: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 1,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moreViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  moreViewBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    gap: 12,
    paddingBottom: 10,
  },
  modalStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalStatusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  modalCorridorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalCorridorCol: {
    flex: 1,
    alignItems: 'center',
  },
  modalReconGrid: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalGridItem: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  modalGridBorder: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  modalDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalDetailTile: {
    width: '48.5%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalTokenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalNotesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  modalActionsRow: {
    marginTop: 10,
  },
});
