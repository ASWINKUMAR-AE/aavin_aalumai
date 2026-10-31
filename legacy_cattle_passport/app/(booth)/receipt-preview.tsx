import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Pressable, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function ReceiptPreviewScreen() {
  const params = useLocalSearchParams();
  const receiptId = params.receiptId as string;
  const { boothReceipts, sendBoothReceiptToBmc, milkRecords, bmcDeliveries, bmcs } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  // Find target receipt or fallback to first
  const receipt = boothReceipts.find(r => r.id === receiptId) || boothReceipts[0];
  const [sending, setSending] = useState(false);
  const [showBatchList, setShowBatchList] = useState(false);
  const [sealChecklist, setSealChecklist] = useState({
    valveSealed: true,
    sampleStored: true,
    tempLogged: true,
  });

  if (!receipt) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <DemoHeader title="Dispatch Receipt" subtitle="Receipt Not Found" showBack />
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
          <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 12 }]}>
            No dispatch receipt found matching the requested ID.
          </Text>
          <Button
            title="Go to Sent Receipts"
            onPress={() => router.replace('/(booth)/sent-receipts')}
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
    );
  }

  // Cross-reference records included in this receipt
  const includedRecords = milkRecords.filter(r => receipt.includedRecordIds?.includes(r.id));
  const farmerWiseRecords = includedRecords.filter(r => r.measurementMethod === 'farmer_wise');
  const vendorRecords = includedRecords.filter(r => r.measurementMethod === 'combined');

  const farmerWiseLitres = farmerWiseRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
  const vendorLitres = vendorRecords.reduce((sum, r) => sum + r.quantityLitres, 0);

  // Delivery status at BMC
  const delivery = bmcDeliveries.find(d => d.boothReceiptId === receipt.id);
  const isAlreadySent = receipt.status === 'sent_to_bmc' || !!delivery;

  const handleSendToBmc = () => {
    if (!sealChecklist.valveSealed || !sealChecklist.sampleStored || !sealChecklist.tempLogged) {
      Alert.alert('Pre-Dispatch Verification', 'Please complete all tanker sealing safety checks before transmitting the waybill.');
      return;
    }

    setSending(true);
    try {
      sendBoothReceiptToBmc(receipt.id);
      Alert.alert(
        'Receipt Transmitted to BMC!',
        `Digital Dispatch Receipt #${receipt.id} (${receipt.dispatchQuantity.toFixed(2)} L) is now LIVE in ${receipt.bmcName}'s intake dashboard.\n\nStatus updated to IN TRANSIT.`,
        [
          {
            text: 'Track in Dispatches',
            onPress: () => router.push('/(booth)/sent-receipts'),
          },
          {
            text: 'Done',
            onPress: () => router.replace('/(booth)'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Transmission Failed', err.message || 'Could not send receipt to BMC.');
    } finally {
      setSending(false);
    }
  };

  const handleShareWaybill = async () => {
    try {
      await Share.share({
        title: `AAVIN Digital Dispatch Waybill #${receipt.id}`,
        message: `🥛 AAVIN CO-OPERATIVE DAIRY - OFFICIAL DISPATCH WAYBILL\nReceipt ID: ${receipt.id}\nOrigin: ${receipt.boothName} (${receipt.boothId})\nDestination: ${receipt.bmcName}\nDate: ${receipt.collectionDate} (${receipt.session.toUpperCase()} Shift)\nDeclared Quantity: ${receipt.dispatchQuantity.toFixed(2)} Litres\nRecords: ${receipt.totalRecordsCount} Entries (${receipt.totalFarmersCount} Farmers)\nVerification Code: ${receipt.verificationCode}\nAuthorized By: ${receipt.createdBy}\nTamper Seal: Verified Digital Waybill`,
      });
    } catch (error) {
      // User cancelled or share error
    }
  };

  // Determine transit status badges and color scheme
  let transitBadgeColor = '#FEF3C7';
  let transitTextColor = '#B45309';
  let transitLabel = 'STAGED • READY TO TRANSMIT';

  if (isAlreadySent) {
    if (delivery?.status === 'matched') {
      transitBadgeColor = '#DCFCE7';
      transitTextColor = '#15803D';
      transitLabel = '✓ RECONCILED & MATCHED AT BMC';
    } else if (delivery?.status === 'mismatch_investigation') {
      transitBadgeColor = '#FEE2E2';
      transitTextColor = '#B91C1C';
      transitLabel = '⚠️ VARIANCE UNDER INVESTIGATION';
    } else {
      transitBadgeColor = '#E0F2FE';
      transitTextColor = '#0369A1';
      transitLabel = '🚚 IN TRANSIT • AWAITING BMC RECEPTION';
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Send Dispatch Receipt"
        subtitle={`Receipt #${receipt.id} • ${receipt.bmcName}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Transit Lifecycle Stepper */}
        <Card style={styles.stepperCard}>
          <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '800', letterSpacing: 0.5, marginBottom: 10 }]}>
            CHAIN-OF-CUSTODY TRACKER
          </Text>
          <View style={styles.stepperRow}>
            {/* Step 1 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, { backgroundColor: '#10B981' }]}>
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepLabel, { color: colors.text }]}>Intake Sealed</Text>
              <Text style={styles.stepSub}>Booth Done</Text>
            </View>

            <View style={[styles.stepLine, { backgroundColor: '#10B981' }]} />

            {/* Step 2 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, { backgroundColor: '#10B981' }]}>
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepLabel, { color: colors.text }]}>Waybill Issued</Text>
              <Text style={styles.stepSub}>Certified</Text>
            </View>

            <View style={[styles.stepLine, { backgroundColor: isAlreadySent ? '#10B981' : '#CBD5E1' }]} />

            {/* Step 3 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, { backgroundColor: isAlreadySent ? '#0284C7' : '#F59E0B' }]}>
                <Ionicons name={isAlreadySent ? "bus" : "cloud-upload"} size={13} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepLabel, { color: isAlreadySent ? colors.primary : '#D97706' }]}>
                {isAlreadySent ? 'Transmitted' : 'Ready to Send'}
              </Text>
              <Text style={styles.stepSub}>{isAlreadySent ? 'In Transit' : 'Pending'}</Text>
            </View>

            <View style={[styles.stepLine, { backgroundColor: delivery?.status === 'matched' ? '#10B981' : '#CBD5E1' }]} />

            {/* Step 4 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, { backgroundColor: delivery?.status === 'matched' ? '#10B981' : (delivery?.status === 'mismatch_investigation' ? '#EF4444' : '#E2E8F0') }]}>
                <Ionicons 
                  name={delivery?.status === 'matched' ? "shield-checkmark" : (delivery?.status === 'mismatch_investigation' ? "warning" : "scale")} 
                  size={13} 
                  color={delivery?.status === 'matched' || delivery?.status === 'mismatch_investigation' ? "#FFFFFF" : "#64748B"} 
                />
              </View>
              <Text style={[styles.stepLabel, { color: delivery?.status ? colors.text : colors.textMuted }]}>
                BMC Weighing
              </Text>
              <Text style={styles.stepSub}>
                {delivery?.status === 'matched' ? 'Matched' : (delivery?.status === 'mismatch_investigation' ? 'Variance' : 'Pending')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Official Digital Consignment Waybill */}
        <Card style={styles.waybillCard}>
          {/* Certificate Header Banner */}
          <View style={styles.certHeader}>
            <View style={styles.certEmblemBox}>
              <Ionicons name="shield-checkmark" size={20} color="#0072BC" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '900', letterSpacing: 0.3 }]}>
                AAVIN CO-OPERATIVE DAIRY
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Tamil Nadu Co-operative Milk Producers' Federation Ltd.
              </Text>
            </View>
            <Pressable onPress={handleShareWaybill} hitSlop={8} style={styles.shareIconBtn}>
              <Ionicons name="share-social-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>

          {/* Status Chip */}
          <View style={[styles.statusStrip, { backgroundColor: transitBadgeColor }]}>
            <Text style={[styles.statusStripText, { color: transitTextColor }]}>
              {transitLabel}
            </Text>
          </View>

          {/* Transit Corridor Visual Box */}
          <View style={[styles.corridorBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
            {/* Origin Node */}
            <View style={styles.corridorNode}>
              <View style={[styles.corridorIconBadge, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="business" size={16} color="#15803D" />
              </View>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>ORIGIN BOOTH</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', textAlign: 'center' }]} numberOfLines={1}>
                {receipt.boothName}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>ID: {receipt.boothId}</Text>
            </View>

            {/* Transit Route Icon & Arrow */}
            <View style={styles.corridorMid}>
              <View style={styles.tankerPill}>
                <Ionicons name="bus" size={12} color="#0284C7" />
                <Text style={styles.tankerPillText}>ROAD TANKER</Text>
              </View>
              <View style={styles.arrowLineRow}>
                <View style={styles.dashLine} />
                <Ionicons name="arrow-forward-circle" size={18} color="#0284C7" />
                <View style={styles.dashLine} />
              </View>
              <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>Insulated Run</Text>
            </View>

            {/* Destination Node */}
            <View style={styles.corridorNode}>
              <View style={[styles.corridorIconBadge, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="water" size={16} color="#0284C7" />
              </View>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>DESTINATION BMC</Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800', textAlign: 'center' }]} numberOfLines={1}>
                {receipt.bmcName}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>ID: {receipt.bmcId}</Text>
            </View>
          </View>

          {/* Prominent Volume Spotlight */}
          <View style={[styles.volumeSpotlight, { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', letterSpacing: 0.6 }]}>
              OFFICIAL DECLARED DISPATCH QUANTITY
            </Text>
            <View style={styles.volumeRow}>
              <Text style={[styles.bigVolumeNumber, { color: colors.primary }]}>
                {receipt.dispatchQuantity.toFixed(2)}
              </Text>
              <Text style={[styles.volumeUnit, { color: colors.primary }]}>Litres</Text>
            </View>
            <Text style={[Typography.caption2, { color: colors.textSecondary, textAlign: 'center' }]}>
              Immutable volume certified upon booth daily collection sign-off
            </Text>
          </View>

          {/* Key Consignment Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Direct Farmer Milk</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                {farmerWiseLitres > 0 ? `${farmerWiseLitres.toFixed(1)} L` : 'N/A'}
              </Text>
              <Text style={[Typography.caption2, { color: '#16A34A', fontSize: 10 }]}>
                {farmerWiseRecords.length} direct entries
              </Text>
            </View>

            <View style={[styles.metricTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Route Vendor Milk</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                {vendorLitres > 0 ? `${vendorLitres.toFixed(1)} L` : '0.0 L'}
              </Text>
              <Text style={[Typography.caption2, { color: '#4F46E5', fontSize: 10 }]}>
                {vendorRecords.length} bulk can batch
              </Text>
            </View>

            <View style={[styles.metricTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Collection Date</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                {receipt.collectionDate}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase' }]}>
                {receipt.session} shift
              </Text>
            </View>

            <View style={[styles.metricTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Audit Basis</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                {receipt.measurementBasis.toUpperCase()}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontSize: 10 }]}>
                Calibrated Dipstick
              </Text>
            </View>
          </View>

          {/* Reconciled Result Card (if BMC has already measured) */}
          {delivery && delivery.measuredReceivedQuantity !== undefined && (
            <View style={[styles.bmcResultBox, { backgroundColor: delivery.status === 'matched' ? '#F0FDF4' : '#FEF2F2', borderColor: delivery.status === 'matched' ? '#86EFAC' : '#FCA5A5' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons 
                  name={delivery.status === 'matched' ? "checkmark-circle" : "alert-circle"} 
                  size={18} 
                  color={delivery.status === 'matched' ? "#16A34A" : "#DC2626"} 
                />
                <Text style={[Typography.subhead, { color: delivery.status === 'matched' ? '#166534' : '#991B1B', fontWeight: '800', marginLeft: 6 }]}>
                  {delivery.status === 'matched' ? 'BMC Ultrasonic Reconciliation: MATCHED' : 'BMC Intake Discrepancy Flagged'}
                </Text>
              </View>

              <View style={styles.reconValuesRow}>
                <View style={styles.reconValCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Society Declared</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{delivery.declaredDispatchQuantity.toFixed(2)} L</Text>
                </View>
                <View style={styles.reconValCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>BMC Weighed</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{delivery.measuredReceivedQuantity.toFixed(2)} L</Text>
                </View>
                <View style={styles.reconValCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Variance</Text>
                  <Text style={[Typography.subhead, { color: delivery.status === 'matched' ? '#15803D' : '#DC2626', fontWeight: '900' }]}>
                    {delivery.difference ? `${delivery.difference > 0 ? '+' : ''}${delivery.difference.toFixed(2)} L` : '0.00 L'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Security Seal & Cryptographic Token */}
          <View style={[styles.securitySealBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
            <View style={styles.qrSealCol}>
              <View style={styles.qrFrame}>
                <Ionicons name="qr-code" size={44} color="#0072BC" />
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.tokenPill}>
                <Ionicons name="key" size={11} color="#0284C7" />
                <Text style={styles.tokenPillText}>DIGITAL WAYBILL TOKEN</Text>
              </View>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '900', marginTop: 3 }]}>
                {receipt.verificationCode}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 2 }]}>
                Authorized by: {receipt.createdBy}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Certified on: {receipt.createdAt.split('T')[0]}
              </Text>
            </View>
          </View>

          {/* Notes Callout */}
          {receipt.notes && (
            <View style={[styles.notesBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[Typography.caption2, { color: colors.textSecondary, flex: 1 }]}>
                Dispatch Remarks: {receipt.notes}
              </Text>
            </View>
          )}

          {/* Expandable Included Batch Entries */}
          <Pressable 
            style={[styles.toggleBatchBtn, { borderTopColor: colors.border }]}
            onPress={() => setShowBatchList(!showBatchList)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="list" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '700' }]}>
                {showBatchList ? 'Hide Included Milk Entries' : `View Included Milk Batches (${includedRecords.length})`}
              </Text>
            </View>
            <Ionicons name={showBatchList ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
          </Pressable>

          {showBatchList && (
            <View style={styles.batchListContainer}>
              {includedRecords.length === 0 ? (
                <Text style={[Typography.caption1, { color: colors.textSecondary, textAlign: 'center', marginVertical: 8 }]}>
                  All {receipt.totalRecordsCount} recorded batch transactions consolidated into master consignment.
                </Text>
              ) : (
                includedRecords.map((r, i) => (
                  <View key={r.id} style={[styles.batchListItem, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                        {i + 1}. {r.farmerName || r.vendorName || 'Route Batch'}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        {r.measurementMethod === 'farmer_wise' ? 'Individual Producer' : 'Vendor Consolidated Bulk'} • {r.session}
                      </Text>
                    </View>
                    <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                      {r.quantityLitres.toFixed(1)} L
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </Card>

        {/* Pre-Dispatch Tanker Verification Checklist (Only when not yet sent) */}
        {!isAlreadySent && (
          <Card style={styles.checklistCard}>
            <View style={styles.checklistHeader}>
              <Ionicons name="checkbox-outline" size={20} color="#0072BC" />
              <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
                Physical Tanker Dispatch Checklist
              </Text>
            </View>
            <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 12 }]}>
              Verify mandatory milk safety procedures before electronic transmission:
            </Text>

            {/* Check item 1 */}
            <Pressable 
              style={styles.checkItem}
              onPress={() => setSealChecklist(prev => ({ ...prev, valveSealed: !prev.valveSealed }))}
            >
              <Ionicons 
                name={sealChecklist.valveSealed ? "checkbox" : "square-outline"} 
                size={22} 
                color={sealChecklist.valveSealed ? "#10B981" : colors.textMuted} 
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  Tanker Valve & Manhole Tamper-Sealed
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  Numbered plastic lead seal attached and recorded in logbook.
                </Text>
              </View>
            </Pressable>

            {/* Check item 2 */}
            <Pressable 
              style={styles.checkItem}
              onPress={() => setSealChecklist(prev => ({ ...prev, sampleStored: !prev.sampleStored }))}
            >
              <Ionicons 
                name={sealChecklist.sampleStored ? "checkbox" : "square-outline"} 
                size={22} 
                color={sealChecklist.sampleStored ? "#10B981" : colors.textMuted} 
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  Dual Composite Test Vials Retained
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  Duplicate FAT/SNF samples taken for BMC verification.
                </Text>
              </View>
            </Pressable>

            {/* Check item 3 */}
            <Pressable 
              style={styles.checkItem}
              onPress={() => setSealChecklist(prev => ({ ...prev, tempLogged: !prev.tempLogged }))}
            >
              <Ionicons 
                name={sealChecklist.tempLogged ? "checkbox" : "square-outline"} 
                size={22} 
                color={sealChecklist.tempLogged ? "#10B981" : colors.textMuted} 
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  Transit Temperature Verified (≤ 4°C)
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  Pre-chilled batch temperature within dairy cold-chain tolerance.
                </Text>
              </View>
            </Pressable>
          </Card>
        )}

        {/* Action Button Section */}
        {!isAlreadySent ? (
          <View style={styles.actionSection}>
            <Button
              title={sending ? "Transmitting Waybill to BMC..." : `Transmit Consignment to BMC (${receipt.bmcName})`}
              size="lg"
              loading={sending}
              onPress={handleSendToBmc}
              icon="send"
              style={{ marginTop: 4 }}
            />
            <Button
              title="Share / Print Digital Waybill"
              variant="outline"
              icon="share-social-outline"
              onPress={handleShareWaybill}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <View style={styles.actionSection}>
            <View style={[styles.sentBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[Typography.subhead, { color: '#166534', fontWeight: '800' }]}>
                  Consignment Transmitted to BMC
                </Text>
                <Text style={[Typography.caption2, { color: '#15803D', marginTop: 1 }]}>
                  Waybill #{receipt.id} is active in {receipt.bmcName}'s incoming reception queue.
                </Text>
              </View>
            </View>

            <Button
              title="View in Transit Ledger & Reconciliation"
              size="lg"
              onPress={() => router.push('/(booth)/sent-receipts')}
              style={{ marginTop: 12 }}
            />

            <Button
              title="Return to Booth Dashboard"
              variant="outline"
              onPress={() => router.replace('/(booth)')}
              style={{ marginTop: 8 }}
            />
          </View>
        )}
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
    paddingBottom: 48,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCard: {
    padding: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 68,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  stepSub: {
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 1,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginBottom: 16,
  },
  waybillCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  certEmblemBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  shareIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusStrip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  statusStripText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  corridorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  corridorNode: {
    flex: 1,
    alignItems: 'center',
  },
  corridorIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corridorMid: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tankerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    marginBottom: 4,
  },
  tankerPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0284C7',
  },
  arrowLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
    justifyContent: 'center',
  },
  dashLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#93C5FD',
  },
  volumeSpotlight: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 14,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  bigVolumeNumber: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  volumeUnit: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 6,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricTile: {
    width: '48%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  bmcResultBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  reconValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  reconValCol: {
    flex: 1,
  },
  securitySealBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  qrSealCol: {
    alignItems: 'center',
  },
  qrFrame: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  tokenPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369A1',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  toggleBatchBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  batchListContainer: {
    marginTop: 10,
    gap: 6,
  },
  batchListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checklistCard: {
    padding: 16,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionSection: {
    marginTop: 2,
    marginBottom: 20,
  },
  sentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
});
