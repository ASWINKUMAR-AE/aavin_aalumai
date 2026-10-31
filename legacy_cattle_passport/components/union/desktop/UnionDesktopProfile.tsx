import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../../store/AavinStoreContext';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../context/LanguageContext';
import { Typography } from '../../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { IndicTransLanguageSwitch } from '../../../components/ui/IndicTransLanguageSwitch';
import { UserRole } from '../../../types/aavin';

export const UnionDesktopProfile: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const { bmcs, booths, discrepancyCases } = useAavinStore();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

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
    <ScrollView style={[styles.canvas, { backgroundColor: colors.background }]} contentContainerStyle={styles.canvasContainer}>
      <View style={styles.contentConstrained}>

        {/* =========================================================================
            HEADER & BREADCRUMB
           ========================================================================= */}
        <View style={[styles.headerStrip, { borderBottomColor: colors.border }]}>
          <View>
            <View style={styles.breadcrumbRow}>
              <Text style={[styles.breadcrumbRoot, { color: colors.textSecondary }]}>Union Executive</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} />
              <Text style={[styles.breadcrumbActive, { color: colors.primary }]}>Official Credentials & Controls</Text>
            </View>
            <Text style={[styles.mainTitle, { color: colors.text }]}>
              Union Executive Officer Profile
            </Text>
            <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
              District administrative authority • Session parameters and translation preferences
            </Text>
          </View>
        </View>

        {/* =========================================================================
            COMPACT 2-COLUMN SPLIT (Details on Left, Languages & Controls on Right)
           ========================================================================= */}
        <View style={styles.splitColumnsRow}>

          {/* LEFT COLUMN (55%): Officer Identity & Operational Reach */}
          <View style={styles.leftCol}>
            <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Avatar + Main Info */}
              <View style={styles.avatarRow}>
                <View style={[styles.avatarCircle, { backgroundColor: isDark ? 'rgba(0, 114, 188, 0.2)' : '#E0F2FE' }]}>
                  <Text style={{ fontSize: 32 }}>🏛️</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.staffName, { color: colors.text }]}>
                    {user?.fullName || 'P. Jayaram'}
                  </Text>
                  <Text style={[styles.staffRole, { color: colors.primary }]}>
                    General Manager & District Executive Lead
                  </Text>
                  <View style={[styles.authBadge, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7' }]}>
                    <Ionicons name="shield-checkmark" size={13} color={isDark ? '#4ADE80' : '#15803D'} />
                    <Text style={[styles.authBadgeText, { color: isDark ? '#4ADE80' : '#15803D' }]}>
                      Level 3 Authorized Executive
                    </Text>
                  </View>
                </View>
              </View>

              {/* Specifications List */}
              <View style={[styles.specsList, { borderTopColor: colors.border }]}>
                <View style={styles.specRow}>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Staff ID:</Text>
                  <Text style={[styles.specVal, { color: colors.text }]}>{user?.associatedId || 'UNION_EXECUTIVE_01'}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Headquarters:</Text>
                  <Text style={[styles.specVal, { color: colors.text }]}>Madurai District Co-operative Milk Union</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Operational Reach:</Text>
                  <Text style={[styles.specVal, { color: colors.text, fontWeight: '600' }]}>14 Taluks • 6 Chilling Centers</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Security Access:</Text>
                  <Text style={[styles.specVal, { color: colors.primary, fontWeight: '700' }]}>Root Operational Twin Clearance</Text>
                </View>
              </View>

              {/* Operational Summary 3-Box Row */}
              <View style={styles.statsSummaryRow}>
                <View style={[styles.summaryTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                  <Text style={[styles.summaryNum, { color: colors.primary }]}>{bmcs.length} Units</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Active BMCs</Text>
                </View>
                <View style={[styles.summaryTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                  <Text style={[styles.summaryNum, { color: colors.primary }]}>{booths.length} Societies</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Active DCS</Text>
                </View>
                <View style={[styles.summaryTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                  <Text style={[styles.summaryNum, { color: (discrepancyCases || []).length > 0 ? '#DC2626' : '#16A34A' }]}>
                    {(discrepancyCases || []).length} Alerts
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Audit Pipeline</Text>
                </View>
              </View>
            </View>
          </View>

          {/* RIGHT COLUMN (45%): Localization, Quick Role Switcher & Session Controls */}
          <View style={styles.rightCol}>
            {/* AI4Bharat Language Switcher */}
            <View style={[styles.controlBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.boxTitle, { color: colors.text }]}>Platform Localization</Text>
              <Text style={[styles.boxSub, { color: colors.textSecondary }]}>
                AI4Bharat IndicTrans2 automated neural dairy translation
              </Text>
              <View style={{ marginTop: 10 }}>
                <IndicTransLanguageSwitch variant="expanded" />
              </View>
            </View>

            {/* Quick Role Switcher */}
            <View style={[styles.controlBox, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
              <Text style={[styles.boxTitle, { color: colors.text }]}>Quick Role Switcher</Text>
              <Text style={[styles.boxSub, { color: colors.textSecondary }]}>
                One-tap switch to inspect role-specific twin views
              </Text>

              <View style={styles.rolesGrid}>
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
                      { backgroundColor: user?.role === item.role ? colors.primary : isDark ? '#1E293B' : colors.background, borderColor: colors.border }
                    ]}
                    onPress={() => handleRoleSwitch(item.role)}
                  >
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                    <Text
                      style={[
                        styles.roleChipText,
                        { color: user?.role === item.role ? '#FFFFFF' : colors.text },
                        user?.role === item.role && { fontWeight: '800' }
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Sign Out Button */}
            <Pressable
              style={styles.signOutBtn}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={16} color="#DC2626" />
              <Text style={styles.signOutBtnText}>Sign Out of Executive Account</Text>
            </Pressable>
          </View>

        </View>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
  canvasContainer: {
    paddingTop: 24,
    paddingBottom: 110,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  contentConstrained: {
    width: '100%',
    maxWidth: 1080,
    gap: 16,
  },

  /* Header */
  headerStrip: {
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  breadcrumbRoot: {
    fontSize: 12,
    fontWeight: '600',
  },
  breadcrumbActive: {
    fontSize: 12,
    fontWeight: '700',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 12,
    marginTop: 2,
  },

  /* 2-Column Split */
  splitColumnsRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  leftCol: {
    flex: 5.5,
  },
  rightCol: {
    flex: 4.5,
  },

  /* Profile Card */
  profileCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffName: {
    fontSize: 18,
    fontWeight: '900',
  },
  staffRole: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 1,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  authBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  specsList: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    gap: 12,
  },
  specLabel: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '44%',
    lineHeight: 18,
  },
  specVal: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  summaryTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
  },
  summaryNum: {
    fontSize: 15,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 10.5,
    marginTop: 2,
  },

  /* Right Column Controls */
  controlBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  boxTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  boxSub: {
    fontSize: 11,
    marginTop: 1,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: '31%',
    flexGrow: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
    cursor: 'pointer' as any,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
});
