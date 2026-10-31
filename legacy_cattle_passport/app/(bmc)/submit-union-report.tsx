import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  TextInput, 
  Modal, 
  Alert 
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
import { BMCReceipt, BMCReportStatus } from '../../types/aavin';

export default function SubmitUnionReportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const { 
    bmcs, 
    booths, 
    milkRecords, 
    bmcDeliveries, 
    discrepancyCases, 
    societyIncomeRecords,
    bmcReceipts, 
    submitBmcConsolidatedReport 
  } = useAavinStore();

  const bmcId = user?.associatedId || 'BMC001';
  const bmc = bmcs.find(b => b.id === bmcId) || bmcs[0];
  const assignedSocieties = booths.filter(b => b.assignedBmcId === bmc.id);

  // Workflow steps: 'configure' | 'preview' | 'confirmed'
  const [step, setStep] = useState<'configure' | 'preview' | 'confirmed'>('configure');

  // Reporting Period State
  const [periodType, setPeriodType] = useState<'daily' | 'monthly' | 'custom'>('daily');
  const [collectionDate, setCollectionDate] = useState('2026-10-12');
  const [periodStartDate, setPeriodStartDate] = useState('2026-10-01');
  const [periodEndDate, setPeriodEndDate] = useState('2026-10-12');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<BMCReceipt | null>(null);

  // Previous Submissions for this BMC
  const bmcSubmissions = useMemo(() => {
    return bmcReceipts.filter(r => r.bmcId === bmc.id);
  }, [bmcReceipts, bmc.id]);

  // Check if a report was already submitted for this exact date/period
  const existingSubmissionForPeriod = useMemo(() => {
    return bmcSubmissions.find(r => 
      r.collectionDate === collectionDate &&
      r.reportingPeriodType === periodType &&
      r.status !== 'draft'
    );
  }, [bmcSubmissions, collectionDate, periodType]);

  // Aggregate society statistics for the selected reporting period
  const consolidatedData = useMemo(() => {
    let totalDeclared = 0;
    let totalReceived = 0;
    let totalIncome = 0;
    let totalPendingDeliveries = 0;
    const includedDeliveryIds: string[] = [];

    const summaries = assignedSocieties.map((society) => {
      // Find deliveries matching period
      const deliveries = bmcDeliveries.filter(d => {
        if (d.boothId !== society.id) return false;
        if (periodType === 'daily') return d.collectionDate === collectionDate;
        return d.collectionDate >= periodStartDate && d.collectionDate <= periodEndDate;
      });

      const incomeList = (societyIncomeRecords || []).filter(i => {
        if (i.societyId !== society.id) return false;
        if (periodType === 'daily') return i.transactionDate === collectionDate;
        return i.transactionDate >= periodStartDate && i.transactionDate <= periodEndDate;
      });

      const discrepancies = discrepancyCases.filter(c => {
        if (c.boothId !== society.id) return false;
        if (periodType === 'daily') return c.collectionDate === collectionDate;
        return c.collectionDate >= periodStartDate && c.collectionDate <= periodEndDate;
      });

      const declared = deliveries.reduce((sum, d) => sum + d.declaredDispatchQuantity, 0);
      const received = deliveries
        .filter(d => d.measuredReceivedQuantity !== undefined)
        .reduce((sum, d) => sum + (d.measuredReceivedQuantity || 0), 0);
      const income = incomeList.reduce((sum, i) => sum + i.amountInr, 0);
      const pendingCount = deliveries.filter(d => d.status === 'pending_arrival').length;

      deliveries.forEach(d => includedDeliveryIds.push(d.id));
      totalDeclared += declared;
      totalReceived += received;
      totalIncome += income;
      totalPendingDeliveries += pendingCount;

      const variance = parseFloat((declared - received).toFixed(1));
      const discrepancyCount = discrepancies.filter(c => c.status !== 'resolved').length;

      return {
        societyId: society.id,
        societyName: society.name,
        declaredLitres: parseFloat(declared.toFixed(1)),
        receivedLitres: parseFloat(received.toFixed(1)),
        varianceLitres: variance,
        recordedIncome: income,
        discrepancyCount,
        status: pendingCount > 0 ? 'Pending Arrival' : (discrepancyCount > 0 ? 'Variance Audit' : 'Reconciled'),
      };
    });

    const netVariance = parseFloat((totalDeclared - totalReceived).toFixed(1));
    const totalUnresolved = summaries.reduce((sum, s) => sum + s.discrepancyCount, 0);

    return {
      summaries,
      totalDeclared: parseFloat(totalDeclared.toFixed(1)),
      totalReceived: parseFloat(totalReceived.toFixed(1)),
      netVariance,
      totalIncome,
      totalPendingDeliveries,
      totalUnresolved,
      includedDeliveryIds,
      societiesCount: assignedSocieties.length,
    };
  }, [assignedSocieties, bmcDeliveries, societyIncomeRecords, discrepancyCases, periodType, collectionDate, periodStartDate, periodEndDate]);

  // Handle final submission to Union
  const handleFinalSubmit = () => {
    if (existingSubmissionForPeriod && existingSubmissionForPeriod.status !== 'returned_for_correction') {
      Alert.alert(
        'Submission Exists',
        `A consolidated report for this period (${existingSubmissionForPeriod.id}) is already submitted. Duplicate submissions are locked unless returned by Union.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const receipt = submitBmcConsolidatedReport({
        bmcId: bmc.id,
        reportingPeriodType: periodType,
        collectionDate,
        periodStartDate: periodType !== 'daily' ? periodStartDate : undefined,
        periodEndDate: periodType !== 'daily' ? periodEndDate : undefined,
        includedDeliveryIds: consolidatedData.includedDeliveryIds,
        totalDeclaredQuantity: consolidatedData.totalDeclared,
        totalReceivedQuantity: consolidatedData.totalReceived,
        totalRecordedIncome: consolidatedData.totalIncome,
        totalAmountReceived: consolidatedData.totalIncome * 0.9,
        totalAmountPending: consolidatedData.totalIncome * 0.1,
        societySummaries: consolidatedData.summaries,
        supervisorNotes: supervisorNotes.trim() || undefined,
        createdBy: user?.fullName || 'BMC Supervisor',
      });

      setSubmittedReceipt(receipt);
      setStep('confirmed');
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Failed to submit report to Union');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: BMCReportStatus) => {
    const config: Record<BMCReportStatus, { bg: string; color: string; label: string }> = {
      draft: { bg: '#F1F5F9', color: '#475569', label: 'DRAFT' },
      sent_to_union: { bg: '#E0F2FE', color: '#0369A1', label: 'SUBMITTED TO UNION' },
      under_review: { bg: '#FEF3C7', color: '#92400E', label: 'UNDER REVIEW' },
      reviewed_by_union: { bg: '#DCFCE7', color: '#166534', label: 'APPROVED' },
      returned_for_correction: { bg: '#FEE2E2', color: '#991B1B', label: 'RETURNED FOR CORRECTION' },
    };
    const c = config[status] || config.draft;
    return (
      <View style={[styles.statusChip, { backgroundColor: c.bg }]}>
        <Text style={[styles.statusChipText, { color: c.color }]}>{c.label}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Submit to Union"
        subtitle={`${bmc.name} • Official Union Consolidation Gateway`}
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
            Step: {step === 'configure' ? '1. Select Period' : step === 'preview' ? '2. Review & Sign-Off' : '3. Confirmed'}
          </Text>
        </View>

        {/* Existing Submission Safeguard Alert */}
        {existingSubmissionForPeriod && step !== 'confirmed' && (
          <View style={[styles.alertBanner, { backgroundColor: '#EFF6FF', borderColor: '#60A5FA' }]}>
            <Ionicons name="information-circle" size={24} color="#2563EB" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.subhead, { color: '#1D4ED8', fontWeight: '800' }]}>
                Existing Report #{existingSubmissionForPeriod.id}
              </Text>
              <Text style={[Typography.caption2, { color: '#2563EB', marginTop: 2 }]}>
                A consolidated report is already lodged for this period. Current Status: {existingSubmissionForPeriod.status.toUpperCase()}.
              </Text>
            </View>
          </View>
        )}

        {/* Step 1: Configure Period & Load Summary */}
        {step === 'configure' && (
          <>
            <Card style={styles.card}>
              <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 6 }]}>
                1. Select Reporting Period
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 12 }]}>
                Consolidates intake, measured flow volumes, variances, and recorded society income for official submission.
              </Text>

              {/* Period Type Segment */}
              <View style={styles.segmentRow}>
                {(['daily', 'monthly', 'custom'] as const).map(t => (
                  <Pressable
                    key={t}
                    style={[
                      styles.segmentBtn,
                      periodType === t && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setPeriodType(t)}
                  >
                    <Text style={[
                      Typography.caption1,
                      { fontWeight: '800' },
                      periodType === t ? { color: '#FFFFFF' } : { color: colors.textSecondary }
                    ]}>
                      {t.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Date Input */}
              {periodType === 'daily' ? (
                <View style={styles.inputGroup}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 4 }]}>
                    Collection Date
                  </Text>
                  <TextInput
                    style={[styles.inputField, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                    value={collectionDate}
                    onChangeText={setCollectionDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              ) : (
                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 4 }]}>
                      Start Date
                    </Text>
                    <TextInput
                      style={[styles.inputField, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                      value={periodStartDate}
                      onChangeText={setPeriodStartDate}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 4 }]}>
                      End Date
                    </Text>
                    <TextInput
                      style={[styles.inputField, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                      value={periodEndDate}
                      onChangeText={setPeriodEndDate}
                    />
                  </View>
                </View>
              )}

              {/* Live Aggregate Preview Box */}
              <View style={[styles.summaryBox, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
                <View style={styles.summaryBoxRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Societies Included:</Text>
                  <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800' }]}>
                    {consolidatedData.societiesCount} Feeder Societies
                  </Text>
                </View>
                <View style={styles.summaryBoxRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Total Dispatched:</Text>
                  <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800' }]}>
                    {consolidatedData.totalDeclared} L
                  </Text>
                </View>
                <View style={styles.summaryBoxRow}>
                  <Text style={[Typography.caption2, { color: colors.primary }]}>BMC Received:</Text>
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800' }]}>
                    {consolidatedData.totalReceived} L
                  </Text>
                </View>
                <View style={styles.summaryBoxRow}>
                  <Text style={[Typography.caption2, { color: consolidatedData.netVariance > 0 ? '#DC2626' : '#16A34A' }]}>
                    Net Variance:
                  </Text>
                  <Text style={[Typography.caption1, { 
                    color: consolidatedData.netVariance > 0 ? '#DC2626' : '#16A34A', 
                    fontWeight: '800' 
                  }]}>
                    {consolidatedData.netVariance > 0 ? `-${consolidatedData.netVariance} L` : '0.0 L (Balanced)'}
                  </Text>
                </View>
                <View style={styles.summaryBoxRow}>
                  <Text style={[Typography.caption2, { color: '#059669' }]}>Total Recorded Income:</Text>
                  <Text style={[Typography.caption1, { color: '#059669', fontWeight: '800' }]}>
                    ₹{consolidatedData.totalIncome.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <Button
                title="Review Consolidated Report Preview →"
                size="lg"
                style={{ marginTop: 16 }}
                onPress={() => setStep('preview')}
              />
            </Card>
          </>
        )}

        {/* Step 2: Full Preview, Supervisor Sign-Off & Confirmation */}
        {step === 'preview' && (
          <Card style={styles.card}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 4 }]}>
              2. Review Report & Supervisor Sign-Off
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 14 }]}>
              Verify society data integrity prior to authenticating submission to Union General Manager.
            </Text>

            {/* Society Breakdown Table */}
            <View style={styles.previewTable}>
              <View style={[styles.previewTableHead, { backgroundColor: '#F1F5F9' }]}>
                <Text style={[styles.colName, Typography.caption2, { fontWeight: '800', color: colors.text }]}>SOCIETY</Text>
                <Text style={[styles.colNum, Typography.caption2, { fontWeight: '800', color: colors.text }]}>DISP (L)</Text>
                <Text style={[styles.colNum, Typography.caption2, { fontWeight: '800', color: colors.primary }]}>RECV (L)</Text>
                <Text style={[styles.colNum, Typography.caption2, { fontWeight: '800', color: '#059669' }]}>INCOME</Text>
              </View>

              {consolidatedData.summaries.map(s => (
                <View key={s.societyId} style={[styles.previewTableRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.colName}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>{s.societyName}</Text>
                    <Text style={[Typography.caption2, { color: s.discrepancyCount > 0 ? '#DC2626' : '#16A34A' }]}>
                      {s.status}
                    </Text>
                  </View>
                  <Text style={[styles.colNum, Typography.caption1, { color: colors.text }]}>{s.declaredLitres}</Text>
                  <Text style={[styles.colNum, Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>{s.receivedLitres}</Text>
                  <Text style={[styles.colNum, Typography.caption1, { color: '#059669', fontWeight: '800' }]}>₹{s.recordedIncome}</Text>
                </View>
              ))}
            </View>

            {/* Supervisor Notes */}
            <View style={{ marginTop: 14 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
                Supervisor Remarks & Quality Sign-Off
              </Text>
              <TextInput
                style={[styles.textAreaField, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                placeholder="e.g. Milk chilled to 3.8°C. Morning batches verified against flow meters. Ready for Union review."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={supervisorNotes}
                onChangeText={setSupervisorNotes}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.previewBtnRow}>
              <Button
                title="← Back"
                variant="outline"
                size="md"
                style={{ flex: 1 }}
                onPress={() => setStep('configure')}
              />
              <Button
                title={isSubmitting ? 'Transmitting...' : '🚀 Final Submit to Union'}
                size="md"
                style={{ flex: 2 }}
                disabled={isSubmitting}
                onPress={handleFinalSubmit}
              />
            </View>
          </Card>
        )}

        {/* Step 3: Confirmation State */}
        {step === 'confirmed' && submittedReceipt && (
          <Card style={[styles.card, { alignItems: 'center', padding: 24 }]}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
            </View>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '900', marginTop: 12 }]}>
              Report Lodged with Union!
            </Text>
            <Text style={[Typography.caption1, { color: colors.textSecondary, textAlign: 'center', marginTop: 6 }]}>
              Consolidated return transmitted successfully. Status updated to "SENT TO UNION".
            </Text>

            <View style={[styles.receiptBox, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>SUBMISSION REFERENCE</Text>
              <Text style={[Typography.headline, { color: colors.primary, fontWeight: '900', letterSpacing: 0.5 }]}>
                {submittedReceipt.id}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 4 }]}>
                Verification Code: {submittedReceipt.verificationCode}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                {submittedReceipt.totalReceivedQuantity} L Volume • ₹{(submittedReceipt.totalRecordedIncome || 0).toLocaleString('en-IN')} Income
              </Text>
            </View>

            <Button
              title="Return to BMC Dashboard"
              size="lg"
              style={{ width: '100%', marginTop: 20 }}
              onPress={() => router.push('/(bmc)')}
            />
          </Card>
        )}

        {/* 3. Submission History & Audit Log */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 4 }]}>
            📋 Union Submission History
          </Text>
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 12 }]}>
            Track historical period submissions, Union GM sign-offs, and returned revisions.
          </Text>

          {bmcSubmissions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="documents-outline" size={36} color={colors.textMuted} />
              <Text style={[Typography.body, { color: colors.textSecondary, marginTop: 8 }]}>
                No reports submitted to the Union yet.
              </Text>
            </View>
          ) : (
            bmcSubmissions.map((r) => (
              <View key={r.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.historyTitleRow}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      Receipt #{r.id}
                    </Text>
                    {getStatusBadge(r.status)}
                  </View>

                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Date: {r.collectionDate} • {r.totalBoothsCount} Societies • Measured: {r.totalReceivedQuantity} L
                  </Text>

                  {r.totalRecordedIncome !== undefined && (
                    <Text style={[Typography.caption2, { color: '#059669', fontWeight: '700' }]}>
                      Recorded Income: ₹{r.totalRecordedIncome.toLocaleString('en-IN')}
                    </Text>
                  )}

                  {r.unionReviewNotes && (
                    <View style={styles.reviewNotesBox}>
                      <Ionicons name="chatbubble-ellipses-outline" size={13} color="#2563EB" />
                      <Text style={[Typography.caption2, { color: '#1D4ED8', marginLeft: 4 }]}>
                        Union GM Notes: "{r.unionReviewNotes}"
                      </Text>
                    </View>
                  )}
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  card: {
    padding: 16,
    borderRadius: 16,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  textAreaField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 70,
  },
  summaryBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: 6,
  },
  summaryBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTable: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  previewTableHead: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  previewTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colName: {
    flex: 2,
  },
  colNum: {
    flex: 1.1,
    textAlign: 'right',
  },
  previewBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBox: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 16,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 9,
    fontWeight: '800',
  },
  historyRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewNotesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    padding: 6,
    borderRadius: 6,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
});
