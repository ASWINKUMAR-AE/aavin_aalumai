import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { SmartCattleTagScannerModal } from '../../components/scanner/SmartCattleTagScannerModal';

export default function VeterinaryDashboard() {
  const { user } = useAuth();
  const { cows } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const cowsWithWithdrawal = cows.filter(c => c.activeWithdrawal?.hasActiveWithdrawal);
  const cowsUnderTreatment = cows.filter(c => c.healthStatus === 'under_treatment');
  const healthyCows = cows.filter(c => c.healthStatus === 'healthy');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={user?.fullName || "Dr. R. Anand BVSc"}
        subtitle="Aavin Veterinary Dispensary • Melur Division"
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Active Medicine Withdrawal Alert Banner */}
        {cowsWithWithdrawal.length > 0 && (
          <View style={[styles.warningBanner, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
            <Ionicons name="warning" size={24} color="#DC2626" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.headline, { color: '#B91C1C', fontWeight: '900' }]}>
                ⚠️ ACTIVE MEDICINE WITHDRAWAL RESTRICTIONS ({cowsWithWithdrawal.length})
              </Text>
              <Text style={[Typography.caption1, { color: '#991B1B', marginTop: 2 }]}>
                Veterinary antibiotic/NSAID withdrawal active. Society alerts and milk withholding flags deployed.
              </Text>
            </View>
          </View>
        )}

        {/* 3 Overview KPI Cards */}
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="paw" size={18} color="#0284C7" />
            </View>
            <Text style={[styles.kpiNumber, { color: colors.text }]}>{cows.length}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Assigned Bovines</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="bandage" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.kpiNumber, { color: '#DC2626' }]}>{cowsUnderTreatment.length}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Under Active Treatment</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            </View>
            <Text style={[styles.kpiNumber, { color: '#16A34A' }]}>{healthyCows.length}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Optimal Health</Text>
          </Card>
        </View>

        {/* Cows Currently on Medicine Milk Withholding */}
        <Card style={styles.sectionCard}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 10 }]}>
            Active Treatment & Withdrawal Surveillance
          </Text>

          {cowsWithWithdrawal.length === 0 ? (
            <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 14 }]}>
              No animals currently on milk withholding.
            </Text>
          ) : (
            cowsWithWithdrawal.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => router.push({
                  pathname: '/(veterinary)/cow-details',
                  params: { cowId: c.id, tagId: c.tagId, from: 'home' },
                } as any)}
                style={styles.cowSurveillanceItem}
              >
                <View style={[styles.statusIndicator, { backgroundColor: '#DC2626' }]} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    {c.name} (Tag #{c.tagId})
                  </Text>
                  <Text style={[Typography.caption1, { color: '#B91C1C', fontWeight: '700' }]}>
                    {c.activeWithdrawal?.medicineName}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    Owner: {c.farmerName} • Diagnosis: {c.activeWithdrawal?.reason}
                  </Text>
                  <Text style={[Typography.caption2, { color: '#991B1B', fontWeight: '700', marginTop: 2 }]}>
                    Withholding ends: {c.activeWithdrawal?.withdrawalEndDate} ({c.activeWithdrawal?.daysRemaining} days remaining)
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </Card>

        {/* Upcoming Clinical Appointments & Follow-ups */}
        <Card style={styles.sectionCard}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 10 }]}>
            Upcoming Health Follow-ups & Vaccinations
          </Text>

          <View style={styles.appointmentRow}>
            <View style={[styles.appDateBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '900' }]}>14</Text>
              <Text style={[Typography.caption2, { color: colors.primary }]}>OCT</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                Post-Mastitis Udder Palpation & CMT Test
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Cow Lakshmi (#100100001002) • Farmer K. Murugesan
              </Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.typeBadgeText, { color: '#DC2626' }]}>Follow-up</Text>
            </View>
          </View>

          <View style={styles.appointmentRow}>
            <View style={[styles.appDateBadge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[Typography.caption1, { color: '#16A34A', fontWeight: '900' }]}>15</Text>
              <Text style={[Typography.caption2, { color: '#16A34A' }]}>NOV</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                Bi-annual Foot & Mouth (FMD) Booster Camp
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Melur Rural Cluster Society • All Registered Herds
              </Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: '#E0F2FE' }]}>
              <Text style={[styles.typeBadgeText, { color: '#0284C7' }]}>Vaccine</Text>
            </View>
          </View>
        </Card>

        {/* Quick Operations Actions */}
        <View style={styles.actionsGrid}>
          <Button
            title="📷 Scan Cattle Ear Tag (Barcode + OCR)"
            variant="primary"
            size="lg"
            onPress={() => setScannerVisible(true)}
          />
          <Button
            title="💊 Prescribe Treatment & Set Withdrawal Period"
            size="lg"
            variant="outline"
            onPress={() => router.push({
              pathname: '/(veterinary)/treatment-entry',
              params: { from: 'home' },
            } as any)}
          />
          <Button
            title="🩺 Perform Clinical Examination"
            variant="secondary"
            onPress={() => router.push({
              pathname: '/(veterinary)/examination-entry',
              params: { from: 'home' },
            } as any)}
          />
          <Button
            title="🔍 Search & Browse Cattle Registry"
            variant="outline"
            onPress={() => router.push({
              pathname: '/(veterinary)/cattle-registry',
              params: { from: 'home' },
            } as any)}
          />
        </View>
      </ScrollView>

      <SmartCattleTagScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(tagId) => {
          setScannerVisible(false);
          router.push({
            pathname: '/(veterinary)/cow-details',
            params: { tagId, from: 'home' },
          } as any);
        }}
        userRoleLabel="Veterinary Doctor"
      />
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  sectionCard: {
    padding: 16,
  },
  cowSurveillanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  statusIndicator: {
    width: 6,
    height: 48,
    borderRadius: 3,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  appDateBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  actionsGrid: {
    gap: 10,
    marginTop: 4,
  },
});
