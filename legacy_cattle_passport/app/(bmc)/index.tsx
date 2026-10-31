import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  RefreshControl, 
  TextInput,
  useWindowDimensions,
  Platform,
  ImageBackground,
  DimensionValue
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function BMCDashboard() {
  const { user } = useAuth();
  const { 
    bmcs, 
    booths, 
    bmcDeliveries, 
    milkRecords,
    discrepancyCases 
  } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === 'web';
  const isDesktop = width >= 1100;
  const isTablet = width >= 720 && width < 1100;

  // Responsive widths
  const societyCardWidth: DimensionValue = isWeb
    ? (isDesktop ? '48.5%' : '100%')
    : (isTablet ? Math.floor((width - 32 - 10) / 2) : '100%');

  const summaryCardWidth: DimensionValue = isWeb
    ? (width >= 990 ? '19%' : (width >= 600 ? '31.5%' : '48.5%'))
    : (width >= 600 ? Math.floor((width - 32 - 16) / 3) : Math.floor((width - 32 - 10) / 2));

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fixed reporting date for local BMC operations
  const todayStr = '2026-10-12';

  const bmcId = user?.associatedId || 'BMC001';
  const bmc = bmcs.find(b => b.id === bmcId) || bmcs[0];
  const assignedBooths = useMemo(() => {
    return booths.filter(b => b.assignedBmcId === bmc.id);
  }, [booths, bmc.id]);

  const deliveries = useMemo(() => {
    return bmcDeliveries.filter(d => d.bmcId === bmc.id);
  }, [bmcDeliveries, bmc.id]);

  const pendingArrivals = useMemo(() => {
    return deliveries.filter(d => d.status === 'pending_arrival');
  }, [deliveries]);

  const openDiscrepancies = useMemo(() => {
    return discrepancyCases.filter(
      c => c.bmcId === bmc.id && (c.status === 'open' || c.status === 'under_investigation' || c.status === 'escalated_to_union')
    );
  }, [discrepancyCases, bmc.id]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 300);
  };

  // Build today's society supply models using actual recorded data
  const societySupplyData = useMemo(() => {
    return assignedBooths.map(society => {
      // Find today's delivery for this society
      const todayDelivery = deliveries.find(
        d => d.boothId === society.id && d.collectionDate === todayStr
      );

      // Find any individual milk records recorded today for this society
      const todayRecords = milkRecords.filter(
        r => r.boothId === society.id && r.collectionDate === todayStr
      );

      // Determine Reported Quantity (from delivery declared qty, or aggregated milk records)
      let reportedLitres: number | undefined = undefined;
      let hasExplicitZeroReported = false;

      if (todayDelivery?.declaredDispatchQuantity !== undefined) {
        reportedLitres = todayDelivery.declaredDispatchQuantity;
        if (reportedLitres === 0) hasExplicitZeroReported = true;
      } else if (todayRecords.length > 0) {
        const sum = todayRecords.reduce((acc, r) => acc + (r.quantityLitres || 0), 0);
        reportedLitres = Number(sum.toFixed(1));
        if (reportedLitres === 0) hasExplicitZeroReported = true;
      }

      // Determine BMC-Measured Received Quantity (from delivery verification)
      let receivedLitres: number | undefined = undefined;
      let hasExplicitZeroReceived = false;

      if (todayDelivery?.measuredReceivedQuantity !== undefined) {
        receivedLitres = todayDelivery.measuredReceivedQuantity;
        if (receivedLitres === 0) hasExplicitZeroReceived = true;
      }

      // Determine difference only when BOTH quantities exist
      let differenceLitres: number | undefined = undefined;
      if (reportedLitres !== undefined && receivedLitres !== undefined) {
        // Difference convention: reported minus received
        differenceLitres = Number((reportedLitres - receivedLitres).toFixed(1));
      }

      // Supply timestamp
      const recordTime = todayDelivery?.dispatchTime || todayDelivery?.receivedAt || (todayRecords.length > 0 ? `${todayStr} 07:30 AM` : undefined);

      // Determine verification & reconciliation status
      type StatusType = 'verified' | 'reconciliation_required' | 'pending_intake' | 'no_record';
      let status: StatusType = 'no_record';
      let statusLabel = 'No Supply Record';
      let statusBadgeBg = '#F1F5F9';
      let statusBadgeText = '#64748B';
      let statusIcon: React.ComponentProps<typeof Ionicons>['name'] = 'remove-circle-outline';

      if (reportedLitres !== undefined) {
        if (receivedLitres !== undefined) {
          if (differenceLitres !== undefined && Math.abs(differenceLitres) > 0) {
            status = 'reconciliation_required';
            statusLabel = 'Reconciliation Required';
            statusBadgeBg = '#FEE2E2';
            statusBadgeText = '#991B1B';
            statusIcon = 'warning-outline';
          } else {
            status = 'verified';
            statusLabel = 'Verified & Reconciled';
            statusBadgeBg = '#DCFCE7';
            statusBadgeText = '#166534';
            statusIcon = 'checkmark-circle-outline';
          }
        } else {
          status = 'pending_intake';
          statusLabel = 'Pending BMC Intake Entry';
          statusBadgeBg = '#FEF3C7';
          statusBadgeText = '#B45309';
          statusIcon = 'time-outline';
        }
      }

      return {
        society,
        reportedLitres,
        hasExplicitZeroReported,
        receivedLitres,
        hasExplicitZeroReceived,
        differenceLitres,
        recordTime,
        status,
        statusLabel,
        statusBadgeBg,
        statusBadgeText,
        statusIcon,
        hasDelivery: !!todayDelivery,
        hasRecords: todayRecords.length > 0,
      };
    });
  }, [assignedBooths, deliveries, milkRecords]);

  // Section 5: Compact Summary calculated from actual records
  const summaryMetrics = useMemo(() => {
    let recordedSupplyCount = 0;
    let noSupplyRecordCount = 0;
    let totalReportedLitres = 0;
    let totalReceivedLitres = 0;
    let reconciliationRequiredCount = 0;

    societySupplyData.forEach(item => {
      if (item.reportedLitres !== undefined) {
        recordedSupplyCount++;
        totalReportedLitres += item.reportedLitres;
      } else {
        noSupplyRecordCount++;
      }

      if (item.receivedLitres !== undefined) {
        totalReceivedLitres += item.receivedLitres;
      }

      if (item.status === 'reconciliation_required') {
        reconciliationRequiredCount++;
      }
    });

    return {
      recordedSupplyCount,
      noSupplyRecordCount,
      totalReportedLitres: Number(totalReportedLitres.toFixed(1)),
      totalReceivedLitres: Number(totalReceivedLitres.toFixed(1)),
      reconciliationRequiredCount,
    };
  }, [societySupplyData]);

  // Section 6 & Update BMC Home: Search Only (No location filter, no status filter, no sorting)
  const filteredSocieties = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return societySupplyData;

    return societySupplyData.filter(item => {
      const s = item.society;
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.village && s.village.toLowerCase().includes(q))
      );
    });
  }, [societySupplyData, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={bmc.name}
        subtitle={`${assignedBooths.length} Assigned Feeder Societies • Chilling Capacity: ${bmc.capacityLitres.toLocaleString()} L`}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Urgent Action Banners */}
        {pendingArrivals.length > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: '#E0F2FE', borderColor: '#38BDF8' }]}>
            <Ionicons name="time" size={24} color="#0284C7" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.headline, { color: '#0369A1', fontWeight: '800' }]}>
                {pendingArrivals.length} Society Delivery Awaiting Measurement
              </Text>
              <Text style={[Typography.caption1, { color: '#0284C7', marginTop: 2 }]}>
                {pendingArrivals[0].boothName} dispatched {pendingArrivals[0].declaredDispatchQuantity} L. Weigh-scale intake pending.
              </Text>
            </View>
            <Button
              title="Measure"
              size="sm"
              onPress={() => router.push('/(bmc)/receive-milk')}
            />
          </View>
        )}

        {openDiscrepancies.length > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={24} color="#DC2626" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.headline, { color: '#B91C1C', fontWeight: '800' }]}>
                ⚠️ {openDiscrepancies.length} Active Discrepancy Case(s)
              </Text>
              <Text style={[Typography.caption1, { color: '#991B1B', marginTop: 2 }]}>
                Variance detected between Society dispatch receipt and BMC flow meter.
              </Text>
            </View>
            <Button
              title="Audit"
              variant="destructive"
              size="sm"
              onPress={() => router.push('/(bmc)/investigations')}
            />
          </View>
        )}

        {/* Signature Plant Overview Card with Asset Background & Dark Overlay */}
        <ImageBackground
          source={require('../../assets/bmc.png')}
          style={styles.heroNavyCard}
          imageStyle={styles.heroBgImage}
          resizeMode="cover"
        >
          <View style={styles.darkOverlayLayer}>
            <View style={styles.heroCardHeaderRow}>
              <View style={styles.heroHeaderPill}>
                <Ionicons name="snow" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.heroHeaderPillText}>Bulk Milk Cooling Operations</Text>
              </View>
              <View style={[styles.heroStatusBadge, { backgroundColor: '#16A34A' }]}>
                <Text style={styles.heroStatusBadgeText}>● CHILLER ONLINE (3.8°C)</Text>
              </View>
            </View>

            <Text style={styles.heroPlantName}>{bmc.name}</Text>
            <Text style={styles.heroPlantMeta}>
              Station Code: {bmc.code || 'BMC-102'} • {bmc.location || 'Madurai East'}
            </Text>

            <View style={styles.heroSpecsStrip}>
              <View style={styles.heroSpecItem}>
                <Ionicons name="cube-outline" size={14} color="#93C5FD" />
                <Text style={styles.heroSpecText}>
                  Capacity: {bmc.capacityLitres.toLocaleString()} L
                </Text>
              </View>
              <View style={styles.heroSpecDivider} />
              <View style={styles.heroSpecItem}>
                <Ionicons name="speedometer-outline" size={14} color="#86EFAC" />
                <Text style={styles.heroSpecText}>
                  Flow-Meter: Automated #FM-902
                </Text>
              </View>
              <View style={styles.heroSpecDivider} />
              <View style={styles.heroSpecItem}>
                <Ionicons name="business-outline" size={14} color="#FDE047" />
                <Text style={styles.heroSpecText}>
                  {assignedBooths.length} Feeder Societies
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* ========================================================================= */}
        {/* NEW OPERATIONAL SECTION: "Society Milk Supply Today"                      */}
        {/* ========================================================================= */}
        <View style={styles.supplySectionContainer}>
          <View style={styles.supplySectionHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.supplyTitleRow}>
                <Ionicons name="water" size={22} color={colors.primary} />
                <Text style={[Typography.headline, { color: colors.text, fontWeight: '900', marginLeft: 8 }]}>
                  Society Milk Supply Today
                </Text>
              </View>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                View today's milk supply from each assigned feeder society.
              </Text>
            </View>

            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={13} color={colors.primary} />
              <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', marginLeft: 4 }]}>
                12 Oct 2026
              </Text>
            </View>
          </View>

          {/* Section 5: Society Milk Supply Summary (5 Useful Monitoring Cards) */}
          <View style={styles.summaryGrid}>
            {/* 1. Recorded Supply Today */}
            <View style={[styles.summaryCardWrapper, { width: summaryCardWidth }]}>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryCardTop}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                  <View style={[styles.summaryPill, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.summaryPillText, { color: '#166534' }]}>Recorded</Text>
                  </View>
                </View>
                <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
                  {summaryMetrics.recordedSupplyCount}
                </Text>
                <Text style={styles.summaryLabel}>Recorded Supply</Text>
                <Text style={styles.summarySub}>Societies with entries</Text>
              </Card>
            </View>

            {/* 2. No Supply Record Today */}
            <View style={[styles.summaryCardWrapper, { width: summaryCardWidth }]}>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryCardTop}>
                  <Ionicons name="remove-circle-outline" size={16} color="#64748B" />
                  <View style={[styles.summaryPill, { backgroundColor: '#F1F5F9' }]}>
                    <Text style={[styles.summaryPillText, { color: '#475569' }]}>No Record</Text>
                  </View>
                </View>
                <Text style={[styles.summaryValue, { color: '#475569' }]}>
                  {summaryMetrics.noSupplyRecordCount}
                </Text>
                <Text style={styles.summaryLabel}>No Supply Record</Text>
                <Text style={styles.summarySub}>Awaiting transmission</Text>
              </Card>
            </View>

            {/* 3. Total Reported Milk Quantity */}
            <View style={[styles.summaryCardWrapper, { width: summaryCardWidth }]}>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryCardTop}>
                  <Ionicons name="scale-outline" size={16} color={colors.primary} />
                  <View style={[styles.summaryPill, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.summaryPillText, { color: colors.primary }]}>Declared</Text>
                  </View>
                </View>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {summaryMetrics.totalReportedLitres > 0 ? `${summaryMetrics.totalReportedLitres.toLocaleString()} L` : '0.0 L'}
                </Text>
                <Text style={styles.summaryLabel}>Total Reported</Text>
                <Text style={styles.summarySub}>Society weigh-scale sum</Text>
              </Card>
            </View>

            {/* 4. Total BMC-Measured Received Quantity */}
            <View style={[styles.summaryCardWrapper, { width: summaryCardWidth }]}>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryCardTop}>
                  <Ionicons name="flask-outline" size={16} color="#0284C7" />
                  <View style={[styles.summaryPill, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={[styles.summaryPillText, { color: '#0369A1' }]}>Verified</Text>
                  </View>
                </View>
                <Text style={[styles.summaryValue, { color: '#0284C7' }]}>
                  {summaryMetrics.totalReceivedLitres > 0 ? `${summaryMetrics.totalReceivedLitres.toLocaleString()} L` : '0.0 L'}
                </Text>
                <Text style={styles.summaryLabel}>Total Received</Text>
                <Text style={styles.summarySub}>Flow-meter measured</Text>
              </Card>
            </View>

            {/* 5. Reconciliation Review Required */}
            <View style={[styles.summaryCardWrapper, { width: summaryCardWidth }]}>
              <Card style={[styles.summaryCard, summaryMetrics.reconciliationRequiredCount > 0 && { borderColor: '#FCA5A5' }]}>
                <View style={styles.summaryCardTop}>
                  <Ionicons 
                    name={summaryMetrics.reconciliationRequiredCount > 0 ? "warning-outline" : "shield-checkmark-outline"} 
                    size={16} 
                    color={summaryMetrics.reconciliationRequiredCount > 0 ? "#DC2626" : "#16A34A"} 
                  />
                  <View style={[styles.summaryPill, { backgroundColor: summaryMetrics.reconciliationRequiredCount > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                    <Text style={[styles.summaryPillText, { color: summaryMetrics.reconciliationRequiredCount > 0 ? '#991B1B' : '#166534' }]}>
                      {summaryMetrics.reconciliationRequiredCount > 0 ? 'Review' : 'Balanced'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.summaryValue, { color: summaryMetrics.reconciliationRequiredCount > 0 ? '#DC2626' : '#16A34A' }]}>
                  {summaryMetrics.reconciliationRequiredCount}
                </Text>
                <Text style={styles.summaryLabel}>Reconciliation Review</Text>
                <Text style={styles.summarySub}>Variances needing check</Text>
              </Card>
            </View>
          </View>

          {/* Section 6 & Update BMC Home: Single Search Box Only */}
          <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search societies by name or ID..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.trim().length > 0 && (
              <Pressable 
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear search text"
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Result Count Indicator */}
          <View style={styles.resultCountRow}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
              Showing {filteredSocieties.length} of {assignedBooths.length} assigned societies
              {searchQuery.trim().length > 0 ? ` for "${searchQuery.trim()}"` : ''}
            </Text>
            {searchQuery.trim().length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
                  Clear Search
                </Text>
              </Pressable>
            )}
          </View>

          {/* Society Supply Cards List */}
          {filteredSocieties.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="search-outline" size={44} color={colors.textMuted} />
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginTop: 10 }]}>
                No Societies Found
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, textAlign: 'center', marginTop: 4, maxWidth: 360 }]}>
                No assigned feeder societies match your search "{searchQuery.trim()}". Try searching with a different society name or unique ID.
              </Text>
              <Button
                title="Clear Search"
                size="sm"
                variant="outline"
                style={{ marginTop: 14 }}
                onPress={() => setSearchQuery('')}
              />
            </Card>
          ) : (
            <View style={styles.societyCardsGrid}>
              {filteredSocieties.map((item) => {
                const s = item.society;
                return (
                  <View key={s.id} style={[styles.societyCardWrapper, { width: societyCardWidth }]}>
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => router.push({ pathname: '/(bmc)/societies/[societyId]', params: { societyId: s.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={`View details for ${s.name}`}
                    >
                      <Card style={styles.supplyCard}>
                        {/* Header: Name, ID, Location, Status Badge */}
                        <View style={styles.cardHeaderRow}>
                          <View style={[styles.societyIconBadge, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="business" size={20} color={colors.primary} />
                          </View>

                          <View style={styles.cardHeaderInfo}>
                            <View style={styles.cardNameLine}>
                              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '900', flex: 1 }]} numberOfLines={1}>
                                {s.name}
                              </Text>
                              <View style={[styles.statusBadge, { backgroundColor: item.statusBadgeBg }]}>
                                <Ionicons name={item.statusIcon} size={11} color={item.statusBadgeText} style={{ marginRight: 3 }} />
                                <Text style={[styles.statusBadgeText, { color: item.statusBadgeText }]}>
                                  {item.statusLabel}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.metaRow}>
                              <View style={styles.idChip}>
                                <Text style={styles.idChipText}>ID: {s.id}</Text>
                              </View>
                              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                                Code: {s.code} • 📍 {s.village}, {s.taluk}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Separate Milk Quantities Panel (Reported vs Received vs Difference) */}
                        <View style={[styles.quantitiesPanel, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
                          {/* Column 1: Society Reported Quantity */}
                          <View style={styles.quantityCell}>
                            <Text style={styles.quantityLabel}>REPORTED TODAY</Text>
                            {item.reportedLitres !== undefined ? (
                              <Text style={[styles.quantityBigVal, { color: colors.text }]}>
                                {item.reportedLitres.toFixed(1)} <Text style={styles.quantityUnit}>L</Text>
                              </Text>
                            ) : (
                              <View style={styles.notRecordedBadge}>
                                <Text style={styles.notRecordedText}>Not recorded</Text>
                              </View>
                            )}
                            <Text style={styles.quantitySubLabel}>Society weigh-scale</Text>
                          </View>

                          <View style={styles.quantityDivider} />

                          {/* Column 2: BMC Measured Received Quantity */}
                          <View style={styles.quantityCell}>
                            <Text style={styles.quantityLabel}>RECEIVED AT BMC</Text>
                            {item.receivedLitres !== undefined ? (
                              <Text style={[styles.quantityBigVal, { color: colors.primary }]}>
                                {item.receivedLitres.toFixed(1)} <Text style={styles.quantityUnit}>L</Text>
                              </Text>
                            ) : (
                              <View style={styles.notRecordedBadge}>
                                <Text style={styles.notRecordedText}>
                                  {item.reportedLitres !== undefined ? 'Pending intake' : 'Not recorded'}
                                </Text>
                              </View>
                            )}
                            <Text style={styles.quantitySubLabel}>Chilling flow-meter</Text>
                          </View>

                          <View style={styles.quantityDivider} />

                          {/* Column 3: Quantity Difference (Calculated only when both exist) */}
                          <View style={styles.quantityCell}>
                            <Text style={styles.quantityLabel}>DIFFERENCE</Text>
                            {item.differenceLitres !== undefined ? (
                              <Text style={[
                                styles.quantityBigVal, 
                                { color: Math.abs(item.differenceLitres) > 0 ? '#DC2626' : '#16A34A' }
                              ]}>
                                {item.differenceLitres > 0 ? `-${item.differenceLitres.toFixed(1)}` : (item.differenceLitres < 0 ? `+${Math.abs(item.differenceLitres).toFixed(1)}` : '0.0')} <Text style={styles.quantityUnit}>L</Text>
                              </Text>
                            ) : (
                              <Text style={[styles.quantityBigVal, { color: colors.textMuted }]}>
                                —
                              </Text>
                            )}
                            <Text style={styles.quantitySubLabel}>
                              {item.differenceLitres !== undefined ? (Math.abs(item.differenceLitres) > 0 ? 'Variance detected' : 'Reconciled') : 'Awaiting data'}
                            </Text>
                          </View>
                        </View>

                        {/* Footer Strip: Supply Record Time & View Details Action */}
                        <View style={[styles.cardFooterStrip, { borderTopColor: colors.border }]}>
                          <View style={styles.footerTimeCol}>
                            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                            <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 4 }]}>
                              {item.recordTime ? `Recorded: ${item.recordTime}` : 'No supply timestamp recorded for today'}
                            </Text>
                          </View>

                          <View style={styles.viewDetailsRow}>
                            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', marginRight: 2 }]}>
                              View Details
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Existing BMC Operations & Reporting Navigation Buttons */}
        <View style={styles.actionGrid}>
          <Button
            title="📥 Confirm Milk Received (Intake)"
            size="lg"
            onPress={() => router.push('/(bmc)/receive-milk')}
          />
          <Button
            title="📑 Daily Summary & Operational Closure"
            variant="secondary"
            onPress={() => router.push('/(bmc)/daily-summary')}
          />
          <Button
            title="📊 Multi-Society Comparison & Analytics"
            variant="secondary"
            onPress={() => router.push('/(bmc)/society-comparison')}
          />
          <Button
            title="📋 Close Consolidated Report for Union"
            variant="outline"
            onPress={() => router.push('/(bmc)/submit-union-report')}
          />
          <Button
            title="💰 Society Income & Procurement Settlements"
            variant="ghost"
            onPress={() => router.push('/(bmc)/society-income')}
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
    gap: 14,
    paddingBottom: 40,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },

  // Hero Card
  heroNavyCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#071325',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  heroBgImage: {
    borderRadius: 20,
  },
  darkOverlayLayer: {
    padding: 18,
    backgroundColor: 'rgba(7, 19, 37, 0.82)',
  },
  heroCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroHeaderPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  heroStatusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroPlantName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  heroPlantMeta: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    marginTop: 2,
  },
  heroSpecsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroSpecItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroSpecText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  heroSpecDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },

  // Society Milk Supply Section
  supplySectionContainer: {
    gap: 12,
    marginTop: 4,
  },
  supplySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  supplyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 82, 155, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },

  // Summary Metrics Grid (5 Cards)
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  summaryCardWrapper: {
    flexGrow: 0,
    flexShrink: 0,
  },
  summaryCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 100,
    justifyContent: 'space-between',
  },
  summaryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  summaryPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },
  summarySub: {
    fontSize: 10,
    color: '#64748B',
  },

  // Single Search Box
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  resultCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: -4,
  },

  // Society Cards Grid
  societyCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  societyCardWrapper: {
    flexGrow: 0,
    flexShrink: 0,
  },
  supplyCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  societyIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  cardNameLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  idChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  idChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Quantities Panel
  quantitiesPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginTop: 12,
  },
  quantityCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: '#CBD5E1',
  },
  quantityLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 2,
    textAlign: 'center',
  },
  quantityBigVal: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  quantityUnit: {
    fontSize: 11,
    fontWeight: '700',
  },
  quantitySubLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },
  notRecordedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginVertical: 2,
  },
  notRecordedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },

  // Footer Strip
  cardFooterStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerTimeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Empty state
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },

  // Quick Action Buttons Grid
  actionGrid: {
    gap: 8,
    marginTop: 6,
  },
});
