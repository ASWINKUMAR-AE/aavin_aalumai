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
import { DiscrepancyCase } from '../../../types/aavin';

export const UnionDesktopAlerts: React.FC = () => {
  const { user } = useAuth();
  const { discrepancyCases, resolveDiscrepancyCase, addInvestigationNote } = useAavinStore();
  const { colors, isDark } = useTheme();

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'escalated_to_union' | 'resolved'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'strict'>('grid');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // "Page-Above-Page" Detail Modal State
  const [detailCase, setDetailCase] = useState<DiscrepancyCase | null>(null);
  const [actionTab, setActionTab] = useState<'directive' | 'resolve'>('directive');
  const [directiveText, setDirectiveText] = useState('');
  const [resolutionText, setResolutionText] = useState('');

  const filteredCases = discrepancyCases.filter(c => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return c.status === 'open' || c.status === 'under_investigation';
    return c.status === statusFilter;
  });

  const handleAddDirective = () => {
    if (!detailCase || !directiveText.trim()) return;
    addInvestigationNote(
      detailCase.id,
      `[UNION EXECUTIVE DIRECTIVE]: ${directiveText.trim()}`,
      user?.fullName || 'Dr. S. Sundaram (General Manager)',
      'Union Audit Order'
    );
    setDirectiveText('');
    setDetailCase(null);
    Alert.alert('Directive Dispatched', `Union directive logged to case #${detailCase.id}.`);
  };

  const handleResolveCase = () => {
    if (!detailCase || !resolutionText.trim()) return;
    resolveDiscrepancyCase(
      detailCase.id,
      `[UNION RESOLUTION]: ${resolutionText.trim()}`,
      user?.fullName || 'Dr. S. Sundaram (General Manager)'
    );
    setResolutionText('');
    setDetailCase(null);
    Alert.alert('Case Resolved', `Discrepancy case #${detailCase.id} closed by Union GM Order.`);
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
              <Text style={[styles.breadcrumbActive, { color: '#DC2626' }]}>Discrepancy & Shrinkage Alerts</Text>
            </View>
            <Text style={[styles.mainTitle, { color: colors.text }]}>
              District Milk Discrepancy & Integrity Ledger
            </Text>
            <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
              Cross-facility transit variance, chilling shrinkage audits • Showing {filteredCases.length} cases
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
            STATUS FILTER PILLS STRIP
           ========================================================================= */}
        <View style={styles.filterStripContainer}>
          <View style={styles.filterScrollContent}>
            {[
              { id: 'all' as const, label: `All Alerts (${discrepancyCases.length})`, icon: 'shield-outline' },
              { id: 'open' as const, label: 'Open Investigations', icon: 'alert-circle-outline' },
              { id: 'escalated_to_union' as const, label: 'Escalated to GM', icon: 'flash-outline' },
              { id: 'resolved' as const, label: 'Resolved Cases', icon: 'checkmark-done-outline' },
            ].map(tab => (
              <Pressable
                key={tab.id}
                style={[
                  styles.filterChip,
                  { backgroundColor: statusFilter === tab.id ? (tab.id === 'escalated_to_union' ? '#7C3AED' : tab.id === 'open' ? '#DC2626' : colors.primary) : isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }
                ]}
                onPress={() => setStatusFilter(tab.id)}
              >
                <Ionicons name={tab.icon as any} size={13} color={statusFilter === tab.id ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.chipText, { color: statusFilter === tab.id ? '#FFFFFF' : colors.textSecondary }, statusFilter === tab.id && { fontWeight: '800' }]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* =========================================================================
            ALERT ITEMS DISPLAY: GRID VIEW vs STRICT LIST VIEW
           ========================================================================= */}
        {viewMode === 'grid' ? (
          /* GRID VIEW: 3 Compact Cards per row */
          <View style={styles.cardsGrid}>
            {filteredCases.map(item => {
              const isOpen = item.status === 'open' || item.status === 'under_investigation';
              const isEscalated = item.status === 'escalated_to_union';
              const isHovered = hoveredId === item.id;

              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.verticalAlertCard,
                    { backgroundColor: colors.card, borderColor: isEscalated ? '#9333EA' : isOpen ? '#DC2626' : colors.border },
                    isHovered && styles.cardHovered,
                  ]}
                  onHoverIn={() => setHoveredId(item.id)}
                  onHoverOut={() => setHoveredId(null)}
                  onPress={() => setDetailCase(item)}
                >
                  {/* Top: Icon + Status Pill */}
                  <View style={styles.vCardHeaderRow}>
                    <View style={[styles.vAlertIconCircle, { backgroundColor: isEscalated ? '#FAF5FF' : isOpen ? '#FEF2F2' : '#DCFCE7' }]}>
                      <Ionicons
                        name={isEscalated ? 'flash' : isOpen ? 'warning' : 'checkmark-circle'}
                        size={16}
                        color={isEscalated ? '#9333EA' : isOpen ? '#DC2626' : '#16A34A'}
                      />
                    </View>
                    <View style={[
                      styles.statusPill,
                      { backgroundColor: isEscalated ? '#FAF5FF' : isOpen ? '#FEF2F2' : '#DCFCE7' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: isEscalated ? '#9333EA' : isOpen ? '#DC2626' : '#15803D' }
                      ]}>
                        {isEscalated ? 'ESCALATED' : isOpen ? 'OPEN ALERT' : 'RESOLVED'}
                      </Text>
                    </View>
                  </View>

                  {/* ID & Date */}
                  <View style={styles.vTitleBlock}>
                    <Text style={[styles.vCaseIdText, { color: colors.text }]}>{item.id}</Text>
                    <Text style={[styles.vCaseDateText, { color: colors.textSecondary }]}>{item.collectionDate || item.createdAt}</Text>
                  </View>

                  {/* Route Box (Vertical Flow) */}
                  <View style={[styles.vRouteBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="business" size={11} color={colors.primary} />
                      <Text style={[styles.vRouteText, { color: colors.text }]} numberOfLines={1}>
                        {item.bmcName}
                      </Text>
                    </View>
                    <Ionicons name="arrow-down" size={11} color={colors.textSecondary} style={{ marginVertical: 1, alignSelf: 'center' }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="storefront" size={11} color="#059669" />
                      <Text style={[styles.vRouteText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.boothName}
                      </Text>
                    </View>
                  </View>

                  {/* Vertical Stack of Metrics */}
                  <View style={[styles.vMetricsCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <View style={styles.vMetricItem}>
                      <Text style={[styles.vMetricLabel, { color: colors.textSecondary }]}>Dispatched</Text>
                      <Text style={[styles.vMetricValue, { color: colors.text }]}>{item.declaredQuantity} L</Text>
                    </View>
                    <View style={styles.vMetricDivider} />
                    <View style={styles.vMetricItem}>
                      <Text style={[styles.vMetricLabel, { color: colors.primary }]}>Received</Text>
                      <Text style={[styles.vMetricValue, { color: colors.primary }]}>{item.measuredQuantity} L</Text>
                    </View>
                    <View style={styles.vMetricDivider} />
                    <View style={styles.vMetricItem}>
                      <Text style={[styles.vMetricLabel, { color: '#DC2626' }]}>Variance Loss</Text>
                      <Text style={[styles.vMetricValue, { color: '#DC2626', fontWeight: '800' }]}>-{item.differenceLitres} L</Text>
                    </View>
                  </View>

                  {/* Card Bottom: Audit Notes & Action */}
                  <View style={[styles.vCardFooter, { borderTopColor: colors.border }]}>
                    <Text style={[styles.vNotesCountText, { color: colors.textSecondary }]}>
                      {item.investigationNotes?.length || 0} Audit Notes
                    </Text>
                    <View style={[styles.vInspectBtn, { backgroundColor: isEscalated ? '#9333EA' : colors.primary }]}>
                      <Text style={styles.vInspectBtnText}>Audit</Text>
                      <Ionicons name="arrow-forward" size={11} color="#FFFFFF" />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          /* STRICT LIST VIEW: Dense Tabular Rows */
          <View style={[styles.strictTableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Table Header */}
            <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[styles.thCell, { flex: 1.2, color: colors.textSecondary }]}>CASE ID</Text>
              <Text style={[styles.thCell, { flex: 1.8, color: colors.textSecondary }]}>CHILLING CENTER</Text>
              <Text style={[styles.thCell, { flex: 1.8, color: colors.textSecondary }]}>PRIMARY SOCIETY</Text>
              <Text style={[styles.thCell, { flex: 1.1, textAlign: 'right', color: colors.textSecondary }]}>DISPATCHED</Text>
              <Text style={[styles.thCell, { flex: 1.1, textAlign: 'right', color: colors.textSecondary }]}>RECEIVED</Text>
              <Text style={[styles.thCell, { flex: 1.1, textAlign: 'right', color: colors.textSecondary }]}>VARIANCE</Text>
              <Text style={[styles.thCell, { flex: 1.6, textAlign: 'center', color: colors.textSecondary }]}>STATUS</Text>
              <Text style={[styles.thCell, { flex: 1, textAlign: 'right', color: colors.textSecondary }]}>ACTION</Text>
            </View>

            {/* Table Body */}
            {filteredCases.map(item => {
              const isOpen = item.status === 'open' || item.status === 'under_investigation';
              const isEscalated = item.status === 'escalated_to_union';
              const isHovered = hoveredId === item.id;

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
                  onPress={() => setDetailCase(item)}
                >
                  <Text style={[styles.tdCell, { flex: 1.2, fontWeight: '800', color: colors.text }]}>{item.id}</Text>
                  <Text style={[styles.tdCell, { flex: 1.8, color: colors.text }]} numberOfLines={1}>{item.bmcName}</Text>
                  <Text style={[styles.tdCell, { flex: 1.8, color: colors.textSecondary }]} numberOfLines={1}>{item.boothName}</Text>
                  <Text style={[styles.tdCell, { flex: 1.1, textAlign: 'right', color: colors.text }]}>{item.declaredQuantity} L</Text>
                  <Text style={[styles.tdCell, { flex: 1.1, textAlign: 'right', color: colors.primary }]}>{item.measuredQuantity} L</Text>
                  <Text style={[styles.tdCell, { flex: 1.1, textAlign: 'right', fontWeight: '800', color: '#DC2626' }]}>
                    -{item.differenceLitres} L
                  </Text>
                  <View style={{ flex: 1.6, alignItems: 'center' }}>
                    <View style={[styles.statusPill, { backgroundColor: isEscalated ? '#FAF5FF' : isOpen ? '#FEF2F2' : '#DCFCE7' }]}>
                      <Text style={[styles.statusText, { color: isEscalated ? '#9333EA' : isOpen ? '#DC2626' : '#15803D' }]}>
                        {isEscalated ? 'ESCALATED' : isOpen ? 'INVESTIGATING' : 'RESOLVED'}
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
      {detailCase && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setDetailCase(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setDetailCase(null)}>
            <View style={[styles.pageAbovePageSheet, { backgroundColor: colors.card, borderColor: colors.border }]} onStartShouldSetResponder={() => true}>
              
              {/* Modal Top Header with ✕ */}
              <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border }]}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.modalMainTitle, { color: colors.text }]}>
                      Discrepancy Case #{detailCase.id}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: detailCase.status === 'escalated_to_union' ? '#FAF5FF' : detailCase.status === 'resolved' ? '#DCFCE7' : '#FEF2F2' }]}>
                      <Text style={[styles.statusText, { color: detailCase.status === 'escalated_to_union' ? '#9333EA' : detailCase.status === 'resolved' ? '#15803D' : '#DC2626' }]}>
                        {detailCase.status?.toUpperCase().replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.modalSubTitle, { color: colors.textSecondary }]}>
                    Reported on {detailCase.collectionDate || detailCase.createdAt} • {detailCase.bmcName} ➔ {detailCase.boothName}
                  </Text>
                </View>

                {/* Short cancel ✕ on top */}
                <Pressable
                  style={[styles.closeIconBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                  onPress={() => setDetailCase(null)}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
                {/* 3 Metrics Row */}
                <View style={styles.modalMetricsGrid}>
                  <View style={[styles.modalMetricBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.modalMetricLabel, { color: colors.textSecondary }]}>Society Dispatched</Text>
                    <Text style={[styles.modalMetricVal, { color: colors.text }]}>{detailCase.declaredQuantity} L</Text>
                  </View>
                  <View style={[styles.modalMetricBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.modalMetricLabel, { color: colors.primary }]}>BMC Received</Text>
                    <Text style={[styles.modalMetricVal, { color: colors.primary }]}>{detailCase.measuredQuantity} L</Text>
                  </View>
                  <View style={[styles.modalMetricBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.modalMetricLabel, { color: '#DC2626' }]}>Variance Deficit</Text>
                    <Text style={[styles.modalMetricVal, { color: '#DC2626' }]}>-{detailCase.differenceLitres} L</Text>
                  </View>
                </View>

                {/* Audit Trail & Investigation Log */}
                <View style={[styles.detailSectionCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>Investigation & Audit Timeline</Text>
                  {(detailCase.investigationNotes && detailCase.investigationNotes.length > 0) ? (
                    detailCase.investigationNotes.map((note, idx) => (
                      <View key={idx} style={[styles.timelineItem, { borderBottomColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={[styles.noteAuthor, { color: colors.primary }]}>{note.author || 'Inspector'}</Text>
                          <Text style={[styles.noteTime, { color: colors.textMuted }]}>{note.timestamp?.split('T')[0] || 'Today'}</Text>
                        </View>
                        <Text style={[styles.noteContent, { color: colors.text }]}>{note.note}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyNoteText, { color: colors.textSecondary }]}>
                      Initial variance logged. Waiting for Union GM inquiry or audit resolution.
                    </Text>
                  )}
                </View>

                {/* Directive / Resolution Tab Switcher */}
                <View style={[styles.actionTabsRow, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Pressable
                    style={[styles.actionTab, actionTab === 'directive' && { backgroundColor: colors.card }]}
                    onPress={() => setActionTab('directive')}
                  >
                    <Text style={[styles.actionTabText, { color: actionTab === 'directive' ? colors.text : colors.textSecondary }, actionTab === 'directive' && { fontWeight: '800' }]}>
                      Log GM Directive Order
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionTab, actionTab === 'resolve' && { backgroundColor: colors.card }]}
                    onPress={() => setActionTab('resolve')}
                  >
                    <Text style={[styles.actionTabText, { color: actionTab === 'resolve' ? colors.text : colors.textSecondary }, actionTab === 'resolve' && { fontWeight: '800' }]}>
                      Close & Resolve Case
                    </Text>
                  </Pressable>
                </View>

                {actionTab === 'directive' ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Union Audit Directive Notes</Text>
                    <TextInput
                      placeholder="e.g. Tanker calibration check ordered. Re-weigh vat batch before signoff..."
                      placeholderTextColor={colors.textMuted}
                      value={directiveText}
                      onChangeText={setDirectiveText}
                      multiline
                      numberOfLines={3}
                      style={[styles.modalTextInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
                    />
                  </View>
                ) : (
                  <View style={{ marginTop: 10 }}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Official Case Resolution Summary</Text>
                    <TextInput
                      placeholder="e.g. Variance explained by line drain residual calibration. Reconciled by GM."
                      placeholderTextColor={colors.textMuted}
                      value={resolutionText}
                      onChangeText={setResolutionText}
                      multiline
                      numberOfLines={3}
                      style={[styles.modalTextInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
                    />
                  </View>
                )}
              </ScrollView>

              {/* Modal Actions Footer */}
              <View style={[styles.modalFooterActions, { borderTopColor: colors.border }]}>
                <Pressable
                  style={[styles.actionBtnOutline, { borderColor: colors.border }]}
                  onPress={() => setDetailCase(null)}
                >
                  <Text style={[styles.actionBtnOutlineText, { color: colors.textSecondary }]}>Close Sheet</Text>
                </Pressable>

                {actionTab === 'directive' ? (
                  <Pressable
                    style={[styles.actionBtnPrimary, { backgroundColor: '#7C3AED' }]}
                    onPress={handleAddDirective}
                  >
                    <Ionicons name="flash-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.actionBtnPrimaryText}>Log GM Directive</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.actionBtnPrimary, { backgroundColor: '#16A34A' }]}
                    onPress={handleResolveCase}
                  >
                    <Ionicons name="checkmark-done" size={15} color="#FFFFFF" />
                    <Text style={styles.actionBtnPrimaryText}>Confirm Case Resolution</Text>
                  </Pressable>
                )}
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
  filterChip: {
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
  verticalAlertCard: {
    width: 295,
    minHeight: 310,
    borderWidth: 1.5,
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
  vAlertIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vTitleBlock: {
    marginBottom: 8,
  },
  vCaseIdText: {
    fontSize: 14.5,
    fontWeight: '900',
  },
  vCaseDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  vRouteBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  vRouteText: {
    fontSize: 11,
    fontWeight: '700',
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
  vNotesCountText: {
    fontSize: 10.5,
    fontWeight: '600',
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

  /* Strict Table View */
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

  /* Page-Above-Page Modal */
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
  timelineItem: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noteAuthor: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  noteTime: {
    fontSize: 10.5,
  },
  noteContent: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyNoteText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionTabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginTop: 10,
  },
  actionTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    cursor: 'pointer' as any,
  },
  actionTabText: {
    fontSize: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  actionBtnOutlineText: {
    fontSize: 12.5,
    fontWeight: '700',
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
