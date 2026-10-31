import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/aavin';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { Typography } from '../constants/Typography';
import { DemoHeader } from './DemoHeader';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { IndicTransLanguageSwitch } from './ui/IndicTransLanguageSwitch';
import { canScanCattleTag } from '../constants/CattlePermissions';
import { SmartCattleTagScannerModal } from './scanner/SmartCattleTagScannerModal';

interface RoleProfileScreenProps {
  roleTitle: string;
  roleSubtitle: string;
  staffName: string;
  staffId: string;
  facilityTitle: string;
  facilityValue: string;
  jurisdictionTitle?: string;
  jurisdictionValue?: string;
  roleIcon: string;
  stats?: Array<{ label: string; value: string }>;
}

export const RoleProfileScreen: React.FC<RoleProfileScreenProps> = ({
  roleTitle,
  roleSubtitle,
  staffName,
  staffId,
  facilityTitle,
  facilityValue,
  jurisdictionTitle,
  jurisdictionValue,
  roleIcon,
  stats,
}) => {
  const { user, logout, switchRole } = useAuth();
  const { colors, isDark } = useTheme();
  const { language, toggleLanguage, t } = useTranslation();
  const router = useRouter();
  const [scannerVisible, setScannerVisible] = useState(false);
  const isScannerAllowed = canScanCattleTag(user?.role);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleRoleSwitch = async (targetRole: UserRole) => {
    await switchRole(targetRole);
    switch (targetRole) {
      case 'farmer':
        router.replace('/(farmer)');
        break;
      case 'booth':
        router.replace('/(booth)');
        break;
      case 'bmc':
        router.replace('/(bmc)');
        break;
      case 'union':
        router.replace('/(union)');
        break;
      case 'veterinary':
        router.replace('/(veterinary)');
        break;
      case 'admin':
        router.replace('/(admin)');
        break;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={roleTitle}
        subtitle={roleSubtitle}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Staff Card */}
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#1E293B' : colors.primaryLight }]}>
              <Text style={{ fontSize: 32 }}>{roleIcon}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[Typography.title2, { color: colors.text, fontWeight: '900' }]}>
                {staffName || user?.fullName || 'Aavin Officer'}
              </Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '700' }]}>
                {staffId || user?.username || 'STAFF-AUTH-01'}
              </Text>
              <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7' }]}>
                <Ionicons name="shield-checkmark" size={13} color={isDark ? '#4ADE80' : '#15803D'} />
                <Text style={[styles.badgeText, { color: isDark ? '#4ADE80' : '#15803D' }]}>
                  Aavin Authorized Personnel
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.detailsList, { borderTopColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{facilityTitle}:</Text>
              <Text style={[styles.rowValue, { color: colors.text, fontWeight: '700' }]}>{facilityValue}</Text>
            </View>
            {jurisdictionTitle && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{jurisdictionTitle}:</Text>
                <Text style={[styles.rowValue, { color: colors.text, fontWeight: '600' }]}>{jurisdictionValue}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Security Access:</Text>
              <Text style={[styles.rowValue, { color: colors.primary, fontWeight: '700' }]}>Level 3 (Operational Twin)</Text>
            </View>
          </View>
        </Card>

        {/* Quick Cattle Tag Scanner for Authorized Personnel (Vet, Society, Union, Admin) */}
        {isScannerAllowed && (
          <Button
            title="📷 Scan Cattle Ear Tag (Dual-Mode)"
            variant="primary"
            onPress={() => setScannerVisible(true)}
            style={{ marginVertical: 2 }}
          />
        )}

        {/* Live Performance Stats */}
        {stats && stats.length > 0 && (
          <Card style={styles.card}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
              Operational Summary
            </Text>
            <View style={styles.statsGrid}>
              {stats.map((stat, idx) => (
                <View key={idx} style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : colors.background, borderColor: colors.border }]}>
                  <Text style={[Typography.title3, { color: colors.primary, fontWeight: '900', textAlign: 'center' }]} numberOfLines={1}>{stat.value}</Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* AI4Bharat IndicTrans2 Language Switcher */}
        <IndicTransLanguageSwitch variant="expanded" />

        {/* Quick Demo Role Switcher */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 4 }]}>
            Quick Role Switcher
          </Text>
          <Text style={[Typography.footnote, { color: colors.textSecondary, marginBottom: 12 }]}>
            Instant one-tap switch to test role-specific workflows & navigation:
          </Text>

          <View style={styles.roleChips}>
            {[
              { role: 'farmer' as UserRole, label: 'Farmer', icon: '👨‍🌾' },
              { role: 'booth' as UserRole, label: 'Society Staff', icon: '🏪' },
              { role: 'bmc' as UserRole, label: 'BMC Center', icon: '🏭' },
              { role: 'union' as UserRole, label: 'Union Exec', icon: '🏛️' },
              { role: 'veterinary' as UserRole, label: 'Veterinarian', icon: '🩺' },
              { role: 'admin' as UserRole, label: 'SysAdmin', icon: '⚙️' },
            ].map(item => (
              <Pressable
                key={item.role}
                style={[
                  styles.roleChip,
                  { backgroundColor: user?.role === item.role ? colors.primary : colors.card, borderColor: colors.border },
                ]}
                onPress={() => handleRoleSwitch(item.role)}
              >
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                <Text
                  style={[
                    Typography.caption1,
                    { color: user?.role === item.role ? '#FFFFFF' : colors.text, fontWeight: '700', marginLeft: 4 },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Sign Out Button */}
        <Button
          title={t('common.logout', 'Sign Out')}
          variant="destructive"
          onPress={handleLogout}
          style={{ marginTop: 8, marginBottom: 20 }}
        />
      </ScrollView>

      {/* Smart Cattle Tag Scanner Modal */}
      {isScannerAllowed && (
        <SmartCattleTagScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScan={(tagId) => {
            setScannerVisible(false);
            router.push({
              pathname: '/cow-details',
              params: { tagId },
            } as any);
          }}
          userRoleLabel={roleTitle}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsList: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 5,
    gap: 12,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '44%',
    lineHeight: 18,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minHeight: 76,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexBasis: '31%',
    flexGrow: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});
