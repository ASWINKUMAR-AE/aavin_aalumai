import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewDailyCollectionScreen() {
  const { user } = useAuth();
  const { booths, bmcs, farmers, milkRecords, boothReceipts, createBoothReceipt } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];
  const assignedBmc = bmcs.find(b => b.id === booth.assignedBmcId) || bmcs[0];

  const todayStr = '2026-10-12';

  // Check if today's receipt is already generated
  const existingTodayReceipt = boothReceipts.find(
    r => r.boothId === booth.id && r.collectionDate === todayStr
  );

  // Unprocessed or today's records eligible for dispatch
  const todayRecords = milkRecords.filter(
    r => r.boothId === booth.id && r.collectionDate === todayStr && r.status !== 'included_in_receipt'
  );

  const farmerWiseRecords = todayRecords.filter(r => r.measurementMethod === 'farmer_wise');
  const combinedVendorRecords = todayRecords.filter(r => r.measurementMethod === 'combined');

  const farmerWiseTotal = farmerWiseRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
  const combinedVendorTotal = combinedVendorRecords.reduce((sum, r) => sum + r.quantityLitres, 0);

  // Exact eligible total without double counting
  const eligibleReceiptTotal = parseFloat((farmerWiseTotal + combinedVendorTotal).toFixed(2));

  const uniqueParticipatingFarmerIds = new Set(farmerWiseRecords.map(r => r.farmerId).filter(Boolean));
  const assignedFarmers = farmers.filter(f => f.assignedBoothId === booth.id);
  const missingFarmers = assignedFarmers.filter(f => !uniqueParticipatingFarmerIds.has(f.id));

  const [notes] = useState('Daily morning collection verified. Dispatched via insulated tanker.');
  const [generating, setGenerating] = useState(false);

  const handleGenerateReceipt = () => {
    if (todayRecords.length === 0) {
      Alert.alert('No Eligible Records', 'There are no unreceipted milk entries recorded for today.');
      return;
    }

    setGenerating(true);
    try {
      const receipt = createBoothReceipt(
        booth.id,
        assignedBmc.id,
        todayStr,
        'morning',
        todayRecords.map(r => r.id),
        user?.fullName || 'Society Operator',
        notes
      );

      Alert.alert(
        'Digital Dispatch Receipt Generated!',
        `Receipt #${receipt.id} generated for ${receipt.dispatchQuantity} Litres. Review and transmit to ${assignedBmc.name}.`,
        [
          {
            text: 'Preview & Send to BMC',
            onPress: () => router.push(`/(booth)/receipt-preview?receiptId=${receipt.id}` as any),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not generate receipt.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Dispatch Receipts & Closure"
        subtitle={`Daily Audit • Destination: ${assignedBmc.name}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Quick Links Bar */}
        <View style={styles.topLinksRow}>
          <Pressable 
            style={[styles.archiveBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(booth)/sent-receipts')}
          >
            <Ionicons name="documents-outline" size={16} color={colors.primary} />
            <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800', marginLeft: 6 }]}>
              Sent Dispatches Ledger
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </Pressable>
        </View>

        {/* Existing Active Receipt Card (if already generated for today) */}
        {existingTodayReceipt && (
          <Card style={[styles.existingReceiptCard, { backgroundColor: isDark ? '#1E293B' : '#F0FDF4', borderColor: '#86EFAC' }]}>
            {/* Top Header Row with Title and Status Pill */}
            <View style={styles.existingReceiptTopRow}>
              <View style={styles.existingReceiptBadgeRow}>
                <View style={[styles.receiptIconBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="receipt" size={18} color="#15803D" />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[Typography.caption2, { color: '#15803D', fontWeight: '800', letterSpacing: 0.5 }]}>
                    TODAY'S DISPATCH RECEIPT
                  </Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '900' }]} numberOfLines={1}>
                    #{existingTodayReceipt.id}
                  </Text>
                </View>
              </View>

              <View style={[styles.statusPill, { backgroundColor: existingTodayReceipt.status === 'sent_to_bmc' ? '#DCFCE7' : '#FEF3C7' }]}>
                <Ionicons 
                  name={existingTodayReceipt.status === 'sent_to_bmc' ? "checkmark-circle" : "paper-plane-outline"} 
                  size={12} 
                  color={existingTodayReceipt.status === 'sent_to_bmc' ? '#15803D' : '#B45309'} 
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.statusPillText, { color: existingTodayReceipt.status === 'sent_to_bmc' ? '#15803D' : '#B45309' }]}>
                  {existingTodayReceipt.status === 'sent_to_bmc' ? 'SENT TO BMC' : 'READY TO SEND'}
                </Text>
              </View>
            </View>

            {/* Metas Row: Dispatched Volume & Receiving BMC */}
            <View style={[styles.existingReceiptMetaRow, { borderTopColor: isDark ? '#334155' : '#BBF7D0' }]}>
              <View style={styles.existingMetaCol}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Dispatched Volume</Text>
                <Text style={[Typography.headline, { color: colors.primary, fontWeight: '900' }]}>
                  {existingTodayReceipt.dispatchQuantity.toFixed(2)} L
                </Text>
              </View>

              <View style={[styles.existingMetaDivider, { backgroundColor: isDark ? '#334155' : '#BBF7D0' }]} />

              <View style={[styles.existingMetaCol, { flex: 1.4 }]}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Receiving BMC Facility</Text>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
                  {existingTodayReceipt.bmcName}
                </Text>
              </View>
            </View>

            <Button
              title={existingTodayReceipt.status === 'sent_to_bmc' ? "View Waybill & Transit Tracking" : "Send Receipt to BMC Now ➔"}
              size="md"
              icon={existingTodayReceipt.status === 'sent_to_bmc' ? "eye-outline" : "send"}
              onPress={() => router.push(`/(booth)/receipt-preview?receiptId=${existingTodayReceipt.id}` as any)}
              style={{ marginTop: 12 }}
            />
          </Card>
        )}

        {/* Verification Summary Card */}
        <Card style={styles.card}>
          <View style={styles.batchMetaRow}>
            <View style={styles.sessionPill}>
              <Text style={styles.sessionPillText}>MORNING BATCH</Text>
            </View>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              Date: {todayStr}
            </Text>
          </View>

          <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', marginTop: 8 }]}>
            ELIGIBLE QUANTITY FOR BMC DISPATCH
          </Text>
          <View style={styles.qtyRow}>
            <Text style={[styles.bigTotal, { color: colors.text }]}>
              {eligibleReceiptTotal.toFixed(2)}
            </Text>
            <Text style={[styles.bigTotalUnit, { color: colors.text }]}>Litres</Text>
          </View>
          <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
            Total Net Milk audited for certified tanker dispatch slip
          </Text>

          {/* Double Counting Guard Note */}
          <View style={[styles.guardBox, { backgroundColor: isDark ? '#1E293B' : '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Ionicons name="shield-checkmark" size={18} color="#16A34A" style={{ marginRight: 8 }} />
            <Text style={[Typography.caption2, { color: '#166534', flex: 1, fontWeight: '600' }]}>
              Double-Counting Guard Active: Vendor route can batches and farmer direct intake are audited separately to prevent duplication.
            </Text>
          </View>

          {/* Breakdown Grid */}
          <View style={[styles.breakdownGrid, { borderTopColor: colors.border }]}>
            <View style={[styles.breakdownTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Ionicons name="person" size={16} color="#15803D" />
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>
                Farmer Direct Milk
              </Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                {farmerWiseTotal.toFixed(1)} L
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>
                {farmerWiseRecords.length} direct entries
              </Text>
            </View>

            <View style={[styles.breakdownTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Ionicons name="bus" size={16} color="#4F46E5" />
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>
                Route Vendor Milk
              </Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                {combinedVendorTotal.toFixed(1)} L
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>
                {combinedVendorRecords.length} bulk can route
              </Text>
            </View>

            <View style={[styles.breakdownTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Ionicons name="people" size={16} color="#0284C7" />
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>
                Farmer Attendance
              </Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                {uniqueParticipatingFarmerIds.size} / {assignedFarmers.length}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>
                {missingFarmers.length} not yet supplied
              </Text>
            </View>

            <View style={[styles.breakdownTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Ionicons name="water" size={16} color="#0072BC" />
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>
                Receiving BMC
              </Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]} numberOfLines={1}>
                {assignedBmc.name}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10 }]}>
                {assignedBmc.id}
              </Text>
            </View>
          </View>
        </Card>

        {/* Missing Expected Farmers Notice */}
        {missingFarmers.length > 0 && (
          <Card style={[styles.card, { borderColor: '#F59E0B' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="time" size={18} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={[Typography.headline, { color: '#B45309', fontWeight: '800' }]}>
                Pending Expected Farmer Entries ({missingFarmers.length})
              </Text>
            </View>
            <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 8 }]}>
              The following registered society farmers have not yet supplied milk this morning:
            </Text>
            {missingFarmers.map(mf => (
              <View key={mf.id} style={[styles.missingItem, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                    • {mf.name} ({mf.farmerIdCode})
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                    {mf.village} • {mf.numberOfCows} cattle registered
                  </Text>
                </View>
                <Text style={[Typography.caption1, { color: colors.textSecondary, fontWeight: '600' }]}>
                  ~{mf.numberOfCows * 12} L exp.
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Transactions List */}
        <Card style={styles.card}>
          <View style={styles.transactionsHeader}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
              Eligible Transactions List ({todayRecords.length})
            </Text>
            <Pressable onPress={() => router.push('/(booth)/record-milk')}>
              <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800' }]}>
                + Add Record
              </Text>
            </Pressable>
          </View>

          {todayRecords.length === 0 ? (
            <View style={styles.noRecordsBox}>
              <Ionicons name="checkmark-done-circle" size={36} color="#10B981" />
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginTop: 8 }]}>
                All Entries Reconciled
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, textAlign: 'center', marginTop: 2 }]}>
                All today's recorded entries have already been packaged into an official dispatch receipt.
              </Text>
            </View>
          ) : (
            todayRecords.map((r, i) => (
              <View key={r.id} style={[styles.includedItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.itemTypeBadge, { backgroundColor: r.measurementMethod === 'farmer_wise' ? '#DCFCE7' : '#E0E7FF' }]}>
                  <Ionicons 
                    name={r.measurementMethod === 'farmer_wise' ? "person" : "bus"} 
                    size={14} 
                    color={r.measurementMethod === 'farmer_wise' ? "#15803D" : "#4338CA"} 
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                    {i + 1}. {r.farmerName || r.vendorName}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {r.measurementMethod === 'farmer_wise' ? 'Individual Producer' : 'Vendor Consolidated Bulk'} • {r.session}
                  </Text>
                </View>
                <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800' }]}>
                  {r.quantityLitres.toFixed(1)} L
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* Generate Receipt CTA */}
        {todayRecords.length > 0 ? (
          <Button
            title={generating ? "Generating Digital Waybill..." : `Confirm Total (${eligibleReceiptTotal} L) & Send Receipt`}
            size="lg"
            loading={generating}
            onPress={handleGenerateReceipt}
            icon="receipt-outline"
            style={{ marginTop: 6 }}
          />
        ) : (
          existingTodayReceipt && (
            <Button
              title="Open Today's Generated Waybill"
              size="lg"
              onPress={() => router.push(`/(booth)/receipt-preview?receiptId=${existingTodayReceipt.id}` as any)}
              style={{ marginTop: 6 }}
            />
          )
        )}

        <Button
          title="View Sent Dispatches History"
          variant="outline"
          onPress={() => router.push('/(booth)/sent-receipts')}
          style={{ marginTop: 8, marginBottom: 28 }}
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
    paddingBottom: 40,
  },
  topLinksRow: {
    flexDirection: 'row',
  },
  archiveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  existingReceiptCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  existingReceiptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  existingReceiptBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  receiptIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  existingReceiptMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  existingMetaCol: {
    flex: 1,
  },
  existingMetaDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
  },
  batchMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
    marginBottom: 4,
  },
  bigTotal: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  bigTotalUnit: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 6,
  },
  guardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  breakdownGrid: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breakdownTile: {
    width: '48.5%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  missingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  noRecordsBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  includedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemTypeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
