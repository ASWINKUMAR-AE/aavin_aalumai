import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  TextInput, 
  Alert, 
  Platform 
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
import { SocietyIncomeCategory, SocietyIncomeRecord } from '../../types/aavin';

const CATEGORIES: Array<{ id: SocietyIncomeCategory; label: string; desc: string }> = [
  { id: 'procurement_payment', label: 'Procurement Payment', desc: 'Milk purchase disbursement to society' },
  { id: 'quality_incentive', label: 'Quality Incentive', desc: 'High SNF/Fat grade quality reward' },
  { id: 'transport_subsidy', label: 'Transport Subsidy', desc: 'Freight & route tanker reimbursement' },
  { id: 'chilling_incentive', label: 'Chilling Incentive', desc: 'Rapid chilling & temp maintenance bonus' },
  { id: 'feed_deduction', label: 'Feed Deduction', desc: 'Cattle feed supply offset deduction' },
  { id: 'admin_recovery', label: 'Admin Recovery', desc: 'Operational recovery or audit offset' },
  { id: 'other', label: 'Other Operational Income', desc: 'Miscellaneous approved transaction' },
];

export default function SocietyIncomeScreen() {
  const router = useRouter();
  const { preselectedSocietyId } = useLocalSearchParams<{ preselectedSocietyId?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();

  const { 
    bmcs, 
    booths, 
    societyIncomeRecords, 
    addSocietyIncomeRecord 
  } = useAavinStore();

  const bmcId = user?.associatedId || 'BMC001';
  const bmc = bmcs.find(b => b.id === bmcId) || bmcs[0];
  const assignedSocieties = booths.filter(b => b.assignedBmcId === bmc.id);

  // Form State
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>(() => {
    if (preselectedSocietyId && assignedSocieties.some(b => b.id === preselectedSocietyId)) {
      return preselectedSocietyId;
    }
    return assignedSocieties[0]?.id || '';
  });

  const [category, setCategory] = useState<SocietyIncomeCategory>('procurement_payment');
  const [transactionDate, setTransactionDate] = useState('2026-10-12');
  const [financialPeriod, setFinancialPeriod] = useState('2026-10');
  const [amountStr, setAmountStr] = useState('');
  const [relatedLitresStr, setRelatedLitresStr] = useState('');
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History Filter
  const [filterSociety, setFilterSociety] = useState<string>('all');

  // Existing records for this BMC
  const existingRecords = useMemo(() => {
    const assignedIds = assignedSocieties.map(s => s.id);
    return (societyIncomeRecords || []).filter(r => 
      r.bmcId === bmc.id || assignedIds.includes(r.societyId)
    );
  }, [societyIncomeRecords, bmc, assignedSocieties]);

  const filteredRecords = useMemo(() => {
    if (filterSociety === 'all') return existingRecords;
    return existingRecords.filter(r => r.societyId === filterSociety);
  }, [existingRecords, filterSociety]);

  // Validation & Submit
  const handleSaveIncome = () => {
    const amount = parseFloat(amountStr);
    if (!selectedSocietyId) {
      Alert.alert('Required Field', 'Please select an assigned feeder society.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount in ₹.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please enter a description or voucher details for this entry.');
      return;
    }

    // Check duplicate
    const isDuplicate = existingRecords.some(r => 
      r.societyId === selectedSocietyId &&
      r.transactionDate === transactionDate &&
      r.category === category &&
      Math.abs(r.amountInr - amount) < 0.01 &&
      (referenceNumber ? r.referenceNumber === referenceNumber : false)
    );

    if (isDuplicate) {
      Alert.alert(
        'Duplicate Entry Detected',
        'An identical financial entry already exists for this society, date, category and amount. Please verify reference vouchers.'
      );
      return;
    }

    const society = assignedSocieties.find(s => s.id === selectedSocietyId);
    setIsSubmitting(true);

    try {
      const newEntry = addSocietyIncomeRecord({
        societyId: selectedSocietyId,
        societyName: society?.name || 'Society',
        bmcId: bmc.id,
        transactionDate,
        financialPeriod,
        category,
        description: description.trim(),
        referenceNumber: referenceNumber.trim() || `VOU-${Date.now().toString().slice(-6)}`,
        amountInr: amount,
        relatedMilkLitres: relatedLitresStr ? parseFloat(relatedLitresStr) : undefined,
        notes: notes.trim() || undefined,
        enteredBy: user?.fullName || 'BMC Supervisor',
        enteredByUserId: user?.id,
        status: 'recorded',
      });

      Alert.alert(
        'Income Recorded Successfully',
        `₹${amount.toLocaleString('en-IN')} logged for ${society?.name}. Reference: ${newEntry.referenceNumber}`
      );

      // Reset form
      setAmountStr('');
      setRelatedLitresStr('');
      setDescription('');
      setReferenceNumber('');
      setNotes('');
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Failed to save income record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Record Society Income"
        subtitle={`${bmc.name} • Financial Ledger & Remittance`}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Bar */}
        <View style={styles.topNavRow}>
          <Pressable 
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginLeft: 6 }]}>
              Dashboard
            </Text>
          </Pressable>

          <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
            Authorized BMC Financial Portal
          </Text>
        </View>

        {/* 1. New Financial Entry Card */}
        <Card style={styles.formCard}>
          <View style={styles.formTitleRow}>
            <View style={[styles.formIconBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="cash-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                New Income / Ledger Entry
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Record society earnings, procurement balances, or approved incentives.
              </Text>
            </View>
          </View>

          {/* Society Selector */}
          <View style={styles.formGroup}>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
              Feeder Society <Text style={{ color: '#DC2626' }}>*</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {assignedSocieties.map((s) => {
                const isSelected = selectedSocietyId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    style={[
                      styles.societyPickerPill,
                      isSelected 
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.card, borderColor: colors.border }
                    ]}
                    onPress={() => setSelectedSocietyId(s.id)}
                  >
                    <Text style={[
                      Typography.caption1,
                      { fontWeight: '700' },
                      isSelected ? { color: '#FFFFFF' } : { color: colors.text }
                    ]}>
                      {s.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Income Category */}
          <View style={styles.formGroup}>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
              Income Category <Text style={{ color: '#DC2626' }}>*</Text>
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((c) => {
                const isSelected = category === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.categoryOption,
                      isSelected 
                        ? { borderColor: colors.primary, backgroundColor: 'rgba(0, 77, 153, 0.06)' }
                        : { borderColor: colors.border, backgroundColor: colors.card }
                    ]}
                    onPress={() => setCategory(c.id)}
                  >
                    <Ionicons 
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'} 
                      size={16} 
                      color={isSelected ? colors.primary : colors.textMuted} 
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[Typography.caption1, { fontWeight: '700', color: isSelected ? colors.primary : colors.text }]}>
                        {c.label}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                        {c.desc}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Amount and Related Litres */}
          <View style={styles.rowTwoCols}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
                Amount (₹ INR) <Text style={{ color: '#DC2626' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.inputField, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                placeholder="e.g. 54200"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={amountStr}
                onChangeText={setAmountStr}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
                Related Milk (Litres)
              </Text>
              <TextInput
                style={[styles.inputField, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                placeholder="e.g. 1200.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={relatedLitresStr}
                onChangeText={setRelatedLitresStr}
              />
            </View>
          </View>

          {/* Date and Financial Period */}
          <View style={styles.rowTwoCols}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
                Transaction Date
              </Text>
              <TextInput
                style={[styles.inputField, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                value={transactionDate}
                onChangeText={setTransactionDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
                Financial Period
              </Text>
              <TextInput
                style={[styles.inputField, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                value={financialPeriod}
                onChangeText={setFinancialPeriod}
                placeholder="e.g. 2026-10"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Description & Reference */}
          <View style={styles.formGroup}>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
              Description / Voucher Details <Text style={{ color: '#DC2626' }}>*</Text>
            </Text>
            <TextInput
              style={[styles.inputField, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
              placeholder="e.g. First fortnightly milk procurement settlement"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.rowTwoCols}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
                Voucher / Reference No.
              </Text>
              <TextInput
                style={[styles.inputField, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                placeholder="e.g. AAVIN-VOU-2026-091"
                placeholderTextColor={colors.textMuted}
                value={referenceNumber}
                onChangeText={setReferenceNumber}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
                Entered By
              </Text>
              <TextInput
                style={[styles.inputField, { borderColor: colors.border, color: colors.textMuted, backgroundColor: '#F1F5F9' }]}
                value={user?.fullName || 'BMC Supervisor'}
                editable={false}
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
              Internal Audit Notes
            </Text>
            <TextInput
              style={[styles.textAreaField, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
              placeholder="Add optional supervisor remarks or bank reference..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Submit Action */}
          <Button
            title={isSubmitting ? 'Recording Ledger...' : '💾 Save Society Income Entry'}
            size="lg"
            onPress={handleSaveIncome}
            disabled={isSubmitting}
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* 2. Previously Recorded Financial Ledger */}
        <Card style={styles.historyCard}>
          <View style={styles.historyHeaderRow}>
            <View>
              <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                Financial Audit Trail & Ledger
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                {filteredRecords.length} recorded entry(ies) in this BMC registry
              </Text>
            </View>

            {/* Filter by society */}
            <View style={styles.filterPillGroup}>
              <Pressable
                style={[
                  styles.filterPill,
                  filterSociety === 'all' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setFilterSociety('all')}
              >
                <Text style={[
                  Typography.caption2,
                  { fontWeight: '700', color: filterSociety === 'all' ? '#FFFFFF' : colors.textSecondary }
                ]}>
                  All
                </Text>
              </Pressable>

              {assignedSocieties.map(s => (
                <Pressable
                  key={s.id}
                  style={[
                    styles.filterPill,
                    filterSociety === s.id && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setFilterSociety(s.id)}
                >
                  <Text style={[
                    Typography.caption2,
                    { fontWeight: '700', color: filterSociety === s.id ? '#FFFFFF' : colors.textSecondary }
                  ]}>
                    {s.village}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {filteredRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={40} color={colors.textMuted} />
              <Text style={[Typography.body, { color: colors.textSecondary, marginTop: 8 }]}>
                No financial records matching current filter.
              </Text>
            </View>
          ) : (
            filteredRecords.map((item) => (
              <View key={item.id} style={[styles.recordRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.recordIconBox, { backgroundColor: 'rgba(5, 150, 105, 0.1)' }]}>
                  <Ionicons name="cash" size={20} color="#059669" />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.recordTitleRow}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      {item.societyName}
                    </Text>
                    <Text style={[Typography.headline, { color: '#059669', fontWeight: '800' }]}>
                      ₹{item.amountInr.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 1 }]}>
                    {item.description}
                  </Text>

                  <View style={styles.recordMetaRow}>
                    <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                      {item.category.replace(/_/g, ' ').toUpperCase()} • Date: {item.transactionDate} • Period: {item.financialPeriod}
                    </Text>
                  </View>

                  {item.referenceNumber && (
                    <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '600' }]}>
                      Ref: {item.referenceNumber}
                    </Text>
                  )}

                  {/* Audit trail chip */}
                  <View style={styles.auditFootnote}>
                    <Ionicons name="shield-checkmark-outline" size={12} color="#059669" />
                    <Text style={[Typography.caption2, { color: '#059669', marginLeft: 4, fontWeight: '700' }]}>
                      Logged by {item.enteredBy} • Status: {item.status.toUpperCase()}
                    </Text>
                  </View>
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
    gap: 14,
    paddingBottom: 40,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  formCard: {
    padding: 16,
    borderRadius: 16,
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  formIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    marginBottom: 14,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  societyPickerPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  categoryGrid: {
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textAreaField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 60,
  },
  historyCard: {
    padding: 16,
    borderRadius: 16,
  },
  historyHeaderRow: {
    marginBottom: 14,
  },
  filterPillGroup: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  filterPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  recordRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recordIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordMetaRow: {
    marginTop: 2,
  },
  auditFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});
