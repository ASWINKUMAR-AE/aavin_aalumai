import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';

export default function AdminVerificationsScreen() {
  const { farmers, cows, verifyFarmer, verifyCow } = useAavinStore();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<'farmers' | 'cows'>('farmers');

  const pendingFarmers = farmers.filter(f => f.verificationStatus === 'pending');
  const verifiedFarmers = farmers.filter(f => f.verificationStatus === 'verified');

  const pendingCows = cows.filter(c => c.verificationStatus === 'pending');
  const verifiedCows = cows.filter(c => c.verificationStatus === 'verified');

  const handleVerifyFarmer = (farmerId: string, name: string) => {
    verifyFarmer(farmerId, 'verified');
    Alert.alert('Verified', `Farmer ${name} has been verified and granted official Aavin member credentials.`);
  };

  const handleUnverifyFarmer = (farmerId: string, name: string) => {
    verifyFarmer(farmerId, 'pending');
    Alert.alert('Status Updated', `Farmer ${name} flagged as pending verification.`);
  };

  const handleVerifyCow = (cowId: string, name: string, tag: string) => {
    verifyCow(cowId, 'verified');
    Alert.alert('Passport Authenticated', `Cow ${name} (Tag #${tag}) verified and officially minted into Aavin Milk Safety Twin ledger.`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Verification Queue"
        subtitle="Identity & Cattle Passport KYC Management"
        showBack
      />

      {/* Tabs Switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab('farmers')}
          style={[
            styles.tabBtn,
            activeTab === 'farmers' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
          ]}
        >
          <Text style={[styles.tabLabel, { color: activeTab === 'farmers' ? colors.primary : colors.textSecondary }]}>
            Farmers ({pendingFarmers.length} Pending)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('cows')}
          style={[
            styles.tabBtn,
            activeTab === 'cows' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
          ]}
        >
          <Text style={[styles.tabLabel, { color: activeTab === 'cows' ? colors.primary : colors.textSecondary }]}>
            Cattle Tags ({pendingCows.length} Pending)
          </Text>
        </Pressable>
      </View>

      {/* FARMERS LIST */}
      {activeTab === 'farmers' && (
        <FlatList
          data={[...pendingFarmers, ...verifiedFarmers]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isPending = item.verificationStatus === 'pending';
            return (
              <Card style={[styles.card, isPending && { borderColor: '#F59E0B', borderWidth: 1.5 }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                      {item.name}
                    </Text>
                    <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                      {item.farmerIdCode} • +91 {item.mobileNumber}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      {item.address}, {item.village} • {item.numberOfCows} Declared Cows
                    </Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: isPending ? '#FEF3C7' : '#DCFCE7' }]}>
                    <Text style={[styles.badgeText, { color: isPending ? '#B45309' : '#15803D' }]}>
                      {item.verificationStatus.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                  {isPending ? (
                    <Button
                      title="✓ Approve & Verify Identity"
                      size="sm"
                      onPress={() => handleVerifyFarmer(item.id, item.name)}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <Button
                      title="Revoke Verification"
                      variant="outline"
                      size="sm"
                      onPress={() => handleUnverifyFarmer(item.id, item.name)}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* COWS LIST */}
      {activeTab === 'cows' && (
        <FlatList
          data={[...pendingCows, ...verifiedCows]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isPending = item.verificationStatus === 'pending';
            return (
              <Card style={[styles.card, isPending && { borderColor: '#F59E0B', borderWidth: 1.5 }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                      {item.name} ({item.breed})
                    </Text>
                    <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                      12-Digit Tag: #{item.tagId}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Owner: {item.farmerName} • Daily Yield: {item.dailyMilkYield} L
                    </Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: isPending ? '#FEF3C7' : '#DCFCE7' }]}>
                    <Text style={[styles.badgeText, { color: isPending ? '#B45309' : '#15803D' }]}>
                      {item.verificationStatus.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {isPending && (
                  <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                    <Button
                      title="✓ Authenticate Cattle Passport"
                      size="sm"
                      onPress={() => handleVerifyCow(item.id, item.name, item.tagId)}
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
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
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
