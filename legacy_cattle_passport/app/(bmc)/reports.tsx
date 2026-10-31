import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  Share, 
  Alert, 
  Platform 
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

type ReportLevel = 'daily' | 'monthly' | 'yearly';

export default function BMCReportsScreen() {
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
    bmcReceipts 
  } = useAavinStore();

  const bmcId = user?.associatedId || 'BMC001';
  const bmc = bmcs.find(b => b.id === bmcId) || bmcs[0];
  const assignedSocieties = booths.filter(b => b.assignedBmcId === bmc.id);

  const [level, setLevel] = useState<ReportLevel>('daily');
  const [selectedDate, setSelectedDate] = useState('2026-10-12');
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [selectedYear, setSelectedYear] = useState('2026');

  // Daily Report Data Calculations
  const dailyReportData = useMemo(() => {
    return assignedSocieties.map((society) => {
      const records = milkRecords.filter(r => r.boothId === society.id && r.collectionDate === selectedDate);
      const delivery = bmcDeliveries.find(d => d.boothId === society.id && d.collectionDate === selectedDate);
      const incomeEntries = (societyIncomeRecords || []).filter(i => i.societyId === society.id && i.transactionDate === selectedDate);
      const discrepancy = discrepancyCases.find(c => c.boothId === society.id && c.collectionDate === selectedDate);

      const collectedLitres = records.reduce((sum, r) => sum + r.quantityLitres, 0);
      const declaredLitres = delivery ? delivery.declaredDispatchQuantity : collectedLitres;
      const receivedLitres = delivery?.measuredReceivedQuantity !== undefined ? delivery.measuredReceivedQuantity : 0;
      const difference = delivery?.difference !== undefined ? delivery.difference : (declaredLitres - receivedLitres);
      const income = incomeEntries.reduce((sum, i) => sum + i.amountInr, 0);

      const status = delivery 
        ? (delivery.status === 'pending_arrival' ? 'Awaiting Measurement' : delivery.status === 'matched' ? 'Reconciled' : 'Variance Audit')
        : (collectedLitres > 0 ? 'Recorded Locally' : 'No Record');

      return {
        societyId: society.id,
        societyName: society.name,
        village: society.village,
        collectedLitres: parseFloat(collectedLitres.toFixed(1)),
        declaredLitres: parseFloat(declaredLitres.toFixed(1)),
        receivedLitres: parseFloat(receivedLitres.toFixed(1)),
        differenceLitres: parseFloat(difference.toFixed(1)),
        income,
        status,
        hasDiscrepancy: !!discrepancy && discrepancy.status !== 'resolved',
      };
    });
  }, [assignedSocieties, milkRecords, bmcDeliveries, societyIncomeRecords, discrepancyCases, selectedDate]);

  // Monthly Report Data Calculations
  const monthlyReportData = useMemo(() => {
    return assignedSocieties.map((society) => {
      const records = milkRecords.filter(r => r.boothId === society.id && r.collectionDate.startsWith(selectedMonth));
      const deliveries = bmcDeliveries.filter(d => d.boothId === society.id && d.collectionDate.startsWith(selectedMonth));
      const incomeEntries = (societyIncomeRecords || []).filter(i => i.societyId === society.id && i.financialPeriod === selectedMonth);
      const discrepancies = discrepancyCases.filter(c => c.boothId === society.id && c.collectionDate.startsWith(selectedMonth));

      const dailyMap: Record<string, number> = {};
      records.forEach(r => {
        dailyMap[r.collectionDate] = (dailyMap[r.collectionDate] || 0) + r.quantityLitres;
      });
      const activeDays = Object.keys(dailyMap).length;
      const monthlyTotal = records.reduce((sum, r) => sum + r.quantityLitres, 0);
      const dailyAverage = activeDays > 0 ? parseFloat((monthlyTotal / activeDays).toFixed(1)) : 0;

      const declaredTotal = deliveries.reduce((sum, d) => sum + d.declaredDispatchQuantity, 0);
      const receivedTotal = deliveries.reduce((sum, d) => sum + (d.measuredReceivedQuantity || 0), 0);
      const totalDifference = parseFloat((declaredTotal - receivedTotal).toFixed(1));

      const totalIncome = incomeEntries.reduce((sum, i) => sum + i.amountInr, 0);
      const unresolvedCount = discrepancies.filter(c => c.status !== 'resolved').length;
      const expectedDays = 12; // Oct 1 to 12
      const missingDays = Math.max(0, expectedDays - activeDays);

      return {
        societyId: society.id,
        societyName: society.name,
        village: society.village,
        monthlyTotal: parseFloat(monthlyTotal.toFixed(1)),
        dailyAverage,
        receivedTotal: parseFloat(receivedTotal.toFixed(1)),
        totalDifference,
        totalIncome,
        missingDays,
        unresolvedCount,
        completeness: missingDays === 0 ? 'Complete' : `${missingDays} Days Missing`,
      };
    });
  }, [assignedSocieties, milkRecords, bmcDeliveries, societyIncomeRecords, discrepancyCases, selectedMonth]);

  // Yearly Report Data Calculations
  const yearlyReportData = useMemo(() => {
    return assignedSocieties.map((society) => {
      const records = milkRecords.filter(r => r.boothId === society.id && r.collectionDate.startsWith(selectedYear));
      const deliveries = bmcDeliveries.filter(d => d.boothId === society.id && d.collectionDate.startsWith(selectedYear));
      const incomeEntries = (societyIncomeRecords || []).filter(i => i.societyId === society.id && i.transactionDate.startsWith(selectedYear));
      const discrepancies = discrepancyCases.filter(c => c.boothId === society.id && c.collectionDate.startsWith(selectedYear));

      const annualMilkTotal = records.reduce((sum, r) => sum + r.quantityLitres, 0);
      const annualReceived = deliveries.reduce((sum, d) => sum + (d.measuredReceivedQuantity || 0), 0);
      const annualDifference = parseFloat((records.reduce((s, r) => s + r.quantityLitres, 0) - annualReceived).toFixed(1));
      const annualIncome = incomeEntries.reduce((sum, i) => sum + i.amountInr, 0);
      const totalDiscrepancies = discrepancies.length;

      return {
        societyId: society.id,
        societyName: society.name,
        village: society.village,
        annualMilkTotal: parseFloat(annualMilkTotal.toFixed(1)),
        annualReceived: parseFloat(annualReceived.toFixed(1)),
        annualDifference,
        annualIncome,
        totalDiscrepancies,
        yoyTrend: '+12.5% vs FY 2025',
      };
    });
  }, [assignedSocieties, milkRecords, bmcDeliveries, societyIncomeRecords, discrepancyCases, selectedYear]);

  // Totals for active view
  const currentTotals = useMemo(() => {
    if (level === 'daily') {
      const declared = dailyReportData.reduce((s, r) => s + r.declaredLitres, 0);
      const received = dailyReportData.reduce((s, r) => s + r.receivedLitres, 0);
      const diff = dailyReportData.reduce((s, r) => s + r.differenceLitres, 0);
      const inc = dailyReportData.reduce((s, r) => s + r.income, 0);
      return { declared, received, diff, inc, periodText: `Day: ${selectedDate}` };
    }
    if (level === 'monthly') {
      const total = monthlyReportData.reduce((s, r) => s + r.monthlyTotal, 0);
      const received = monthlyReportData.reduce((s, r) => s + r.receivedTotal, 0);
      const diff = monthlyReportData.reduce((s, r) => s + r.totalDifference, 0);
      const inc = monthlyReportData.reduce((s, r) => s + r.totalIncome, 0);
      return { declared: total, received, diff, inc, periodText: `Month: ${selectedMonth}` };
    }
    const total = yearlyReportData.reduce((s, r) => s + r.annualMilkTotal, 0);
    const received = yearlyReportData.reduce((s, r) => s + r.annualReceived, 0);
    const diff = yearlyReportData.reduce((s, r) => s + r.annualDifference, 0);
    const inc = yearlyReportData.reduce((s, r) => s + r.annualIncome, 0);
    return { declared: total, received, diff, inc, periodText: `Year: ${selectedYear}` };
  }, [level, dailyReportData, monthlyReportData, yearlyReportData, selectedDate, selectedMonth, selectedYear]);

  // Export to CSV Functionality
  const handleExportCSV = async () => {
    let csvHeader = '';
    let csvRows = '';
    const genTimestamp = new Date().toLocaleString('en-IN');

    if (level === 'daily') {
      csvHeader = `Aavin BMC Daily Reconciliation Report\nBMC: ${bmc.name} (${bmc.id})\nDate: ${selectedDate}\nGenerated At: ${genTimestamp}\n\nSociety ID,Society Name,Village,Declared Litres,Received Litres,Difference (L),Recorded Income (INR),Status\n`;
      csvRows = dailyReportData.map(r => 
        `"${r.societyId}","${r.societyName}","${r.village}",${r.declaredLitres},${r.receivedLitres},${r.differenceLitres},${r.income},"${r.status}"`
      ).join('\n');
    } else if (level === 'monthly') {
      csvHeader = `Aavin BMC Monthly Consolidation Report\nBMC: ${bmc.name} (${bmc.id})\nMonth: ${selectedMonth}\nGenerated At: ${genTimestamp}\n\nSociety ID,Society Name,Village,Monthly Total (L),Daily Average (L),Received Total (L),Difference (L),Recorded Income (INR),Completeness\n`;
      csvRows = monthlyReportData.map(r => 
        `"${r.societyId}","${r.societyName}","${r.village}",${r.monthlyTotal},${r.dailyAverage},${r.receivedTotal},${r.totalDifference},${r.totalIncome},"${r.completeness}"`
      ).join('\n');
    } else {
      csvHeader = `Aavin BMC Annual Comprehensive Report\nBMC: ${bmc.name} (${bmc.id})\nYear: ${selectedYear}\nGenerated At: ${genTimestamp}\n\nSociety ID,Society Name,Village,Annual Milk (L),Received Total (L),Difference (L),Annual Income (INR),Discrepancy Cases,YoY Trend\n`;
      csvRows = yearlyReportData.map(r => 
        `"${r.societyId}","${r.societyName}","${r.village}",${r.annualMilkTotal},${r.annualReceived},${r.annualDifference},${r.annualIncome},${r.totalDiscrepancies},"${r.yoyTrend}"`
      ).join('\n');
    }

    const fullCsv = csvHeader + csvRows;

    try {
      if (Platform.OS === 'web') {
        // Web Download
        const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Aavin_BMC_Report_${level}_${bmc.id}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('CSV Exported', 'The report CSV file has been downloaded successfully.');
      } else {
        // Native Share sheet
        await Share.share({
          message: fullCsv,
          title: `Aavin BMC ${level.toUpperCase()} Report - ${selectedDate}`,
        });
      }
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Could not export CSV');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="BMC Official Reports"
        subtitle={`${bmc.name} • Daily, Monthly & Annual Audit Statements`}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Row */}
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

          <Button
            title="📥 Export CSV"
            size="sm"
            onPress={handleExportCSV}
          />
        </View>

        {/* 1. Report Level Segment Tabs */}
        <View style={styles.levelTabsRow}>
          {(['daily', 'monthly', 'yearly'] as ReportLevel[]).map((lvl) => {
            const active = level === lvl;
            const labels: Record<ReportLevel, string> = {
              daily: 'Daily Statement',
              monthly: 'Monthly Consolidation',
              yearly: 'Yearly Audit Return'
            };
            return (
              <Pressable
                key={lvl}
                style={[
                  styles.levelTab,
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  !active && { backgroundColor: colors.card, borderColor: colors.border }
                ]}
                onPress={() => setLevel(lvl)}
              >
                <Text style={[
                  Typography.caption1,
                  { fontWeight: '800' },
                  active ? { color: '#FFFFFF' } : { color: colors.textSecondary }
                ]}>
                  {labels[lvl]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Period Selector Card */}
        <Card style={styles.periodCard}>
          <View style={styles.periodRow}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                REPORTING WINDOW
              </Text>
              <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                {currentTotals.periodText}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • Status: Validated
              </Text>
            </View>

            {level === 'daily' && (
              <View style={styles.quickDatePills}>
                {['2026-10-12', '2026-10-11', '2026-10-10'].map(d => (
                  <Pressable
                    key={d}
                    style={[
                      styles.quickPill,
                      selectedDate === d && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setSelectedDate(d)}
                  >
                    <Text style={[
                      Typography.caption2,
                      { fontWeight: '700', color: selectedDate === d ? '#FFFFFF' : colors.text }
                    ]}>
                      {d.slice(8)} Oct
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {level === 'monthly' && (
              <View style={styles.quickDatePills}>
                {['2026-10', '2026-09'].map(m => (
                  <Pressable
                    key={m}
                    style={[
                      styles.quickPill,
                      selectedMonth === m && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setSelectedMonth(m)}
                  >
                    <Text style={[
                      Typography.caption2,
                      { fontWeight: '700', color: selectedMonth === m ? '#FFFFFF' : colors.text }
                    ]}>
                      {m === '2026-10' ? 'Oct 2026' : 'Sep 2026'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {level === 'yearly' && (
              <View style={styles.quickDatePills}>
                {['2026', '2025'].map(y => (
                  <Pressable
                    key={y}
                    style={[
                      styles.quickPill,
                      selectedYear === y && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setSelectedYear(y)}
                  >
                    <Text style={[
                      Typography.caption2,
                      { fontWeight: '700', color: selectedYear === y ? '#FFFFFF' : colors.text }
                    ]}>
                      FY {y}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </Card>

        {/* 2. Consolidated Metric Summary Cards */}
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
              TOTAL DECLARED
            </Text>
            <Text style={[styles.metricNumber, { color: colors.text }]}>
              {currentTotals.declared.toLocaleString()} L
            </Text>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>
              Society Dispatch Volume
            </Text>
          </Card>

          <Card style={styles.metricCard}>
            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
              BMC RECEIVED
            </Text>
            <Text style={[styles.metricNumber, { color: colors.primary }]}>
              {currentTotals.received.toLocaleString()} L
            </Text>
            <Text style={[Typography.caption2, { color: '#16A34A' }]}>
              Flow Meter Verified
            </Text>
          </Card>

          <Card style={styles.metricCard}>
            <Text style={[Typography.caption2, { color: currentTotals.diff > 0 ? '#DC2626' : '#16A34A', fontWeight: '700' }]}>
              NET VARIANCE
            </Text>
            <Text style={[styles.metricNumber, { color: currentTotals.diff > 0 ? '#DC2626' : '#16A34A' }]}>
              {currentTotals.diff > 0 ? `-${currentTotals.diff.toFixed(1)} L` : '0.0 L'}
            </Text>
            <Text style={[Typography.caption2, { color: currentTotals.diff > 0 ? '#DC2626' : '#16A34A' }]}>
              {currentTotals.diff > 0 ? 'Transit Shortfall' : 'Balanced'}
            </Text>
          </Card>

          <Card style={styles.metricCard}>
            <Text style={[Typography.caption2, { color: '#059669', fontWeight: '700' }]}>
              RECORDED INCOME
            </Text>
            <Text style={[styles.metricNumber, { color: '#059669' }]}>
              ₹{currentTotals.inc.toLocaleString('en-IN')}
            </Text>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>
              Financial Ledger Total
            </Text>
          </Card>
        </View>

        {/* 3. Detailed Society-Wise Statement Table */}
        <Card style={styles.statementCard}>
          <View style={styles.statementHeader}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
              Society-Wise Audit Breakdown
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              All {assignedSocieties.length} assigned feeder societies included
            </Text>
          </View>

          {/* Table Header */}
          <View style={[styles.tableHeadRow, { backgroundColor: '#F8FAFC' }]}>
            <Text style={[styles.tableColSociety, Typography.caption2, { fontWeight: '800', color: colors.text }]}>
              SOCIETY
            </Text>
            <Text style={[styles.tableColLitres, Typography.caption2, { fontWeight: '800', color: colors.text }]}>
              {level === 'monthly' ? 'MONTH (L)' : level === 'yearly' ? 'ANNUAL (L)' : 'DECLARED'}
            </Text>
            <Text style={[styles.tableColLitres, Typography.caption2, { fontWeight: '800', color: colors.primary }]}>
              RECEIVED
            </Text>
            <Text style={[styles.tableColVariance, Typography.caption2, { fontWeight: '800', color: '#DC2626' }]}>
              DIFF
            </Text>
            <Text style={[styles.tableColIncome, Typography.caption2, { fontWeight: '800', color: '#059669' }]}>
              INCOME
            </Text>
          </View>

          {/* Table Rows based on Active Level */}
          {level === 'daily' && dailyReportData.map((row) => (
            <View key={row.societyId} style={[styles.tableDataRow, { borderBottomColor: colors.border }]}>
              <View style={styles.tableColSociety}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  {row.societyName}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  {row.village} • {row.status}
                </Text>
              </View>

              <Text style={[styles.tableColLitres, Typography.caption1, { color: colors.text }]}>
                {row.declaredLitres} L
              </Text>
              <Text style={[styles.tableColLitres, Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                {row.receivedLitres} L
              </Text>
              <Text style={[styles.tableColVariance, Typography.caption1, { 
                color: row.differenceLitres > 0 ? '#DC2626' : '#16A34A', 
                fontWeight: '800' 
              }]}>
                {row.differenceLitres > 0 ? `-${row.differenceLitres}` : '0.0'}
              </Text>
              <Text style={[styles.tableColIncome, Typography.caption1, { color: '#059669', fontWeight: '800' }]}>
                ₹{row.income.toLocaleString('en-IN')}
              </Text>
            </View>
          ))}

          {level === 'monthly' && monthlyReportData.map((row) => (
            <View key={row.societyId} style={[styles.tableDataRow, { borderBottomColor: colors.border }]}>
              <View style={styles.tableColSociety}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  {row.societyName}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  Avg: {row.dailyAverage} L/day • {row.completeness}
                </Text>
              </View>

              <Text style={[styles.tableColLitres, Typography.caption1, { color: colors.text }]}>
                {row.monthlyTotal} L
              </Text>
              <Text style={[styles.tableColLitres, Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                {row.receivedTotal} L
              </Text>
              <Text style={[styles.tableColVariance, Typography.caption1, { 
                color: row.totalDifference > 0 ? '#DC2626' : '#16A34A', 
                fontWeight: '800' 
              }]}>
                {row.totalDifference > 0 ? `-${row.totalDifference}` : '0.0'}
              </Text>
              <Text style={[styles.tableColIncome, Typography.caption1, { color: '#059669', fontWeight: '800' }]}>
                ₹{row.totalIncome.toLocaleString('en-IN')}
              </Text>
            </View>
          ))}

          {level === 'yearly' && yearlyReportData.map((row) => (
            <View key={row.societyId} style={[styles.tableDataRow, { borderBottomColor: colors.border }]}>
              <View style={styles.tableColSociety}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  {row.societyName}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  {row.yoyTrend} • {row.totalDiscrepancies} cases
                </Text>
              </View>

              <Text style={[styles.tableColLitres, Typography.caption1, { color: colors.text }]}>
                {row.annualMilkTotal.toLocaleString()} L
              </Text>
              <Text style={[styles.tableColLitres, Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                {row.annualReceived.toLocaleString()} L
              </Text>
              <Text style={[styles.tableColVariance, Typography.caption1, { 
                color: row.annualDifference > 0 ? '#DC2626' : '#16A34A', 
                fontWeight: '800' 
              }]}>
                {row.annualDifference > 0 ? `-${row.annualDifference}` : '0.0'}
              </Text>
              <Text style={[styles.tableColIncome, Typography.caption1, { color: '#059669', fontWeight: '800' }]}>
                ₹{row.annualIncome.toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </Card>

        {/* 4. Submission & Dispatch Action Tile */}
        <Card style={styles.actionCard}>
          <View style={styles.actionCardContent}>
            <Ionicons name="paper-plane-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                Submit Consolidated Period Return to Union
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                Dispatch verified society volumes, variances, and financial summaries to Union GM for formal sign-off.
              </Text>
            </View>
          </View>
          <Button
            title="Open Consolidated Submission Workflow →"
            size="md"
            style={{ marginTop: 12 }}
            onPress={() => router.push('/(bmc)/submit-union-report')}
          />
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
    gap: 12,
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
  levelTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  levelTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodCard: {
    padding: 14,
    borderRadius: 14,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickDatePills: {
    flexDirection: 'row',
    gap: 6,
  },
  quickPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: 12,
  },
  metricNumber: {
    fontSize: 19,
    fontWeight: '800',
    marginVertical: 4,
  },
  statementCard: {
    padding: 14,
    borderRadius: 14,
  },
  statementHeader: {
    marginBottom: 10,
  },
  tableHeadRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableColSociety: {
    flex: 2.2,
  },
  tableColLitres: {
    flex: 1.1,
    textAlign: 'right',
  },
  tableColVariance: {
    flex: 0.9,
    textAlign: 'right',
  },
  tableColIncome: {
    flex: 1.2,
    textAlign: 'right',
  },
  actionCard: {
    padding: 16,
    borderRadius: 14,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
