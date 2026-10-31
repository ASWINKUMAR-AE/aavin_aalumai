import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Alert,
  Modal,
  TextInput,
  Pressable,
  useWindowDimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { BMCDelivery } from '../../types/aavin';

export type DeliveryFilterStatus = 'all' | 'pending' | 'matched' | 'mismatch' | 'pending_reconciliation';

export default function BMCReceiveMilkScreen() {
  const { user } = useAuth();
  const { bmcDeliveries, bmcs, receiveBmcDelivery, union } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTabletOrDesktop = width >= 768;

  const { statusFilter } = useLocalSearchParams<{ statusFilter?: string }>();

  const bmcId = user?.associatedId || 'BMC001';
  const bmc = bmcs.find(b => b.id === bmcId) || bmcs[0];

  // Filters State
  const [activeFilter, setActiveFilter] = useState<DeliveryFilterStatus>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle incoming statusFilter query param
  useEffect(() => {
    if (statusFilter === 'pending_arrival') {
      setActiveFilter('pending');
    } else if (statusFilter === 'matched') {
      setActiveFilter('matched');
    } else if (statusFilter === 'mismatch') {
      setActiveFilter('mismatch');
    }
  }, [statusFilter]);

  // Modal State for Flow-Meter Measurement Entry
  const [selectedDelivery, setSelectedDelivery] = useState<BMCDelivery | null>(null);
  const [measuredQty, setMeasuredQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Deliveries filtered by BMC
  const allBmcDeliveries = useMemo(() => {
    return bmcDeliveries.filter(d => d.bmcId === bmc.id || !d.bmcId);
  }, [bmcDeliveries, bmc.id]);

  // Filtered Deliveries Pipeline
  const filteredDeliveries = useMemo(() => {
    return allBmcDeliveries.filter(item => {
      // Date Filter
      if (dateFilter === 'today' && item.collectionDate !== '2026-10-12') return false;
      if (dateFilter === 'yesterday' && item.collectionDate !== '2026-10-11') return false;

      // Status Filter
      const isPending = item.status === 'pending_arrival' || item.measuredReceivedQuantity === undefined;
      const diff = Math.abs((item.difference ?? (item.declaredDispatchQuantity - (item.measuredReceivedQuantity || 0))));
      const isMismatch = !isPending && (item.status === 'mismatch_investigation' || diff > union.mismatchThresholdLitres);
      const isMatched = !isPending && (item.status === 'matched' || diff <= union.mismatchThresholdLitres);
      const isPendingRecon = !isPending && (item.status === 'escalated_to_union' || (item.discrepancyCaseId && item.status !== 'resolved'));

      if (activeFilter === 'pending' && !isPending) return false;
      if (activeFilter === 'matched' && !isMatched) return false;
      if (activeFilter === 'mismatch' && !isMismatch) return false;
      if (activeFilter === 'pending_reconciliation' && !isPendingRecon) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = item.boothName.toLowerCase().includes(query);
        const idMatch = item.boothReceiptId.toLowerCase().includes(query) || item.id.toLowerCase().includes(query) || item.boothId.toLowerCase().includes(query);
        if (!nameMatch && !idMatch) return false;
      }

      return true;
    });
  }, [allBmcDeliveries, dateFilter, activeFilter, searchQuery, union.mismatchThresholdLitres]);

  // Counts for Badges
  const filterCounts = useMemo(() => {
    const pendingCount = allBmcDeliveries.filter(d => d.status === 'pending_arrival' || d.measuredReceivedQuantity === undefined).length;
    const mismatchCount = allBmcDeliveries.filter(d => {
      if (d.measuredReceivedQuantity === undefined) return false;
      const diff = Math.abs(d.declaredDispatchQuantity - d.measuredReceivedQuantity);
      return d.status === 'mismatch_investigation' || diff > union.mismatchThresholdLitres;
    }).length;
    const matchedCount = allBmcDeliveries.filter(d => {
      if (d.measuredReceivedQuantity === undefined) return false;
      const diff = Math.abs(d.declaredDispatchQuantity - d.measuredReceivedQuantity);
      return d.status === 'matched' || diff <= union.mismatchThresholdLitres;
    }).length;

    return {
      all: allBmcDeliveries.length,
      pending: pendingCount,
      matched: matchedCount,
      mismatch: mismatchCount,
    };
  }, [allBmcDeliveries, union.mismatchThresholdLitres]);

  const handleOpenReceiveModal = (delivery: BMCDelivery) => {
    setSelectedDelivery(delivery);
    setMeasuredQty(delivery.measuredReceivedQuantity?.toString() || delivery.declaredDispatchQuantity.toString());
  };

  const handleConfirmMeasurement = () => {
    if (!selectedDelivery) return;

    const qty = parseFloat(measuredQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Volume', 'Please enter a valid calibrated milk volume in litres.');
      return;
    }

    setSubmitting(true);
    try {
      const result = receiveBmcDelivery(
        selectedDelivery.id,
        qty,
        user?.fullName || 'R. Sundar (BMC In-Charge)'
      );

      const targetDelivery = selectedDelivery;
      setSelectedDelivery(null);

      if (result.isMismatch) {
        Alert.alert(
          '⚠️ QUANTITY MISMATCH DETECTED',
          `Society Declared: ${targetDelivery.declaredDispatchQuantity.toFixed(2)} L\nBMC Flow Meter: ${qty.toFixed(2)} L\nNet Variance: ${result.difference.toFixed(2)} L (${((Math.abs(result.difference) / targetDelivery.declaredDispatchQuantity) * 100).toFixed(1)}%)\n\n• Delivery flagged as 'Mismatched - Investigation Required'\n• Discrepancy Case automatically opened\n• Real-time alerts dispatched to BMC and Union Management.`,
          [
            {
              text: 'Open Investigation Case',
              onPress: () => router.push('/(bmc)/investigations'),
            },
            {
              text: 'OK',
            },
          ]
        );
      } else {
        Alert.alert(
          'Delivery Confirmed & Balanced!',
          `Recorded ${qty.toFixed(2)} Litres from ${targetDelivery.boothName}. Matched with declared receipt quantity without variance. Dispatch receipt confirmed.`,
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not record measurement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader
        title="Receive Milk Deliveries"
        subtitle={`Intake Flow Meter Station • ${bmc.name}`}
        showBack
      />

      {/* Threshold Rule Info Strip */}
      <View style={[styles.thresholdStrip, { backgroundColor: colors.primaryLight, borderBottomColor: colors.border }]}>
        <Ionicons name="information-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[Typography.caption2, { color: colors.primary, flex: 1, fontWeight: '600' }]}>
          Aavin Tolerance Rule: ±{union.mismatchThresholdLitres.toFixed(1)} L ({union.mismatchThresholdPercent}%). Mismatches automatically open an investigation audit case.
        </Text>
      </View>

      {/* Filter and Date Tabs Strip */}
      <View style={[styles.controlsCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            placeholder="Search society, receipt #, or delivery ID..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Date Selector Chips */}
        <View style={styles.dateChipsRow}>
          <Text style={[Typography.caption2, { color: colors.textSecondary, alignSelf: 'center', marginRight: 4 }]}>
            Date:
          </Text>
          <Pressable
            style={[styles.dateChip, dateFilter === 'all' && { backgroundColor: colors.primary }]}
            onPress={() => setDateFilter('all')}
          >
            <Text style={[styles.dateChipText, dateFilter === 'all' && styles.chipTextActive]}>
              All Dates
            </Text>
          </Pressable>
          <Pressable
            style={[styles.dateChip, dateFilter === 'today' && { backgroundColor: colors.primary }]}
            onPress={() => setDateFilter('today')}
          >
            <Text style={[styles.dateChipText, dateFilter === 'today' && styles.chipTextActive]}>
              Today (12 Oct)
            </Text>
          </Pressable>
          <Pressable
            style={[styles.dateChip, dateFilter === 'yesterday' && { backgroundColor: colors.primary }]}
            onPress={() => setDateFilter('yesterday')}
          >
            <Text style={[styles.dateChipText, dateFilter === 'yesterday' && styles.chipTextActive]}>
              Yesterday (11 Oct)
            </Text>
          </Pressable>
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filterChipsRow}>
          <Pressable
            style={[styles.filterChip, activeFilter === 'all' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.chipTextActive]}>
              All ({filterCounts.all})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'pending' && { backgroundColor: '#D97706' }]}
            onPress={() => setActiveFilter('pending')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'pending' && styles.chipTextActive]}>
              Awaiting Arrival ({filterCounts.pending})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'matched' && { backgroundColor: '#16A34A' }]}
            onPress={() => setActiveFilter('matched')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'matched' && styles.chipTextActive]}>
              Matched ({filterCounts.matched})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'mismatch' && { backgroundColor: '#DC2626' }]}
            onPress={() => setActiveFilter('mismatch')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'mismatch' && styles.chipTextActive]}>
              Mismatched ({filterCounts.mismatch})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Deliveries List */}
      <FlatList
        data={filteredDeliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Deliveries Found"
            message={searchQuery ? "No feeder deliveries match your search query." : "No feeder society deliveries found for the selected filter."}
            icon="cube-outline"
          />
        }
        renderItem={({ item }) => {
          const isPending = item.status === 'pending_arrival' || item.measuredReceivedQuantity === undefined;
          const diff = item.difference !== undefined
            ? item.difference
            : (item.measuredReceivedQuantity !== undefined ? item.declaredDispatchQuantity - item.measuredReceivedQuantity : undefined);
          const absDiff = diff !== undefined ? Math.abs(diff) : 0;
          const isMismatch = !isPending && (item.status === 'mismatch_investigation' || absDiff > union.mismatchThresholdLitres);
          const isMatched = !isPending && (item.status === 'matched' || absDiff <= union.mismatchThresholdLitres);
          const isBalanced = isMatched && absDiff === 0;

          // Compute Status Badge Metadata cleanly
          const getStatusMeta = () => {
            if (isPending) {
              return {
                label: 'Awaiting Arrival',
                color: '#D97706',
                bgColor: '#FEF3C7',
                borderColor: '#FDE68A',
                icon: 'time' as const,
              };
            }
            if (isMismatch) {
              return {
                label: 'Mismatched',
                color: '#DC2626',
                bgColor: '#FEE2E2',
                borderColor: '#FECACA',
                icon: 'alert-circle' as const,
              };
            }
            if (isBalanced) {
              return {
                label: 'Balanced',
                color: '#16A34A',
                bgColor: '#DCFCE7',
                borderColor: '#BBF7D0',
                icon: 'shield-checkmark' as const,
              };
            }
            return {
              label: 'Matched',
              color: '#15803D',
              bgColor: '#DCFCE7',
              borderColor: '#BBF7D0',
              icon: 'checkmark-circle' as const,
            };
          };

          const statusMeta = getStatusMeta();

          return (
            <Card style={[styles.deliveryCard, isMismatch && { borderColor: '#F87171', borderWidth: 1.5 }]}>
              {/* 1. TOP AREA: Society Name, References, Date/Time & Arrival/Reconciliation Status Badge */}
              <View style={styles.cardTopArea}>
                <View style={styles.headerInfoCol}>
                  <View style={styles.societyNameRow}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', flex: 1, flexWrap: 'wrap' }]}>
                      {item.boothName}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={[styles.idTag, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.idTagText, { color: colors.primary }]}>{item.boothId}</Text>
                    </View>
                    <Ionicons name="receipt-outline" size={13} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 2 }]}>
                      Slip #{item.boothReceiptId}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.border, marginHorizontal: 4 }]}>•</Text>
                    <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 2 }]}>
                      {item.dispatchTime}
                    </Text>
                  </View>
                </View>

                {/* Status Badge (Protected with flexShrink and flexWrap so it never overflows) */}
                <View style={styles.statusBadgeWrapper}>
                  <View style={[styles.statusBadge, { backgroundColor: statusMeta.bgColor, borderColor: statusMeta.borderColor }]}>
                    <Ionicons name={statusMeta.icon} size={13} color={statusMeta.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusBadgeText, { color: statusMeta.color }]} numberOfLines={2}>
                      {statusMeta.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2. MIDDLE AREA: Clearly Separated Metric Blocks (Dispatched, Received, Difference) */}
              <View style={[styles.metricsContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {/* Dispatched */}
                <View style={styles.metricBlock}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Dispatched</Text>
                  <Text style={[Typography.headline, { color: colors.primary, fontWeight: '900', marginTop: 2 }]}>
                    {item.declaredDispatchQuantity.toFixed(1)} <Text style={{ fontSize: 12 }}>L</Text>
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>Society Slip</Text>
                </View>

                <View style={[styles.blockDivider, { backgroundColor: colors.border }]} />

                {/* Received */}
                <View style={styles.metricBlock}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Received</Text>
                  <Text style={[Typography.headline, { color: item.measuredReceivedQuantity !== undefined ? colors.text : colors.textMuted, fontWeight: '900', marginTop: 2 }]}>
                    {item.measuredReceivedQuantity !== undefined
                      ? `${item.measuredReceivedQuantity.toFixed(1)} L`
                      : 'Not recorded'}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>
                    {item.measuredReceivedQuantity !== undefined ? 'Flow Meter' : 'Pending Intake'}
                  </Text>
                </View>

                <View style={[styles.blockDivider, { backgroundColor: colors.border }]} />

                {/* Difference */}
                <View style={styles.metricBlock}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Difference</Text>
                  <Text
                    style={[
                      Typography.headline,
                      {
                        color: diff !== undefined
                          ? (absDiff > union.mismatchThresholdLitres ? '#DC2626' : '#16A34A')
                          : colors.textMuted,
                        fontWeight: '900',
                        marginTop: 2,
                      }
                    ]}
                  >
                    {diff !== undefined
                      ? (diff === 0 ? '0.00 L' : `${diff > 0 ? '-' : '+'}${absDiff.toFixed(1)} L`)
                      : '—'}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>
                    {diff !== undefined
                      ? (diff === 0 ? 'Balanced' : (absDiff > union.mismatchThresholdLitres ? 'Shortfall' : 'Within Tol.'))
                      : 'Unmeasured'}
                  </Text>
                </View>
              </View>

              {/* 3. BOTTOM AREA: Matched/Mismatched label, Contextual info & Actions */}
              <View style={[styles.cardBottomArea, { borderTopColor: colors.border }]}>
                <View style={styles.contextInfoCol}>
                  {/* Status Indicator Row */}
                  <View style={styles.bottomStatusRow}>
                    <View style={[styles.bottomStatusDot, { backgroundColor: statusMeta.color }]} />
                    <Text style={[Typography.caption1, { color: statusMeta.color, fontWeight: '800' }]}>
                      {statusMeta.label}
                      {diff !== undefined && absDiff > 0 ? ` (${absDiff.toFixed(1)} L shortfall)` : ''}
                    </Text>
                  </View>

                  {item.receivedBy && (
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                      Verified by: <Text style={{ fontWeight: '700' }}>{item.receivedBy}</Text>
                    </Text>
                  )}

                  {item.discrepancyCaseId && (
                    <View style={styles.caseBadgeRow}>
                      <Ionicons name="warning" size={13} color="#DC2626" />
                      <Text style={[Typography.caption2, { color: '#DC2626', fontWeight: '800', marginLeft: 4 }]}>
                        Case #{item.discrepancyCaseId} Active
                      </Text>
                    </View>
                  )}
                </View>

                {/* Actions Row */}
                <View style={styles.cardActionsRow}>
                  {isPending ? (
                    <Button
                      title="Confirm Milk Received"
                      onPress={() => handleOpenReceiveModal(item)}
                      style={{ minWidth: 150 }}
                    />
                  ) : (
                    <View style={styles.multiActionsContainer}>
                      <Button
                        title="Re-Measure"
                        variant="outline"
                        size="sm"
                        onPress={() => handleOpenReceiveModal(item)}
                      />
                      {isMismatch && (
                        <Button
                          title="Audit"
                          variant="destructive"
                          size="sm"
                          onPress={() => router.push('/(bmc)/investigations')}
                        />
                      )}
                      <Button
                        title="Details"
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push(`/(bmc)/society-details?societyId=${item.boothId}`)}
                      />
                    </View>
                  )}
                </View>
              </View>
            </Card>
          );
        }}
      />

      {/* Calibrated Flow Meter Measurement Entry Modal */}
      {selectedDelivery && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedDelivery(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedDelivery(null)}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.title3, { color: colors.text, fontWeight: '900' }]}>
                    Confirm Milk Received
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                    {selectedDelivery.boothName} • Slip #{selectedDelivery.boothReceiptId}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedDelivery(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Declared Reference Box */}
              <View style={[styles.declaredBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
                  SOCIETY DECLARED DISPATCH QUANTITY
                </Text>
                <Text style={[styles.declaredNum, { color: colors.primary }]}>
                  {selectedDelivery.declaredDispatchQuantity.toFixed(2)} Litres
                </Text>
                <Text style={[Typography.caption2, { color: colors.primary }]}>
                  Preserved from society dispatch slip. Immutable digital record.
                </Text>
              </View>

              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginTop: 16, marginBottom: 6 }]}>
                BMC Flow Meter Measured Quantity (Litres) *
              </Text>
              <TextInput
                placeholder="Enter measured litres e.g. 580.0 (or 575.0)"
                placeholderTextColor={colors.textMuted}
                value={measuredQty}
                onChangeText={setMeasuredQty}
                keyboardType="decimal-pad"
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />

              {/* Dynamic Live Difference Preview */}
              {(() => {
                const entered = parseFloat(measuredQty);
                if (!isNaN(entered) && entered > 0) {
                  const diff = parseFloat((selectedDelivery.declaredDispatchQuantity - entered).toFixed(2));
                  const isDiff = Math.abs(diff) > union.mismatchThresholdLitres;
                  return (
                    <View style={[styles.diffPreview, { backgroundColor: isDiff ? '#FEF2F2' : '#F0FDF4', borderColor: isDiff ? '#FCA5A5' : '#BBF7D0' }]}>
                      <Ionicons
                        name={isDiff ? 'alert-circle' : 'checkmark-circle'}
                        size={20}
                        color={isDiff ? '#DC2626' : '#16A34A'}
                      />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={[Typography.subhead, { color: isDiff ? '#B91C1C' : '#166534', fontWeight: '800' }]}>
                          Calculated Difference: {diff.toFixed(2)} Litres
                        </Text>
                        <Text style={[Typography.caption2, { color: isDiff ? '#991B1B' : '#166534' }]}>
                          {isDiff
                            ? `⚠️ Variance exceeds threshold (±${union.mismatchThresholdLitres.toFixed(1)} L). Discrepancy Case will be logged automatically.`
                            : '✓ Balanced intake. Delivery will be verified as matched.'}
                        </Text>
                      </View>
                    </View>
                  );
                }
                return null;
              })()}

              <Button
                title={submitting ? "Saving Measurement..." : "Confirm & Save Measurement"}
                size="lg"
                loading={submitting}
                onPress={handleConfirmMeasurement}
                style={{ marginTop: 16 }}
              />
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  thresholdStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  controlsCard: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    padding: 0,
  },
  dateChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 48,
  },

  // Delivery Card Layout
  deliveryCard: {
    padding: 14,
    borderRadius: 16,
  },

  // 1. Top Area
  cardTopArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerInfoCol: {
    flex: 1,
    minWidth: 180,
  },
  societyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  idTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeWrapper: {
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 160,
    flexWrap: 'wrap',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    flexShrink: 1,
  },

  // 2. Middle Area (Metric Blocks)
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginVertical: 12,
  },
  metricBlock: {
    flex: 1,
    alignItems: 'center',
  },
  blockDivider: {
    width: 1,
    height: 36,
  },

  // 3. Bottom Area
  cardBottomArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    flexWrap: 'wrap',
  },
  contextInfoCol: {
    flex: 1,
    minWidth: 160,
  },
  bottomStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  caseBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cardActionsRow: {
    alignSelf: 'flex-end',
  },
  multiActionsContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  declaredBox: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  declaredNum: {
    fontSize: 26,
    fontWeight: '900',
    marginVertical: 2,
  },
  inputField: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
  },
  diffPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
});
