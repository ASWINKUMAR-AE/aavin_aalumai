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
import { TextField } from '../../components/ui/TextField';
import { Ionicons } from '@expo/vector-icons';

export default function MilkEntryScreen() {
  const { user } = useAuth();
  const { cows, recordMilk, milkRecords } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const farmerId = user?.associatedId || 'FARMER001';
  const myCows = cows.filter(c => c.farmerId === farmerId);

  const [selectedCowId, setSelectedCowId] = useState(myCows[0]?.id || 'COW001');
  const [session, setSession] = useState<'morning' | 'evening'>('morning');
  const [quantity, setQuantity] = useState('8.5');
  const [notes, setNotes] = useState('Clean milking, filtered through SS sieve');
  const [submitting, setSubmitting] = useState(false);

  const selectedCow = myCows.find(c => c.id === selectedCowId) || myCows[0];
  const hasWithdrawal = selectedCow?.activeWithdrawal?.hasActiveWithdrawal;

  const handleSubmit = () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid volume in litres.');
      return;
    }

    if (hasWithdrawal) {
      Alert.alert(
        '⚠️ ACTIVE WITHDRAWAL HOLD!',
        `This cow (${selectedCow.name}) has an active withdrawal restriction until ${selectedCow.activeWithdrawal?.withdrawalEndDate}. This milk must NOT be delivered to the Aavin collection society! Discard or segregate for calves.`,
        [
          { text: 'Acknowledge', style: 'destructive' }
        ]
      );
      return;
    }

    setSubmitting(true);
    try {
      recordMilk({
        farmerId,
        farmerName: user?.fullName || 'K. Murugesan',
        boothId: 'BOOTH001',
        collectionDate: '2026-10-12',
        session,
        quantityLitres: qty,
        route: 'direct',
        measurementMethod: 'farmer_wise',
        individualAllocation: 'measured',
        createdBy: user?.fullName || 'Farmer',
        notes: notes.trim(),
      });

      Alert.alert(
        'Milking Logged!',
        `Logged ${qty.toFixed(2)} L for ${selectedCow.name}. Updated on your dashboard and society records.`,
        [
          {
            text: 'View History',
            onPress: () => router.push('/(farmer)/milk-history' as any),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Error recording milking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="On-Farm Milking Log"
        subtitle="Record morning/evening cow yields"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cow Selector */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 10 }]}>
            Select Cow
          </Text>

          <View style={styles.cowsGrid}>
            {myCows.map((c) => {
              const isSelected = selectedCowId === c.id;
              const isHold = c.activeWithdrawal?.hasActiveWithdrawal;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedCowId(c.id)}
                  style={[
                    styles.cowCard,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primaryLight : colors.card,
                    },
                    isHold && { borderColor: '#DC2626' }
                  ]}
                >
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    {c.name}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    Tag #{c.tagId}
                  </Text>
                  {isHold && (
                    <View style={styles.holdTag}>
                      <Text style={styles.holdTagText}>⚠️ WITHDRAWAL</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {hasWithdrawal && (
            <View style={styles.withdrawalAlert}>
              <Ionicons name="warning" size={20} color="#DC2626" />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={[Typography.caption1, { color: '#B91C1C', fontWeight: '800' }]}>
                  WARNING: Medicine Withdrawal Active
                </Text>
                <Text style={[Typography.caption2, { color: '#991B1B' }]}>
                  {selectedCow.activeWithdrawal?.medicineName} (Ends: {selectedCow.activeWithdrawal?.withdrawalEndDate}). Do not deliver this milk.
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Milking Details */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 12 }]}>
            Milking Session & Yield
          </Text>

          <View style={styles.sessionToggle}>
            <Pressable
              onPress={() => setSession('morning')}
              style={[
                styles.sessionTab,
                session === 'morning' && { backgroundColor: '#FEF3C7', borderColor: '#D97706' },
              ]}
            >
              <Ionicons name="sunny" size={16} color={session === 'morning' ? '#D97706' : colors.textSecondary} />
              <Text style={[styles.sessionTabText, { color: session === 'morning' ? '#92400E' : colors.textSecondary }]}>
                MORNING
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSession('evening')}
              style={[
                styles.sessionTab,
                session === 'evening' && { backgroundColor: '#E0E7FF', borderColor: '#4F46E5' },
              ]}
            >
              <Ionicons name="moon" size={16} color={session === 'evening' ? '#4F46E5' : colors.textSecondary} />
              <Text style={[styles.sessionTabText, { color: session === 'evening' ? '#3730A3' : colors.textSecondary }]}>
                EVENING
              </Text>
            </Pressable>
          </View>

          <TextField
            label="Quantity (Litres) *"
            placeholder="e.g. 8.5"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            icon="water-outline"
          />

          <TextField
            label="Feed & Milking Observation"
            value={notes}
            onChangeText={setNotes}
            icon="create-outline"
          />
        </Card>

        <Button
          title={submitting ? "Logging..." : "Log Milk Entry"}
          size="lg"
          loading={submitting}
          onPress={handleSubmit}
          style={{ marginTop: 8 }}
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
  card: {
    padding: 16,
  },
  cowsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  cowCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  holdTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  holdTagText: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '800',
  },
  withdrawalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  sessionToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  sessionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  sessionTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
