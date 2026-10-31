import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';

export default function FarmerMilkHistoryScreen() {
  const { user } = useAuth();
  const { milkRecords, booths } = useAavinStore();
  const { colors } = useTheme();

  const farmerId = user?.associatedId || 'FARMER001';
  const allFarmerRecords = milkRecords.filter(r => r.farmerId === farmerId);

  const [filterPeriod, setFilterPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = allFarmerRecords.filter(r => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDate = r.collectionDate.includes(q);
      const matchQty = r.quantityLitres.toString().includes(q);
      const matchSession = r.session.toLowerCase().includes(q);
      if (!matchDate && !matchQty && !matchSession) return false;
    }
    if (filterPeriod === 'daily') {
      return r.collectionDate === '2026-10-12';
    }
    if (filterPeriod === 'weekly') {
      return r.collectionDate >= '2026-10-06';
    }
    if (filterPeriod === 'monthly') {
      return r.collectionDate.startsWith('2026-10');
    }
    return true;
  });

  const totalLitres = filteredRecords.reduce((sum, r) => sum + r.quantityLitres, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Milk Supply History"
        subtitle="Complete ledger of deliveries & receipt status"
        showBack
      />

      {/* Filter and Search Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search by date (YYYY-MM-DD) or session..."
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

        {/* Period Segment Tabs */}
        <View style={styles.segmentRow}>
          {(['all', 'daily', 'weekly', 'monthly'] as const).map(p => (
            <Pressable
              key={p}
              onPress={() => setFilterPeriod(p)}
              style={[
                styles.segmentTab,
                filterPeriod === p && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.segmentLabel, { color: filterPeriod === p ? '#FFFFFF' : colors.textSecondary }]}>
                {p.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Summary Pill */}
        <View style={[styles.summaryPill, { backgroundColor: colors.primaryLight }]}>
          <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
            Total: {totalLitres.toFixed(2)} Litres ({filteredRecords.length} Records)
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No record available"
            message={`No milk records found for the selected ${filterPeriod} period.`}
            icon="water-outline"
          />
        }
        renderItem={({ item }) => {
          const booth = booths.find(b => b.id === item.boothId);
          return (
            <Card style={styles.recordCard}>
              <View style={styles.cardHeader}>
                <View style={styles.dateRow}>
                  <View style={[styles.sessionBadge, { backgroundColor: item.session === 'morning' ? '#FEF3C7' : '#E0E7FF' }]}>
                    <Ionicons 
                      name={item.session === 'morning' ? 'sunny' : 'moon'} 
                      size={14} 
                      color={item.session === 'morning' ? '#D97706' : '#4F46E5'} 
                    />
                    <Text style={[styles.sessionText, { color: item.session === 'morning' ? '#92400E' : '#3730A3' }]}>
                      {item.session.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
                    {item.collectionDate}
                  </Text>
                </View>

                <View style={styles.qtyBox}>
                  <Text style={[styles.qtyText, { color: colors.primary }]}>
                    {item.quantityLitres.toFixed(2)} L
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Collection Society:</Text>
                  <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600' }]}>
                    {booth?.name || item.boothId}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Delivery Route:</Text>
                  <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600' }]}>
                    {item.route === 'direct' ? 'Direct Farmer Delivery' : `Vendor (${item.vendorName || 'Logistics'})`}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Digital Receipt Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: item.receiptId ? '#DCFCE7' : '#FEF3C7' }]}>
                    <Text style={[styles.statusText, { color: item.receiptId ? '#15803D' : '#B45309' }]}>
                      {item.receiptId ? `Included in Receipt #${item.receiptId}` : 'Awaiting Society Receipt Closure'}
                    </Text>
                  </View>
                </View>

                {item.notes && (
                  <View style={[styles.notesBox, { backgroundColor: colors.background }]}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                      Note: {item.notes}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  summaryPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  recordCard: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  sessionText: {
    fontSize: 10,
    fontWeight: '800',
  },
  qtyBox: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '900',
  },
  cardDetails: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notesBox: {
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
});
