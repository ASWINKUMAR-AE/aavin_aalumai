import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAavinStore } from '../store/AavinStoreContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../constants/Typography';
import { DemoHeader } from '../components/DemoHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { CowMilkAnalyticsChart } from '../components/charts/CowMilkAnalyticsChart';

export default function UniversalCowDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user, activeRole } = useAuth();
  const { colors, isDark } = useTheme();
  const { cows, farmers, booths, milkRecords } = useAavinStore();

  // Search by tagId or cowId or param
  const queryTag = (params.tagId as string) || (params.cowId as string) || (params.id as string);

  // Robust layer-by-layer back navigation handler
  const handleBack = useCallback(() => {
    const fromParam = (params.from as string) || '';
    if (fromParam === 'cattle' || fromParam === 'cattle-registry') {
      router.replace('/(veterinary)/cattle-registry' as any);
      return;
    }
    if (fromParam === 'home' || fromParam === 'index') {
      router.replace('/(veterinary)' as any);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // Safe role-based fallback
    if (activeRole === 'veterinary') {
      router.replace('/(veterinary)/cattle-registry' as any);
    } else if (activeRole === 'farmer') {
      router.replace('/(farmer)/cows' as any);
    } else if (activeRole === 'booth') {
      router.replace('/(booth)/farmers' as any);
    } else {
      router.back();
    }
  }, [params.from, router, activeRole]);

  // Hardware back button support for Android
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack]);

  // Find exact cow
  const cow = queryTag
    ? cows.find(
        (c) =>
          c.tagId === queryTag ||
          c.id.toLowerCase() === queryTag.toLowerCase() ||
          c.cowId.toLowerCase() === queryTag.toLowerCase()
      ) ||
      (queryTag.length >= 10
        ? cows.find((c) => c.tagId === queryTag || c.tagId.includes(queryTag))
        : undefined)
    : cows[0];

  // If a specific tag was scanned but is not registered in the database, or no cows exist
  if (!cow) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <DemoHeader
          title={queryTag ? `Tag #${queryTag}` : 'Cattle Registry'}
          subtitle="Aavin Cattle Registry Search"
          showBack
          onBack={handleBack}
        />
        <View style={styles.unregisteredContainer}>
          <Card style={styles.unregisteredCard}>
            <View style={styles.unregisteredIconCircle}>
              <Ionicons name="alert-circle" size={48} color="#F59E0B" />
            </View>

            <Text style={[Typography.title2, { color: colors.text, fontWeight: '900', marginTop: 16, textAlign: 'center' }]}>
              {queryTag ? 'Unregistered Cattle Tag' : 'No Cattle Records'}
            </Text>

            {queryTag && (
              <View style={styles.unregisteredTagPill}>
                <Text style={styles.unregisteredTagText}>#{queryTag}</Text>
              </View>
            )}

            <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 22 }]}>
              {queryTag
                ? `Tag UID #${queryTag} was read by the scanner, but is not currently registered to any farmer or herd in the Aavin District Database.`
                : 'No cattle records are currently available in the database.'}
            </Text>

            <View style={styles.unregisteredActions}>
              {queryTag && (
                <Button
                  title={`Register Tag #${queryTag}`}
                  variant="primary"
                  onPress={() => {
                    Alert.alert(
                      'Register Cattle Ear Tag',
                      `Would you like to register new ear tag #${queryTag} to an Aavin dairy farmer herd?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Open District Registry',
                          onPress: () => router.replace('/(veterinary)/cattle-registry' as any),
                        },
                      ]
                    );
                  }}
                  style={{ width: '100%', marginBottom: 10 }}
                />
              )}
              <Button
                title="Scan Another Tag"
                variant="outline"
                onPress={() => router.back()}
                style={{ width: '100%', marginBottom: 10 }}
              />
              <Button
                title="Browse Registered Herds"
                variant="secondary"
                onPress={() => router.replace('/(veterinary)/cattle-registry' as any)}
                style={{ width: '100%' }}
              />
            </View>
          </Card>
        </View>
      </View>
    );
  }

  const farmer = farmers.find((f) => f.id === cow.farmerId);
  const booth = booths.find((b) => b.id === farmer?.assignedBoothId);
  const allFarmerCows = cows.filter((c) => c.farmerId === cow.farmerId);

  // Active section tab
  const [activeTab, setActiveTab] = useState<'analytics' | 'farmer' | 'medical' | 'vaccines' | 'treatments'>('analytics');

  const hasWithdrawal = cow?.activeWithdrawal?.hasActiveWithdrawal;

  // Handle society quick milk record
  const handleRecordMilkForCow = () => {
    if (hasWithdrawal) {
      Alert.alert(
        '⛔ ACTIVE ANTIMICROBIAL WITHDRAWAL',
        `Milk from ${cow.name} (#${cow.tagId}) CANNOT be accepted! Animal is under ${cow.activeWithdrawal?.medicineName} therapy until ${cow.activeWithdrawal?.withdrawalEndDate}.`,
        [{ text: 'Acknowledge Rejection', style: 'destructive' }]
      );
      return;
    }
    router.push({
      pathname: '/(booth)/record-milk',
      params: { farmerId: cow.farmerId },
    } as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader
        title={cow.name}
        subtitle={`Digital Passport • Pashu Aadhaar #${cow.tagId}`}
        showBack
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ================================================================== */}
        {/* 1. COW PROFILE HERO CARD                                          */}
        {/* ================================================================== */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Image
              source={{
                uri: cow.photoUrl || 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=500',
              }}
              style={styles.heroImage}
            />

            <View style={styles.heroMeta}>
              <View style={styles.tagBadge}>
                <Ionicons name="pricetag" size={13} color="#0072BC" />
                <Text style={styles.tagText}>{cow.tagId}</Text>
              </View>

              <Text style={[Typography.title2, { color: colors.text, fontWeight: '900', marginTop: 4 }]}>
                {cow.name}
              </Text>

              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                {cow.breed}
              </Text>

              <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                Owner: {cow.farmerName} ({cow.farmerId})
              </Text>

              <View
                style={[
                  styles.verifBadge,
                  { backgroundColor: cow.verificationStatus === 'verified' ? '#DCFCE7' : '#FEF3C7' },
                ]}
              >
                <Ionicons
                  name={cow.verificationStatus === 'verified' ? 'checkmark-circle' : 'time'}
                  size={12}
                  color={cow.verificationStatus === 'verified' ? '#15803D' : '#B45309'}
                />
                <Text
                  style={[
                    styles.verifText,
                    { color: cow.verificationStatus === 'verified' ? '#15803D' : '#B45309' },
                  ]}
                >
                  {cow.verificationStatus === 'verified'
                    ? 'Aavin Verified Passport'
                    : 'Verification In Progress'}
                </Text>
              </View>
            </View>
          </View>

          {/* Active Medicine Withdrawal Alert Banner */}
          {hasWithdrawal ? (
            <View style={styles.withdrawalBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="warning" size={26} color="#DC2626" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[Typography.headline, { color: '#B91C1C', fontWeight: '900' }]}>
                    ⚠️ ACTIVE ANTIMICROBIAL WITHDRAWAL HOLD
                  </Text>
                  <Text style={[Typography.subhead, { color: '#7F1D1D', fontWeight: '700', marginTop: 2 }]}>
                    Drug: {cow.activeWithdrawal?.medicineName}
                  </Text>
                  <Text style={[Typography.caption1, { color: '#991B1B', marginTop: 2 }]}>
                    Clinical Reason: {cow.activeWithdrawal?.reason}
                  </Text>
                  <Text style={[Typography.caption1, { color: '#B91C1C', fontWeight: '800', marginTop: 4 }]}>
                    Withholding Ends: {cow.activeWithdrawal?.withdrawalEndDate} ({cow.activeWithdrawal?.daysRemaining} days remaining)
                  </Text>
                  <Text style={[Typography.caption2, { color: '#7F1D1D', marginTop: 4, fontStyle: 'italic' }]}>
                    MANDATORY REJECTION: Milk from this animal contains antibiotic residues. DO NOT accept into the society batch.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.clearanceBanner, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={[Typography.caption1, { color: '#047857', fontWeight: '800' }]}>
                  ZERO DRUG RESIDUE • CLEARED FOR MILK COLLECTION
                </Text>
                <Text style={[Typography.caption2, { color: '#065F46' }]}>
                  No active antibiotic or NSAID withholding. Safe for Aavin premium pasteurized supply.
                </Text>
              </View>
            </View>
          )}

          {/* Role-Specific Action Bar */}
          <View style={styles.actionRow}>
            {activeRole === 'booth' && (
              <Button
                title={hasWithdrawal ? '⛔ Milk Blocked by Vet' : 'Record Milk Intake'}
                variant={hasWithdrawal ? 'outline' : 'primary'}
                size="sm"
                onPress={handleRecordMilkForCow}
                style={{ flex: 1 }}
              />
            )}

            {activeRole === 'veterinary' && (
              <>
                <Button
                  title="Prescribe Rx"
                  size="sm"
                  onPress={() => router.push({
                    pathname: '/(veterinary)/treatment-entry',
                    params: {
                      cowId: cow.id,
                      tagId: cow.tagId,
                      from: 'cow-details',
                      returnFrom: params.from || 'cattle',
                    },
                  } as any)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Clinical Exam"
                  variant="secondary"
                  size="sm"
                  onPress={() => router.push({
                    pathname: '/(veterinary)/examination-entry',
                    params: {
                      cowId: cow.id,
                      tagId: cow.tagId,
                      from: 'cow-details',
                      returnFrom: params.from || 'cattle',
                    },
                  } as any)}
                  style={{ flex: 1 }}
                />
              </>
            )}

            {(activeRole === 'union' || activeRole === 'admin') && (
              <Button
                title="Audit Cattle Trail & Bio-Twin"
                variant="secondary"
                size="sm"
                onPress={() => Alert.alert('Audit Log', `Passport #${cow.cowId} verified with complete blockchain safety twin.`)}
                style={{ flex: 1 }}
              />
            )}
          </View>

          {/* Quick Stat Highlights */}
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Daily Yield</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{cow.dailyMilkYield.toFixed(1)} L</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Lactation</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{cow.lactationStage.toUpperCase()}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Age</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{cow.approxAgeMonths} Mo</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Health</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: cow.healthStatus === 'healthy' ? '#16A34A' : '#DC2626' },
                ]}
              >
                {cow.healthStatus === 'healthy' ? 'Optimal' : 'Hold'}
              </Text>
            </View>
          </View>
        </Card>

        {/* ================================================================== */}
        {/* 2. SUB-NAVIGATION TABS                                             */}
        {/* ================================================================== */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabsContainer}>
            {[
              { key: 'analytics', label: '📊 Milk Yield Charts', icon: 'bar-chart' },
              { key: 'farmer', label: '👨‍🌾 Farmer Details', icon: 'person' },
              { key: 'medical', label: `🩺 Clinical (${cow.medicalHistory.length})`, icon: 'medkit' },
              { key: 'vaccines', label: `💉 Vaccines (${cow.vaccinationHistory.length})`, icon: 'shield-checkmark' },
              { key: 'treatments', label: `💊 Treatments (${cow.treatmentRecords.length})`, icon: 'fitness' },
            ].map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                style={[
                  styles.tabBtn,
                  activeTab === tab.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={15}
                  color={activeTab === tab.key ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: activeTab === tab.key ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* ================================================================== */}
        {/* 3. ACTIVE TAB CONTENT                                              */}
        {/* ================================================================== */}

        {/* TAB 1: MILK PROCUREMENT ANALYTICS & 3-MODE BAR CHART */}
        {activeTab === 'analytics' && (
          <CowMilkAnalyticsChart
            cow={cow}
            farmer={farmer}
            allFarmerCows={allFarmerCows}
            milkRecords={milkRecords}
          />
        )}

        {/* TAB 2: FARMER INFO */}
        {activeTab === 'farmer' && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle" size={24} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>
                Cattle Owner & Dairy Farmer
              </Text>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailRow}>
                <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Full Name</Text>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  {farmer?.name || cow.farmerName}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Farmer Code</Text>
                <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                  {farmer?.farmerIdCode || cow.farmerId}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Contact Number</Text>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  +91 {farmer?.mobileNumber || '9842010001'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Village / Taluk</Text>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  {farmer?.village || 'Melur'}, {farmer?.community || 'Madurai Taluk'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Primary Society (DCS)</Text>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  {booth?.name || 'Melur Primary Milk Producers Co-op'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Herd Size</Text>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  {allFarmerCows.length} Registered Bovines
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Bank Disbursement</Text>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  {farmer?.bankName || 'State Bank of India'} (A/C: ••••{farmer?.bankAccountNumber?.slice(-4) || '1001'})
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[Typography.caption1, { color: colors.textSecondary }]}>KYC Status</Text>
                <Text style={[Typography.subhead, { color: '#16A34A', fontWeight: '800' }]}>
                  ✓ Aadhaar & Bank Verified
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* TAB 3: CLINICAL EXAMINATIONS */}
        {activeTab === 'medical' && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="fitness" size={24} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>
                Veterinary Clinical History
              </Text>
            </View>

            {cow.medicalHistory.length === 0 ? (
              <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 14 }]}>
                No abnormal clinical events recorded. General herd health optimal.
              </Text>
            ) : (
              cow.medicalHistory.map((med) => (
                <View key={med.id} style={[styles.timelineItem, { borderLeftColor: colors.primary }]}>
                  <View style={styles.timelineHeader}>
                    <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                      {med.diagnosis}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{med.date}</Text>
                  </View>
                  <Text style={[Typography.caption1, { color: colors.text, marginTop: 4 }]}>
                    Symptoms: {med.symptoms}
                  </Text>
                  <View style={styles.vitalsRow}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Temp: {med.bodyTemperatureC}°C • Heart: {med.heartRateBpm} bpm • Rumen: {med.rumenMotility}
                    </Text>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }]}>
                    Advice: {med.recommendations}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.primary, marginTop: 4, fontWeight: '700' }]}>
                    Attending Vet: {med.vetName}
                  </Text>
                </View>
              ))
            )}
          </Card>
        )}

        {/* TAB 4: VACCINATION LOG */}
        {activeTab === 'vaccines' && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#16A34A" style={{ marginRight: 8 }} />
              <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>
                Vaccination Records
              </Text>
            </View>

            {cow.vaccinationHistory.map((vac) => (
              <View key={vac.id} style={[styles.timelineItem, { borderLeftColor: '#16A34A' }]}>
                <View style={styles.timelineHeader}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    {vac.vaccineName}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{vac.date}</Text>
                </View>
                <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                  Batch: {vac.batchNumber} • Administered by: {vac.administeredBy}
                </Text>
                <View style={styles.nextDueBadge}>
                  <Text style={styles.nextDueText}>Next Booster Due: {vac.nextDueDate}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* TAB 5: TREATMENT & PRESCRIPTION HISTORY */}
        {activeTab === 'treatments' && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medkit" size={24} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>
                Medication & Antimicrobial Treatments
              </Text>
            </View>

            {cow.treatmentRecords.length === 0 ? (
              <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 14 }]}>
                No active or past drug therapies on record. Clean antimicrobial history.
              </Text>
            ) : (
              cow.treatmentRecords.map((trt) => (
                <View key={trt.id} style={[styles.timelineItem, { borderLeftColor: '#DC2626' }]}>
                  <View style={styles.timelineHeader}>
                    <Text style={[Typography.subhead, { color: '#DC2626', fontWeight: '800' }]}>
                      {trt.medicineName}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{trt.date}</Text>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Generic: {trt.genericName} • Dosage: {trt.dosage} ({trt.route})
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.text, marginTop: 2 }]}>
                    Condition: {trt.reason}
                  </Text>
                  <View style={styles.withdrawalPeriodPill}>
                    <Ionicons name="hourglass" size={12} color="#991B1B" style={{ marginRight: 4 }} />
                    <Text style={styles.withdrawalPeriodText}>
                      Mandatory Milk Withholding: {trt.withdrawalPeriodDays} Days (Ended {trt.withdrawalEndDate})
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Card>
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
    paddingBottom: 40,
  },
  heroCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  heroTop: {
    flexDirection: 'row',
  },
  heroImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  heroMeta: {
    flex: 1,
    marginLeft: 14,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 114, 188, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0072BC',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  verifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  verifText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  withdrawalBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  clearanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 14,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  tabsScroll: {
    marginVertical: 6,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    paddingBottom: 8,
  },
  timelineItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vitalsRow: {
    marginTop: 4,
  },
  nextDueBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  nextDueText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  withdrawalPeriodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  withdrawalPeriodText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '800',
  },
  unregisteredContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unregisteredCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  unregisteredIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unregisteredTagPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  unregisteredTagText: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  unregisteredActions: {
    width: '100%',
    marginTop: 24,
  },
});
