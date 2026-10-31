import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { 
    farmers, 
    cows, 
    booths, 
    bmcs, 
    milkRecords, 
    discrepancyCases 
  } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);

  const pendingFarmers = farmers.filter(f => f.verificationStatus === 'pending');
  const pendingCows = cows.filter(c => c.verificationStatus === 'pending');
  const openDiscrepancies = discrepancyCases.filter(c => c.status === 'open' || c.status === 'under_investigation');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Aavin System Administration"
        subtitle={`${user?.fullName} • District ICT Operations`}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Pending Verifications Banner */}
        {(pendingFarmers.length > 0 || pendingCows.length > 0) && (
          <View style={[styles.alertBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Ionicons name="time" size={24} color="#D97706" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.headline, { color: '#B45309', fontWeight: '800' }]}>
                KYC / Verification Queue
              </Text>
              <Text style={[Typography.caption1, { color: '#92400E', marginTop: 2 }]}>
                {pendingFarmers.length} farmer(s) and {pendingCows.length} cow(s) awaiting identity verification.
              </Text>
            </View>
            <Button
              title="Review"
              size="sm"
              onPress={() => router.push('/(admin)/verifications')}
            />
          </View>
        )}

        {/* System Entities Grid */}
        <View style={styles.gridRow}>
          <Card style={styles.gridCard}>
            <View style={[styles.iconFrame, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="people" size={20} color="#0284C7" />
            </View>
            <Text style={[styles.gridNum, { color: colors.text }]}>{farmers.length}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Enrolled Farmers</Text>
            <Text style={[Typography.caption2, { color: '#16A34A', fontWeight: '700' }]}>
              {farmers.filter(f => f.verificationStatus === 'verified').length} Verified
            </Text>
          </Card>

          <Card style={styles.gridCard}>
            <View style={[styles.iconFrame, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="paw" size={20} color="#16A34A" />
            </View>
            <Text style={[styles.gridNum, { color: colors.text }]}>{cows.length}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Registered Cattle</Text>
            <Text style={[Typography.caption2, { color: '#DC2626', fontWeight: '700' }]}>
              {cows.filter(c => c.activeWithdrawal?.hasActiveWithdrawal).length} Under Hold
            </Text>
          </Card>

          <Card style={styles.gridCard}>
            <View style={[styles.iconFrame, { backgroundColor: '#FAF5FF' }]}>
              <Ionicons name="business" size={20} color="#9333EA" />
            </View>
            <Text style={[styles.gridNum, { color: colors.text }]}>{booths.length}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Collection Societies</Text>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>Feeder Societies</Text>
          </Card>

          <Card style={styles.gridCard}>
            <View style={[styles.iconFrame, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="snow" size={20} color="#D97706" />
            </View>
            <Text style={[styles.gridNum, { color: colors.text }]}>{bmcs.length}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>BMC Centers</Text>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>Bulk Coolers</Text>
          </Card>
        </View>

        {/* Ledger Transactions Summary */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
            Ledger Activity & Data Integrity
          </Text>

          <View style={styles.row}>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Total Milk Transactions Recorded:</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{milkRecords.length} Entries</Text>
          </View>
          <View style={styles.row}>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Active Discrepancies:</Text>
            <Text style={[Typography.subhead, { color: openDiscrepancies.length > 0 ? '#DC2626' : '#16A34A', fontWeight: '800' }]}>
              {openDiscrepancies.length} Cases
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Local Storage Persistence:</Text>
            <Text style={[Typography.subhead, { color: '#16A34A', fontWeight: '800' }]}>Active (AsyncStorage)</Text>
          </View>
        </Card>

        {/* Quick Operational Navigation */}
        <View style={styles.actionGrid}>
          <Button
            title="📋 Verification Queue (Farmers & Cattle)"
            size="lg"
            onPress={() => router.push('/(admin)/verifications')}
          />
          <Button
            title="⚙️ Demo Settings & Reset Data"
            variant="secondary"
            onPress={() => router.push('/(admin)/demo-settings')}
          />
          <Button
            title="👥 Manage Demo Accounts"
            variant="outline"
            onPress={() => router.push('/(admin)/users')}
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
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '48%',
    padding: 14,
  },
  iconFrame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gridNum: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  card: {
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionGrid: {
    gap: 10,
    marginTop: 4,
  },
});
