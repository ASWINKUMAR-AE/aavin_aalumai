import React from 'react';
import { StyleSheet, View, Text, ScrollView, FlatList } from 'react-native';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';

export default function FarmerPaymentsScreen() {
  const { user } = useAuth();
  const { milkRecords, farmers } = useAavinStore();
  const { colors } = useTheme();

  const farmerId = user?.associatedId || 'FARMER001';
  const farmer = farmers.find(f => f.id === farmerId) || farmers[0];
  const myRecords = milkRecords.filter(r => r.farmerId === farmerId);

  const totalLitres = myRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
  const baseRate = 38.5; // Rs / Litre
  const totalAmount = totalLitres * baseRate;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader
        title="Receipt"
        subtitle={`DBT Bank: ${farmer.bankName || 'Canara Bank'} • Direct Ledger`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Total Earned Card */}
        <Card style={styles.card}>
          <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
            ESTIMATED OCTOBER PROCUREMENT PAYOUT
          </Text>
          <Text style={[styles.bigAmount, { color: colors.text }]}>
            ₹{totalAmount.toFixed(2)}
          </Text>
          <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
            Total Supplied: {totalLitres.toFixed(2)} L @ ₹{baseRate.toFixed(2)} / Litre
          </Text>

          <View style={[styles.dbtBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Ionicons name="shield-checkmark" size={16} color="#16A34A" />
            <Text style={[Typography.caption2, { color: '#166534', fontWeight: '700', marginLeft: 6 }]}>
              DBT Account: {farmer.bankAccountNumber || '•••• 6501'} (IFSC: {farmer.bankIfsc || 'CNRB0001092'})
            </Text>
          </View>
        </Card>

        {/* Transaction Passbook */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
            Milk Supply Credit Ledger
          </Text>

          {myRecords.map((r) => {
            const amount = r.quantityLitres * baseRate;
            return (
              <View key={r.id} style={[styles.ledgerRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                    {r.collectionDate} • {r.session.toUpperCase()}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {r.quantityLitres.toFixed(2)} L supplied @ ₹{baseRate}/L
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[Typography.headline, { color: '#16A34A', fontWeight: '800' }]}>
                    +₹{amount.toFixed(2)}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                    {r.receiptId ? 'Verified' : 'Calculated'}
                  </Text>
                </View>
              </View>
            );
          })}
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
  card: {
    padding: 16,
  },
  bigAmount: {
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  dbtBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
