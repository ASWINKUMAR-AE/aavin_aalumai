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
import { useAavinStore } from '../../../store/AavinStoreContext';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { Typography } from '../../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { BMCReceipt } from '../../../types/aavin';

export const UnionDesktopReports: React.FC = () => {
  const { user } = useAuth();
  const { bmcReceipts, bmcDeliveries, bmcs, reviewBmcReceipt } = useAavinStore();
  const { colors, isDark } = useTheme();

  const [bmcFilter, setBmcFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'strict'>('grid');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // "Page-Above-Page" Detail Modal State
  const [detailReceipt, setDetailReceipt] = useState<BMCReceipt | null>(null);
  const [actionType, setActionType] = useState<'reviewed_by_union' | 'returned_for_correction'>('reviewed_by_union');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const filteredReceipts = bmcReceipts.filter(r => {
    if (bmcFilter !== 'all' && r.bmcId !== bmcFilter) return false;
    return true;
  });

  const handleOpenDetail = (receipt: BMCReceipt, type: 'reviewed_by_union' | 'returned_for_correction' = 'reviewed_by_union') => {
    setDetailReceipt(receipt);
    setActionType(type);
    setReviewNotes(receipt.unionReviewNotes || '');
  };

  const handleSaveReview = () => {
    if (!detailReceipt) return;
    if (!reviewNotes.trim()) {
      Alert.alert('Notes Required', 'Please enter review findings or directives.');
      return;
    }

    setReviewing(true);
    try {
      reviewBmcReceipt(
        detailReceipt.id,
        reviewNotes.trim(),
        user?.fullName || 'Dr. S. Sundaram (General Manager)',
        actionType
      );
      setDetailReceipt(null);
      Alert.alert(
        actionType === 'reviewed_by_union' ? 'Consolidated Report Approved' : 'Report Returned for Correction',
        `Receipt #${detailReceipt.id} updated with executive directives.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save review.');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <ScrollView style={[styles.canvas, { backgroundColor: colors.background }]} contentContainerStyle={styles.canvasContainer}>
      <View style={styles.contentConstrained}>

        {/* =========================================================================
            HEADER & VIEW MODE TOGGLE (Grid vs Strict List)
           ========================================================================= */}
        <View style={[styles.headerStrip, { borderBottomColor: colors.border }]}>
          <View>
            <View style={styles.breadcrumbRow}>
              <Text style={[styles.breadcrumbRoot, { color: colors.textSecondary }]}>Union Executive</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} />
              <Text style={[styles.breadcrumbActive, { color: colors.primary }]}>Daily BMC Receipts Audit</Text>
            </View>
            <Text style={[styles.mainTitle, { color: colors.text }]}>
              BMC Collection & Reconciliation Reports
            </Text>
            <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
              District consolidation audit • Showing {filteredReceipts.length} receipts
            </Text>
          </View>

          {/* Controls: View Mode Toggle */}
          <View style={styles.headerRightControls}>
            <View style={[styles.viewModeToggle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}>
              <Pressable
                style={[styles.toggleBtn, viewMode === 'grid' && { backgroundColor: colors.card }]}
                onPress={() => setViewMode('grid')}
              >
                <Ionicons name="grid-outline" size={14} color={viewMode === 'grid' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.toggleText, { color: viewMode === 'grid' ? colors.text : colors.textSecondary }, viewMode === 'grid' && { fontWeight: '800' }]}>
                  Grid View
                </Text>
              </Pressable>

              <Pressable
                style={[styles.toggleBtn, viewMode === 'strict' && { backgroundColor: colors.card }]}
                onPress={() => setViewMode('strict')}
              >
                <Ionicons name="list-outline" size={14} color={viewMode === 'strict' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.toggleText, { color: viewMode === 'strict' ? colors.text : colors.textSecondary }, viewMode === 'strict' && { fontWeight: '800' }]}>
                  Strict List
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* =========================================================================
            BMC FILTER CHIPS (Horizontal Strip)
           ========================================================================= */}
        <View style={styles.filterStripContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            <Pressable
              style={[
                styles.bmcFilterChip,
                { backgroundColor: bmcFilter === 'all' ? colors.primary : isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }
              ]}
              onPress={() => setBmcFilter('all')}
            >
              <Ionicons name="business" size={13} color={bmcFilter === 'all' ? '#FFFFFF' : colors.primary} />
              <Text style={[styles.chipText, { color: bmcFilter === 'all' ? '#FFFFFF' : colors.textSecondary }, bmcFilter === 'all' && { fontWeight: '800' }]}>
                All BMCs ({bmcReceipts.length})
              </Text>
            </Pressable>

            {bmcs.map(b => {
              const count = bmcReceipts.filter(r => r.bmcId === b.id).length;
              const isSelected = bmcFilter === b.id;
              return (
                <Pressable
                  key={b.id}
                  style={[
                    styles.bmcFilterChip,
                    { backgroundColor: isSelected ? colors.primary : isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }
                  ]}
                  onPress={() => setBmcFilter(b.id)}
                >
                  <Ionicons name="snow-outline" size={13} color={isSelected ? '#FFFFFF' : '#0284C7'} />
                  <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : colors.textSecondary }, isSelected && { fontWeight: '800' }]}>
                    {b.name} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* =========================================================================
            REPORT ITEMS DISPLAY: GRID VIEW vs STRICT LIST VIEW
           ========================================================================= */}
        {viewMode === 'grid' ? (
          /* GRID VIEW: 3 Compact Cards per row with hover elevation */
          <View style={styles.cardsGrid}>
            {filteredReceipts.map(item => {
              const isReviewed = item.status === 'reviewed_by_union';
              const isReturned = item.status === 'returned_for_correction';
              const isHovered = hoveredId === item.id;
              const hasDiff = (item.netDifference || 0) > 0;

              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.verticalReportCard,
                    { backgroundColor: colors.card, borderColor: hasDiff ? '#F59E0B' : colors.border },
                    isHovered && styles.cardHovered,
                  ]}
                  onHoverIn={() => setHoveredId(item.id)}
                  onHoverOut={() => setHoveredId(null)}
                  onPress={() => handleOpenDetail(item)}
                >
                  {/* Top: Icon + Status Pill */}
                  <View style={styles.vCardHeaderRow}>
                    <View style={styles.vIconCircle}>
                      <Ionicons name="receipt" size={16} color={colors.primary} />
                    </View>
                    <View style={[
                      styles.statusPill,
                      { backgroundColor: isReviewed ? '#DCFCE7' : isReturned ? '#FEE2E2' : '#FEF3C7' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: isReviewed ? '#15803D' : isReturned ? '#991B1B' : '#B45309' }
                      ]}>
                        {isReviewed ? 'APPROVED' : isReturned ? 'RETURNED' : 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  {/* ID & Date */}
                  <View style={styles.vTitleBlock}>
                    <Text style={[styles.vReportIdText, { color: colors.text }]}>{item.id}</Text>
                    <Text style={[styles.vReportDateText, { color: colors.textSecondary }]}>{item.collectionDate}</Text>
                  </View>

                  {/* Facility Name */}
                  <View style={[styles.vFacilityPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="business" size={12} color={colors.primary} />
                    <Text style={[styles.vBmcNameText, { color: colors.text }]} numberOfLines={1}>
                      {item.bmcName}
                    </Text>
                  </View>

                  {/* Vertical Stack of Metrics */}
                  <View style={[styles.vMetricsCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <View style={styles.vMetricItem}>
                      <Text style={[styles.vMetricLabel, { color: colors.textSecondary }]}>Declared</Text>
                      <Text style={[styles.vMetricValue, { color: colors.text }]}>
                        {item.totalDeclaredQuantity?.toFixed(1) ?? '0.0'} L
                      </Text>
                    </View>
                    <View style={styles.vMetricDivider} />
                    <View style={styles.vMetricItem}>
                      <Text style={[styles.vMetricLabel, { color: colors.primary }]}>Received</Text>
                      <Text style={[styles.vMetricValue, { color: colors.primary }]}>
                        {item.totalReceivedQuantity?.toFixed(1) ?? '0.0'} L
                      </Text>
                    </View>
                    <View style={styles.vMetricDivider} />
                    <View style={styles.vMetricItem}>
                      <Text style={[styles.vMetricLabel, { color: hasDiff ? '#DC2626' : '#16A34A' }]}>Variance</Text>
                      <Text style={[styles.vMetricValue, { color: hasDiff ? '#DC2626' : '#16A34A', fontWeight: '800' }]}>
                        {hasDiff ? `-${item.netDifference?.toFixed(1) ?? '0.0'} L` : '0.0 L (OK)'}
                      </Text>
                    </View>
                  </View>

                  {/* Card Bottom: Revenue & Action Button */}
                  <View style={[styles.vCardFooter, { borderTopColor: colors.border }]}>
                    <View>
                      <Text style={[styles.vIncomeLabel, { color: colors.textMuted }]}>Est. Value</Text>
                      <Text style={[styles.vIncomeNum, { color: colors.text }]}>₹{(item.totalRecordedIncome || 0).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={[styles.vInspectBtn, { backgroundColor: colors.primary }]}>
                      <Text style={styles.vInspectBtnText}>Inspect</Text>
                      <Ionicons name="arrow-forward" size={11} color="#FFFFFF" />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          /* STRICT LIST VIEW: Dense Tabular Rows for Rapid Scanning */
          <View style={[styles.strictTableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Table Header */}
            <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[styles.thCell, { flex: 1.2, color: colors.textSecondary }]}>RECEIPT ID</Text>
              <Text style={[styles.thCell, { flex: 2, color: colors.textSecondary }]}>BMC CENTER</Text>
              <Text style={[styles.thCell, { flex: 1.2, color: colors.textSecondary }]}>DATE</Text>
              <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right', color: colors.textSecondary }]}>DECLARED</Text>
              <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right', color: colors.textSecondary }]}>RECEIVED</Text>
              <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right', color: colors.textSecondary }]}>VARIANCE</Text>
              <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center', color: colors.textSecondary }]}>STATUS</Text>
              <Text style={[styles.thCell, { flex: 1, textAlign: 'right', color: colors.textSecondary }]}>ACTION</Text>
            </View>

            {/* Table Body */}
            {filteredReceipts.map(item => {
              const isReviewed = item.status === 'reviewed_by_union';
              const isReturned = item.status === 'returned_for_correction';
              const isHovered = hoveredId === item.id;
              const hasDiff = (item.netDifference || 0) > 0;

              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.tableRow,
                    { borderBottomColor: colors.border },
                    isHovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9' },
                  ]}
                  onHoverIn={() => setHoveredId(item.id)}
                  onHoverOut={() => setHoveredId(null)}
                  onPress={() => handleOpenDetail(item)}
                >
                  <Text style={[styles.tdCell, { flex: 1.2, fontWeight: '800', color: colors.text }]}>{item.id}</Text>
                  <Text style={[styles.tdCell, { flex: 2, color: colors.text }]} numberOfLines={1}>{item.bmcName}</Text>
                  <Text style={[styles.tdCell, { flex: 1.2, color: colors.textSecondary }]}>{item.collectionDate}</Text>
                  <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right', color: colors.text }]}>{item.totalDeclaredQuantity?.toFixed(1) ?? '0.0'} L</Text>
                  <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right', fontWeight: '700', color: colors.primary }]}>{item.totalReceivedQuantity?.toFixed(1) ?? '0.0'} L</Text>
                  <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right', fontWeight: '800', color: hasDiff ? '#DC2626' : '#16A34A' }]}>
                    {hasDiff ? `-${item.netDifference?.toFixed(1) ?? '0.0'} L` : '0.0 L'}
                  </Text>
                  <View style={{ flex: 1.5, alignItems: 'center' }}>
                    <View style={[styles.statusPill, { backgroundColor: isReviewed ? '#DCFCE7' : isReturned ? '#FEE2E2' : '#FEF3C7' }]}>
                      <Text style={[styles.statusText, { color: isReviewed ? '#15803D' : isReturned ? '#991B1B' : '#B45309' }]}>
                        {isReviewed ? 'APPROVED' : isReturned ? 'RETURNED' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <View style={[styles.rowActionBtn, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                      <Text style={[styles.rowActionText, { color: colors.primary }]}>Inspect</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

      </View>

      {/* =========================================================================
          "PAGE-ABOVE-PAGE" DETAIL MODAL WITH SHORT CANCEL "✕" ON TOP
         ========================================================================= */}
      {detailReceipt && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setDetailReceipt(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setDetailReceipt(null)}>
            <View style={[styles.pageAbovePageSheet, { backgroundColor: colors.card, borderColor: colors.border }]} onStartShouldSetResponder={() => true}>
              
              {/* Modal Top Header with ✕ */}
              <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border }]}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.modalMainTitle, { color: colors.text }]}>
                      Receipt Audit #{detailReceipt.id}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: detailReceipt.status === 'reviewed_by_union' ? '#DCFCE7' : '#FEF3C7' }]}>
                      <Text style={[styles.statusText, { color: detailReceipt.status === 'reviewed_by_union' ? '#15803D' : '#B45309' }]}>
                        {detailReceipt.status?.toUpperCase().replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.modalSubTitle, { color: colors.textSecondary }]}>
                    BMC Center: {detailReceipt.bmcName} • Collection Date: {detailReceipt.collectionDate}
                  </Text>
                </View>

                {/* Short cancel ✕ on top */}
                <Pressable
                  style={[styles.closeIconBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                  onPress={() => setDetailReceipt(null)}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
                {/* 3 Metrics Row */}
                <View style={styles.modalMetricsGrid}>
                  <View style={[styles.modalMetricBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.modalMetricLabel, { color: colors.textSecondary }]}>Declared Volume</Text>
                    <Text style={[styles.modalMetricVal, { color: colors.text }]}>{detailReceipt.totalDeclaredQuantity?.toFixed(1) ?? '0.0'} L</Text>
                  </View>
                  <View style={[styles.modalMetricBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.modalMetricLabel, { color: colors.primary }]}>Received at BMC</Text>
                    <Text style={[styles.modalMetricVal, { color: colors.primary }]}>{detailReceipt.totalReceivedQuantity?.toFixed(1) ?? '0.0'} L</Text>
                  </View>
                  <View style={[styles.modalMetricBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.modalMetricLabel, { color: (detailReceipt.netDifference || 0) > 0 ? '#DC2626' : '#16A34A' }]}>Net Variance</Text>
                    <Text style={[styles.modalMetricVal, { color: (detailReceipt.netDifference || 0) > 0 ? '#DC2626' : '#16A34A' }]}>
                      {(detailReceipt.netDifference || 0) > 0 ? `-${detailReceipt.netDifference?.toFixed(1) ?? '0.0'} L` : '0.0 L'}
                    </Text>
                  </View>
                </View>

                {/* Consolidated Societies Breakdown */}
                {detailReceipt.societySummaries && detailReceipt.societySummaries.length > 0 && (
                  <View style={[styles.detailSectionCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.sectionHeading, { color: colors.text }]}>
                      Consolidated Primary Societies ({detailReceipt.societySummaries.length})
                    </Text>
                    {detailReceipt.societySummaries.map(s => (
                      <View key={s.societyId} style={[styles.societyDetailRow, { borderBottomColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.socName, { color: colors.text }]}>• {s.societyName}</Text>
                          <Text style={[styles.socSub, { color: colors.textSecondary }]}>
                            Declared: {s.declaredLitres}L | Received: {s.receivedLitres}L | Revenue: ₹{s.recordedIncome.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <Text style={[styles.socDiff, { color: s.varianceLitres > 0 ? '#DC2626' : '#16A34A' }]}>
                          {s.varianceLitres > 0 ? `-${s.varianceLitres}L` : 'Balanced'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Supervisor Remarks */}
                {detailReceipt.supervisorNotes && (
                  <View style={[styles.notesCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>BMC Supervisor Remarks:</Text>
                    <Text style={[styles.notesText, { color: colors.text }]}>"{detailReceipt.supervisorNotes}"</Text>
                  </View>
                )}

                {/* Directives Input */}
                <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 14 }]}>
                  Executive Directives & Decision Notes *
                </Text>
                <TextInput
                  placeholder="Enter concrete audit order or instructions for the BMC manager..."
                  placeholderTextColor={colors.textMuted}
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  multiline
                  numberOfLines={3}
                  style={[styles.modalTextInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
                />
              </ScrollView>

              {/* Modal Actions Footer */}
              <View style={[styles.modalFooterActions, { borderTopColor: colors.border }]}>
                <Pressable
                  style={[styles.actionBtnOutline, { borderColor: '#EF4444' }]}
                  onPress={() => {
                    setActionType('returned_for_correction');
                    handleSaveReview();
                  }}
                >
                  <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                  <Text style={[styles.actionBtnOutlineText, { color: '#DC2626' }]}>Return for Correction</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionBtnPrimary, { backgroundColor: '#16A34A' }]}
                  onPress={() => {
                    setActionType('reviewed_by_union');
                    handleSaveReview();
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.actionBtnPrimaryText}>Approve & Reconcile Ledger</Text>
                </Pressable>
              </View>

            </View>
          </Pressable>
        </Modal>
      )}

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
    maxWidth: 1040,
    gap: 14,
  },

  /* Header */
  headerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  breadcrumbRoot: {
    fontSize: 12,
    fontWeight: '600',
  },
  breadcrumbActive: {
    fontSize: 12,
    fontWeight: '700',
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
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewModeToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    cursor: 'pointer' as any,
  },
  toggleText: {
    fontSize: 12,
  },

  /* Filter Strip */
  filterStripContainer: {
    paddingVertical: 2,
  },
  filterScrollContent: {
    flexDirection: 'row',
    gap: 8,
  },
  bmcFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Grid View */
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  verticalReportCard: {
    width: 295,
    minHeight: 295,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'space-between',
    cursor: 'pointer' as any,
  },
  cardHovered: {
    transform: [{ translateY: -3 }],
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)' as any,
  },
  vCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0072BC15',
  },
  vTitleBlock: {
    marginBottom: 8,
  },
  vReportIdText: {
    fontSize: 14.5,
    fontWeight: '900',
  },
  vReportDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  vFacilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  vBmcNameText: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  vMetricsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginBottom: 10,
  },
  vMetricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  vMetricValue: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  vMetricDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  vCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  vIncomeLabel: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  vIncomeNum: {
    fontSize: 13,
    fontWeight: '800',
  },
  vInspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  vInspectBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  /* Strict List View */
  strictTableCard: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  thCell: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    cursor: 'pointer' as any,
  },
  tdCell: {
    fontSize: 12.5,
  },
  rowActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rowActionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Page-Above-Page Detail Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pageAbovePageSheet: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '90%',
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalMainTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalSubTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  modalBodyScroll: {
    marginVertical: 14,
  },
  modalMetricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  modalMetricBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  modalMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalMetricVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  detailSectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 8,
  },
  societyDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  socName: {
    fontSize: 12,
    fontWeight: '700',
  },
  socSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  socDiff: {
    fontSize: 12,
    fontWeight: '800',
  },
  notesCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  notesLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  modalFooterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    cursor: 'pointer' as any,
  },
  actionBtnOutlineText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
    cursor: 'pointer' as any,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
