import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, TextInput } from 'react-native';
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

export default function AdminDemoSettingsScreen() {
  const { union, updateUnionThresholds, resetDemoData } = useAavinStore();
  const { logout } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [thresholdLitres, setThresholdLitres] = useState(union.mismatchThresholdLitres.toString());
  const [thresholdPercent, setThresholdPercent] = useState(union.mismatchThresholdPercent.toString());
  const [resetting, setResetting] = useState(false);

  const handleSaveThresholds = () => {
    const l = parseFloat(thresholdLitres);
    const p = parseFloat(thresholdPercent);
    if (isNaN(l) || isNaN(p) || l < 0 || p < 0) {
      Alert.alert('Invalid Threshold', 'Please enter positive numeric threshold values.');
      return;
    }
    updateUnionThresholds(l, p);
    Alert.alert('Thresholds Updated', `Tolerance set to ±${l} Litres and ${p}%. Discrepancies exceeding this will trigger audit alerts.`);
  };

  const handleResetData = () => {
    Alert.alert(
      '⚠️ Reset Demo Dataset?',
      'This will wipe all client-side changes and restore the pristine initial seed dataset (Farmers, Cows, Society Receipts, BMC Deliveries, and Discrepancies).\n\nDo you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Demo Data',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await resetDemoData();
              Alert.alert(
                'Demo Data Restored',
                'All simulated transactions, passports, and receipts have been reset to default academic seed values.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/(admin)'),
                  },
                ]
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not reset data.');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Demo Settings & Simulation"
        subtitle="Prototype Configuration & Data Store Reset"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Prototype Architecture Box */}
        <Card style={styles.card}>
          <View style={styles.architectureHeader}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              Frontend-Only Prototype Mode
            </Text>
          </View>
          <Text style={[Typography.caption1, { color: colors.textSecondary, lineHeight: 20 }]}>
            This application is an academic prototype of the Aavin Madurai milk collection workflow. All data, status transitions, notifications, receipts, and reconciliation calculations execute locally on device via shared React state and AsyncStorage.
          </Text>

          <View style={[styles.statusBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={[Typography.caption2, { color: '#166534', fontWeight: '700', marginLeft: 6 }]}>
              Local Client Persistence: ACTIVE
            </Text>
          </View>
        </Card>

        {/* Discrepancy Tolerance Thresholds */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 6 }]}>
            Transit Discrepancy Thresholds
          </Text>
          <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 14 }]}>
            Threshold tolerance for differences between Society declared dispatch and BMC flow meter intake.
          </Text>

          <TextField
            label="Maximum Allowed Volume Shortfall (Litres)"
            placeholder="e.g. 5.0"
            value={thresholdLitres}
            onChangeText={setThresholdLitres}
            keyboardType="decimal-pad"
            icon="water-outline"
          />

          <TextField
            label="Maximum Percentage Variance (%)"
            placeholder="e.g. 0.5"
            value={thresholdPercent}
            onChangeText={setThresholdPercent}
            keyboardType="decimal-pad"
            icon="pie-chart-outline"
          />

          <Button
            title="Save Tolerance Configuration"
            onPress={handleSaveThresholds}
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Reset Demo Data Action Card */}
        <Card style={[styles.card, { borderColor: '#EF4444', borderWidth: 1.5 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="refresh-circle" size={24} color="#DC2626" />
            <Text style={[Typography.headline, { color: '#B91C1C', fontWeight: '800', marginLeft: 8 }]}>
              Reset Demo Dataset
            </Text>
          </View>
          <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 14, lineHeight: 18 }]}>
            Restore all pre-seeded records (e.g. Cow Lakshmi's active withdrawal hold, matching delivery DEL-001, mismatch delivery DEL-002, and Case #DISC-101).
          </Text>

          <Button
            title={resetting ? "Resetting Data..." : "Reset Demo Data to Initial Seeds"}
            variant="destructive"
            loading={resetting}
            onPress={handleResetData}
          />
        </Card>

        <Button
          title="Sign Out of Admin"
          variant="outline"
          onPress={async () => {
            await logout();
            router.replace('/(auth)/login');
          }}
          style={{ marginBottom: 30 }}
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
  architectureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
});
