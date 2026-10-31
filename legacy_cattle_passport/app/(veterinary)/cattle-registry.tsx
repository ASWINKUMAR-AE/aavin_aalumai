import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, TextInput, BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { SmartCattleTagScannerModal } from '../../components/scanner/SmartCattleTagScannerModal';

export default function CattleRegistryScreen() {
  const params = useLocalSearchParams();
  const { cows } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'under_treatment' | 'healthy'>('all');
  const [scannerVisible, setScannerVisible] = useState(false);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(veterinary)' as any);
    }
  }, [router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack]);

  const filteredCows = cows.filter(c => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchTag = c.tagId.includes(q);
      const matchFarmer = c.farmerName.toLowerCase().includes(q);
      const matchBreed = c.breed.toLowerCase().includes(q);
      if (!matchName && !matchTag && !matchFarmer && !matchBreed) return false;
    }
    if (filter === 'under_treatment') return c.healthStatus === 'under_treatment' || c.activeWithdrawal?.hasActiveWithdrawal;
    if (filter === 'healthy') return c.healthStatus === 'healthy';
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="District Cattle Registry"
        subtitle={`${cows.length} Bovines in Veterinary Surveillance Grid`}
        showBack
        onBack={handleBack}
      />

      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search by Tag ID, Name, Farmer, Breed..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          <Pressable
            onPress={() => setScannerVisible(true)}
            style={{ padding: 4 }}
            accessibilityLabel="Scan Ear Tag"
          >
            <Ionicons name="scan" size={18} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.chipsRow}>
          {(['all', 'under_treatment', 'healthy'] as const).map(f => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.chip,
                {
                  backgroundColor: filter === f ? colors.primary : colors.background,
                  borderColor: filter === f ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: filter === f ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {f === 'all' ? 'All Herds' : f === 'under_treatment' ? '⚠️ Under Treatment / Hold' : 'Healthy Only'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredCows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Cattle Found"
            message="No registered cows match your criteria."
            icon="paw-outline"
          />
        }
        renderItem={({ item }) => {
          const hasWithdrawal = item.activeWithdrawal?.hasActiveWithdrawal;
          return (
            <Pressable onPress={() => router.push({
              pathname: '/(veterinary)/cow-details',
              params: { cowId: item.id, tagId: item.tagId, from: 'cattle' },
            } as any)}>
              <Card style={[styles.card, hasWithdrawal && { borderColor: '#EF4444', borderWidth: 1.5 }]}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                      {item.name}
                    </Text>
                    <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                      Tag #{item.tagId} • {item.breed}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Owner: {item.farmerName} ({item.farmerId})
                    </Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: item.healthStatus === 'healthy' ? '#DCFCE7' : '#FEE2E2' }]}>
                    <Text style={[styles.badgeText, { color: item.healthStatus === 'healthy' ? '#15803D' : '#DC2626' }]}>
                      {item.healthStatus.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {hasWithdrawal && (
                  <View style={styles.withdrawalBox}>
                    <Ionicons name="warning" size={16} color="#DC2626" />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={[Typography.caption1, { color: '#B91C1C', fontWeight: '800' }]}>
                        WITHDRAWAL ACTIVE: {item.activeWithdrawal?.medicineName}
                      </Text>
                      <Text style={[Typography.caption2, { color: '#991B1B' }]}>
                        Ends: {item.activeWithdrawal?.withdrawalEndDate} ({item.activeWithdrawal?.daysRemaining} days left)
                      </Text>
                    </View>
                  </View>
                )}

                <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    History: {item.medicalHistory.length} Exams • {item.treatmentRecords.length} Treatments • {item.vaccinationHistory.length} Vaccines
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
                    Open Passport →
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />

      <SmartCattleTagScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(tagId) => {
          setScannerVisible(false);
          router.push({
            pathname: '/(veterinary)/cow-details',
            params: { tagId, from: 'cattle' },
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
  filterBar: {
    padding: 14,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  withdrawalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
