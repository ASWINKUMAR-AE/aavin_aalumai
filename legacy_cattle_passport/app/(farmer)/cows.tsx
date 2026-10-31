import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';

export default function FarmerCowsScreen() {
  const { user } = useAuth();
  const { cows } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const farmerId = user?.associatedId || 'FARMER001';
  const myCows = cows.filter(c => c.farmerId === farmerId);

  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<'all' | 'healthy' | 'under_treatment'>('all');

  const filteredCows = myCows.filter(c => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchTag = c.tagId.includes(q);
      const matchBreed = c.breed.toLowerCase().includes(q);
      if (!matchName && !matchTag && !matchBreed) return false;
    }
    if (healthFilter === 'healthy') return c.healthStatus === 'healthy';
    if (healthFilter === 'under_treatment') return c.healthStatus === 'under_treatment' || c.activeWithdrawal?.hasActiveWithdrawal;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Smart Cattle Passport"
        subtitle={`${myCows.length} Cows Registered in Aavin Dairy Twin`}
        showBack
      />

      {/* Top Search & Filter */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.topActionRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <TextInput
              placeholder="Search by Cow Name, 12-digit Tag ID, Breed..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Health Filter Chips */}
        <View style={styles.chipsRow}>
          {(['all', 'healthy', 'under_treatment'] as const).map(f => (
            <Pressable
              key={f}
              onPress={() => setHealthFilter(f)}
              style={[
                styles.chip,
                {
                  backgroundColor: healthFilter === f ? colors.primary : colors.background,
                  borderColor: healthFilter === f ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: healthFilter === f ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {f === 'all' ? 'All Cows' : f === 'healthy' ? 'Healthy Only' : 'Under Treatment / Warning'}
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
            title="No Cows Found"
            message="No registered cattle match your search criteria."
            icon="paw-outline"
          />
        }
        renderItem={({ item }) => {
          const hasWithdrawal = item.activeWithdrawal?.hasActiveWithdrawal;
          return (
            <Pressable 
              onPress={() => router.push(`/(farmer)/cow-details?cowId=${item.id}` as any)}
            >
              <Card style={[styles.cowCard, hasWithdrawal && { borderColor: '#EF4444', borderWidth: 1.5 }]}>
                <View style={styles.cardHeader}>
                  <Image
                    source={{ uri: item.photoUrl || 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=200' }}
                    style={styles.cowThumb}
                  />

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.nameRow}>
                      <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                        {item.name}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: item.verificationStatus === 'verified' ? '#DCFCE7' : '#FEF3C7' }]}>
                        <Text style={[styles.statusBadgeText, { color: item.verificationStatus === 'verified' ? '#15803D' : '#B45309' }]}>
                          {item.verificationStatus.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* 12-Digit Tag Badge */}
                    <View style={styles.tagBadge}>
                      <Ionicons name="pricetag" size={12} color="#0072BC" />
                      <Text style={styles.tagText}>Tag: {item.tagId}</Text>
                    </View>

                    <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 4 }]}>
                      {item.breed} • {item.sex === 'female' ? 'Cow' : 'Bull'} • {item.approxAgeMonths} Months
                    </Text>
                  </View>
                </View>

                {/* Active Withdrawal Warning Alert on Card */}
                {hasWithdrawal && (
                  <View style={styles.withdrawalCardAlert}>
                    <Ionicons name="warning" size={16} color="#DC2626" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[Typography.caption1, { color: '#B91C1C', fontWeight: '800' }]}>
                        ACTIVE MEDICINE WITHDRAWAL
                      </Text>
                      <Text style={[Typography.caption2, { color: '#991B1B' }]}>
                        {item.activeWithdrawal?.medicineName} (Ends: {item.activeWithdrawal?.withdrawalEndDate})
                      </Text>
                    </View>
                  </View>
                )}

                {/* Metrics Row */}
                <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
                  <View style={styles.metricItem}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Daily Yield</Text>
                    <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                      {item.dailyMilkYield.toFixed(1)} L/day
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Lactation</Text>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                      {item.lactationStage.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Health Status</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <View style={[styles.healthDot, { backgroundColor: item.healthStatus === 'healthy' ? '#16A34A' : '#DC2626' }]} />
                      <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700', marginLeft: 4 }]}>
                        {item.healthStatus.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
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
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
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
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  cowCard: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cowThumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF5FC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0072BC',
  },
  withdrawalCardAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metricItem: {
    alignItems: 'flex-start',
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
